"use client";

import { useMemo, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { showToast } from "@/components/toaster";
import {
  GroupForm,
  GroupFormCopy,
  GroupFormValues,
  Option,
} from "@/components/groups/group-form";
import { BaseImageCard } from "@/components/base-image-card";

type SportOption = Option;

type CourtOption = Option;

type ExistingPhoto = {
  id: string;
  image_url: string | null;
  is_primary: boolean | null;
};

type EditablePhoto = ExistingPhoto & {
  status: "existing" | "new";
  file?: File;
};

type GroupEditCopy = GroupFormCopy & {
  photos: string;
  submit: string;
  submitting: string;
  success: string;
  error: string;
};

type GroupRecord = {
  id: string;
  sportId: string;
  name: string;
  description: string;
  sessions: GroupFormValues["sessions"];
  isPublic: boolean;
};

type GroupEditFormProps = {
  group: GroupRecord;
  sports: SportOption[];
  courts: Record<string, CourtOption[]>;
  dayOptions: Option[];
  existingPhotos: ExistingPhoto[];
  copy: GroupEditCopy;
};

const GROUP_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_GROUP_BUCKET || "group-images";

export function GroupEditForm({
  group,
  sports,
  courts,
  dayOptions,
  existingPhotos,
  copy,
}: GroupEditFormProps) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [photos, setPhotos] = useState<EditablePhoto[]>(
    (existingPhotos ?? []).map((photo) => ({
      ...photo,
      status: "existing",
    })),
  );
  const [deletedPhotoIds, setDeletedPhotoIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const initialPrimaryIdRef = useRef(
    existingPhotos.find((photo) => photo.is_primary)?.id ?? null,
  );

  const initialValues: GroupFormValues = {
    sportId: group.sportId,
    name: group.name,
    description: group.description,
    isPublic: group.isPublic,
    sessions: group.sessions,
  };

  const normalizePrimary = (list: EditablePhoto[]) => {
    if (list.length === 0) return list;
    const currentPrimary = list.find((photo) => photo.is_primary);
    if (currentPrimary) {
      return list.map((photo) => ({
        ...photo,
        is_primary: photo.id === currentPrimary.id,
      }));
    }
    return list.map((photo, index) => ({
      ...photo,
      is_primary: index === 0,
    }));
  };

  const updatePhotos = (
    updater: (prev: EditablePhoto[]) => EditablePhoto[],
  ) => {
    setPhotos((prev) => normalizePrimary(updater(prev)));
  };

  const handleRemovePhoto = (photoId: string) => {
    if (uploading) return;
    setPhotos((prev) => {
      const target = prev.find((photo) => photo.id === photoId);
      if (!target) return prev;
      if (target.status === "existing") {
        setDeletedPhotoIds((ids) => [...ids, photoId]);
      } else if (target.image_url) {
        URL.revokeObjectURL(target.image_url);
      }
      const filtered = prev.filter((photo) => photo.id !== photoId);
      return normalizePrimary(filtered);
    });
  };

  const handleSetPrimary = (photoId: string) => {
    if (uploading) return;
    setPhotos((prev) =>
      prev.map((photo) => ({
        ...photo,
        is_primary: photo.id === photoId,
      })),
    );
  };

  const handleAddPhotos = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (uploading) return;
    const files = event.target.files;
    if (!files || photos.length >= 8) return;
    updatePhotos((prev) => {
      const next = [...prev];
      Array.from(files).forEach((file) => {
        if (next.length >= 8) return;
        const id = `local-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}`;
        const previewUrl = URL.createObjectURL(file);
        next.push({
          id,
          image_url: previewUrl,
          is_primary: false,
          status: "new",
          file,
        });
      });
      return next;
    });
    event.target.value = "";
  };

  const handleSubmit = async (payload: {
    sportId: string;
    name: string;
    description: string;
    isPublic: boolean;
    sessions: { courtId: string; day: string; start: string; end: string }[];
  }) => {
    setSubmitting(true);

    const hasDeletions = deletedPhotoIds.length > 0;
    const hasNewPhotos = photos.some((photo) => photo.status === "new");
    const currentPrimaryId =
      photos.find((photo) => photo.is_primary)?.id ?? null;
    const primaryChanged =
      currentPrimaryId !== initialPrimaryIdRef.current;

    const response = await fetch(`/api/groups/${group.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sportId: payload.sportId,
        name: payload.name,
        description: payload.description,
        sessions: payload.sessions,
        isPublic: payload.isPublic,
      }),
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setSubmitting(false);
      showToast({
        variant: "error",
        message: data?.error ?? copy.error,
      });
      return;
    }

    const shouldUpdatePhotos =
      hasDeletions || hasNewPhotos || primaryChanged;

    try {
      if (shouldUpdatePhotos) {
        setUploading(true);
        await handlePhotoOperations(primaryChanged);
      }
      showToast({ variant: "success", message: copy.success });
    } catch (error) {
      console.error(error);
      showToast({
        variant: "error",
        message: error instanceof Error ? error.message : copy.error,
      });
    } finally {
      setUploading(false);
      setSubmitting(false);
    }
  };

  const handlePhotoOperations = async (primaryChanged: boolean) => {
    const deletions = deletedPhotoIds.slice();
    const newPhotos = photos.filter((photo) => photo.status === "new");
    const uploadedMap = new Map<
      string,
      { id: string; image_url: string; is_primary: boolean | null }
    >();

    for (const photoId of deletions) {
      await fetch(`/api/group-photos/${photoId}`, { method: "DELETE" });
    }

    for (const photo of newPhotos) {
      if (!photo.file) continue;
      const file = photo.file;
      const ext = file.name.split(".").pop();
      const filePath = `${group.id}/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}.${ext ?? "jpg"}`;
      const { error: uploadError } = await supabase.storage
        .from(GROUP_BUCKET)
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
          contentType: file.type,
        });
      if (uploadError) {
        throw new Error(uploadError.message);
      }
      const {
        data: { publicUrl },
      } = supabase.storage.from(GROUP_BUCKET).getPublicUrl(filePath);
      const uploadResponse = await fetch("/api/groups/photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId: group.id,
          imageUrl: publicUrl,
          isPrimary: false,
        }),
      });
      const uploadData = await uploadResponse.json().catch(() => null);
      if (!uploadResponse.ok || !uploadData?.photo) {
        throw new Error(uploadData?.error ?? copy.error);
      }
      uploadedMap.set(photo.id, {
        id: uploadData.photo.id,
        image_url: publicUrl,
        is_primary: uploadData.photo.is_primary,
      });
      if (photo.image_url) {
        URL.revokeObjectURL(photo.image_url);
      }
    }

    const desiredPrimary = photos.find((photo) => photo.is_primary);
    let finalPrimaryId: string | null = null;
    if (desiredPrimary) {
      if (
        desiredPrimary.status === "existing" &&
        !deletedPhotoIds.includes(desiredPrimary.id)
      ) {
        finalPrimaryId = desiredPrimary.id;
      } else if (desiredPrimary.status === "new") {
        finalPrimaryId = uploadedMap.get(desiredPrimary.id)?.id ?? null;
      }
    }

    if (primaryChanged && finalPrimaryId) {
      await fetch(`/api/group-photos/${finalPrimaryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setPrimary" }),
      });
      initialPrimaryIdRef.current = finalPrimaryId;
    }

    setDeletedPhotoIds([]);

    const persistedExisting = photos
      .filter(
        (photo) =>
          photo.status === "existing" &&
          !deletedPhotoIds.includes(photo.id),
      )
      .map((photo) => ({
        id: photo.id,
        image_url: photo.image_url,
        is_primary: finalPrimaryId
          ? photo.id === finalPrimaryId
          : photo.is_primary,
        status: "existing" as const,
      }));

    const persistedNew = Array.from(uploadedMap.values()).map((photo) => ({
      id: photo.id,
      image_url: photo.image_url,
      is_primary: finalPrimaryId ? photo.id === finalPrimaryId : false,
      status: "existing" as const,
    }));

    const nextPhotos = normalizePrimary([
      ...persistedExisting,
      ...persistedNew,
    ]);
    setPhotos(nextPhotos);
    initialPrimaryIdRef.current =
      nextPhotos.find((photo) => photo.is_primary)?.id ?? null;
  };

  return (
    <GroupForm
      key={group.id}
      initialValues={initialValues}
      sports={sports}
      courts={courts}
      dayOptions={dayOptions}
      copy={copy}
      photoSection={
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">
              {copy.photos}
            </p>
            {(uploading || submitting) && (
              <span className="flex items-center gap-1 text-xs text-slate-500">
                <svg
                  className="h-3 w-3 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z"
                  />
                </svg>
                Working...
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {photos
              .slice()
              .sort((a, b) => Number(b.is_primary) - Number(a.is_primary))
              .map((photo) => (
                <BaseImageCard
                  key={photo.id}
                  imageUrl={photo.image_url ?? undefined}
                  alt="Group photo"
                  onRemove={() => handleRemovePhoto(photo.id)}
                  disabled={uploading || submitting}
                  heightClass="h-40"
                  footer={
                    <button
                      type="button"
                      onClick={() => handleSetPrimary(photo.id)}
                      className={`font-semibold ${photo.is_primary ? "text-emerald-300" : "text-slate-200"}`}
                      disabled={photo.is_primary || uploading || submitting}
                    >
                      {photo.is_primary ? "Primary" : "Make primary"}
                    </button>
                  }
                />
              ))}
            {photos.length < 8 && (
              <label className="flex h-40 cursor-pointer items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-3xl text-slate-400 hover:border-slate-500 hover:text-slate-600 focus-within:border-slate-500">
                <span>+</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleAddPhotos}
                  disabled={uploading || submitting}
                />
              </label>
            )}
          </div>
        </div>
      }
      onSubmit={handleSubmit}
      submitting={submitting}
      submitLabel={copy.submit}
      submittingLabel={copy.submitting}
      sportDisabled
    />
  );
}
