"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { track } from "@vercel/analytics";
import { MultiImageInput } from "@/components/multi-image-input";
import { LineQrUploader } from "@/components/line-qr-uploader";
import { showToast } from "@/components/toaster";
import { buildLocalizedPath, type Locale } from "@/lib/i18n";
import { type PlayFormat } from "@/lib/play-format";
import {
  GroupForm,
  GroupFormCopy,
  GroupFormValues,
  Option,
} from "@/components/groups/group-form";

type GroupCreationCopy = GroupFormCopy & {
  photos: string;
  submit: string;
  submitting: string;
  success: string;
  error: string;
  primaryPhoto: string;
  makePrimaryPhoto: string;
  photoUploadHelper: string;
  photoProcessError: string;
};

type GroupCreationFormProps = {
  sports: Option[];
  courts: Record<string, Option[]>;
  copy: GroupCreationCopy;
  dayOptions: Option[];
  locale: Locale;
  defaultSportId?: string;
  defaultCourtId?: string;
};

const GROUP_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_GROUP_BUCKET || "group-images";
export function GroupCreationForm({
  sports,
  courts,
  copy,
  dayOptions,
  locale,
  defaultSportId,
  defaultCourtId,
}: GroupCreationFormProps) {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [images, setImages] = useState<File[]>([]);
  const [lineQrFile, setLineQrFile] = useState<File | null>(null);
  const [lineQrPreview, setLineQrPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  const initialValues: GroupFormValues = useMemo(() => {
    const sportId =
        defaultSportId && sports.some((sport) => sport.value === defaultSportId)
          ? defaultSportId
          : sports[0]?.value ?? "";
    const hasDefaultCourt =
      Boolean(defaultCourtId) &&
      Boolean(
        sportId &&
          courts[sportId]?.some((court) => court.value === defaultCourtId),
      );

    return {
      sportId,
      name: "",
      description: "",
      sessions:
        hasDefaultCourt && defaultCourtId
          ? [
              {
                id: `court-${defaultCourtId}`,
                courtId: defaultCourtId,
                slots: [
                  {
                    id: `slot-${defaultCourtId}`,
                    day: "sunday",
                    start: "",
                    end: "",
                  },
                ],
              },
            ]
          : [],
      playFormat: "double",
      playerAmount: "",
      allowWalkIn: true,
      phone: "",
      lineId: "",
    };
  }, [courts, defaultCourtId, defaultSportId, sports]);

  const handleLineQrChange = (file: File | null, previewUrl: string | null) => {
    if (lineQrPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(lineQrPreview);
    }
    setLineQrFile(file);
    setLineQrPreview(previewUrl ?? null);
  };

  const handleSubmit = async (payload: {
    sportId: string;
    name: string;
    description: string;
    playFormat: PlayFormat;
    playerAmount?: string;
    allowWalkIn: boolean;
    phone?: string;
    lineId?: string;
    sessions: { courtId: string; day: string; start: string; end: string }[];
  }) => {
    setSubmitting(true);

    const response = await fetch("/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setSubmitting(false);
      showToast({ variant: "error", message: data?.error || copy.error });
      return;
    }

    const groupId = data?.groupId as string | undefined;
    if (groupId && images.length > 0) {
      for (let index = 0; index < images.length; index += 1) {
        const file = images[index];
        const ext = file.name.split(".").pop();
        const filePath = `${groupId}/${Date.now()}-${index}.${ext ?? "jpg"}`;
        const { error: uploadError } = await supabase.storage
          .from(GROUP_BUCKET)
          .upload(filePath, file, {
            cacheControl: "3600",
            upsert: true,
            contentType: file.type,
          });
        if (uploadError) {
          showToast({ variant: "error", message: uploadError.message });
          continue;
        }
        const {
          data: { publicUrl },
        } = supabase.storage.from(GROUP_BUCKET).getPublicUrl(filePath);
        await fetch("/api/groups/photos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            groupId,
            imageUrl: publicUrl,
            isPrimary: index === 0,
          }),
        });
      }
    }

    if (groupId && lineQrFile) {
      const formData = new FormData();
      formData.append("file", lineQrFile);
      const uploadResponse = await fetch(
        `/api/groups/${groupId}/line-qr`,
        {
          method: "POST",
          body: formData,
        },
      );
      const uploadData = await uploadResponse.json().catch(() => ({}));
      if (!uploadResponse.ok) {
        showToast({
          variant: "error",
          message: uploadData?.error || copy.error,
        });
      }
    }

    setSubmitting(false);
    track("group_submit_success", {
      surface: "group_create",
      sport: payload.sportId,
      cta: "create_group",
    });
    showToast({ variant: "success", message: copy.success });
    if (groupId) {
      window.setTimeout(() => {
        router.push(buildLocalizedPath(`/groups/${groupId}`, locale));
      }, 900);
      return;
    }
    setImages([]);
    if (lineQrPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(lineQrPreview);
    }
    setLineQrFile(null);
    setLineQrPreview(null);
    setResetKey((prev) => prev + 1);
  };

  return (
    <GroupForm
      key={`${initialValues.sportId}-${resetKey}`}
      initialValues={initialValues}
      sports={sports}
      courts={courts}
      dayOptions={dayOptions}
      copy={copy}
      photoSection={
        <MultiImageInput
          label={copy.photos}
          limit={8}
          value={images}
          primaryLabel={copy.primaryPhoto}
          makePrimaryLabel={copy.makePrimaryPhoto}
          helperText={copy.photoUploadHelper}
          processErrorLabel={copy.photoProcessError}
          onChange={setImages}
        />
      }
      lineQrSection={
        <LineQrUploader
          label={copy.lineQrLabel}
          previewUrl={lineQrPreview}
          onChange={handleLineQrChange}
          disabled={submitting}
        />
      }
      onSubmit={handleSubmit}
      submitting={submitting}
      submitLabel={copy.submit}
      submittingLabel={copy.submitting}
    />
  );
}
