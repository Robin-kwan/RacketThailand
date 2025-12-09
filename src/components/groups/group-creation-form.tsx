"use client";

import { useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { MultiImageInput } from "@/components/multi-image-input";
import { showToast } from "@/components/toaster";
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
};

type GroupCreationFormProps = {
  sports: Option[];
  courts: Record<string, Option[]>;
  copy: GroupCreationCopy;
  dayOptions: Option[];
};

const GROUP_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_GROUP_BUCKET || "group-images";

export function GroupCreationForm({
  sports,
  courts,
  copy,
  dayOptions,
}: GroupCreationFormProps) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [images, setImages] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  const initialValues: GroupFormValues = useMemo(
    () => ({
      sportId: sports[0]?.value ?? "",
      name: "",
      description: "",
      isPublic: true,
      sessions: [],
    }),
    [sports],
  );

  const handleSubmit = async (payload: {
    sportId: string;
    name: string;
    description: string;
    isPublic: boolean;
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

    setSubmitting(false);
    showToast({ variant: "success", message: copy.success });
    setImages([]);
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
          onChange={setImages}
        />
      }
      onSubmit={handleSubmit}
      submitting={submitting}
      submitLabel={copy.submit}
      submittingLabel={copy.submitting}
    />
  );
}
