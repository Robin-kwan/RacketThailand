"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { BaseImageCard } from "@/components/base-image-card";
import { LineQrUploader } from "@/components/line-qr-uploader";
import {
  CourtFormFields,
  CourtFormValues,
} from "@/components/admin/court-form-fields";
import { showToast } from "@/components/toaster";
import {
  PlaceSearchField,
  type PlaceResolution,
} from "@/components/admin/place-search-field";
import {
  OpeningHoursEditor,
} from "@/components/admin/opening-hours-editor";
import {
  ensureAllDays,
  type OpeningHoursEntry,
} from "@/lib/opening-hours";

type SportOption = {
  id: string;
  label: string;
};

type CourtRecord = {
  id: string;
  sportId: string;
  name: string;
  address: string;
  district: string;
  province: string;
  price_note: string;
  opening_hours: OpeningHoursEntry[] | null;
  phone: string;
  line_id: string;
  website_url: string;
  latitude: string;
  longitude: string;
  google_place_id: string | null;
  lineQrUrl?: string | null;
};

type ExistingPhoto = {
  id: string;
  image_url: string | null;
  is_primary: boolean | null;
};

type EditablePhoto = ExistingPhoto & {
  status: "existing" | "new";
  file?: File;
};

const formatPayload = (changes: Partial<CourtFormValues>) => {
  const payload: Record<string, unknown> = {};
  (Object.keys(changes) as (keyof CourtFormValues)[]).forEach((key) => {
    const value = changes[key];
    if (value === undefined) return;
    if (key === "latitude" || key === "longitude") {
      if (value === "") {
        payload[key] = null;
        return;
      }
      const numeric = Number(value);
      if (Number.isNaN(numeric)) {
        return;
      }
      payload[key] = numeric;
    } else {
      payload[key] = value;
    }
  });
  return payload;
};

const sanitizeHours = (entries: OpeningHoursEntry[]) =>
  entries.filter((entry) => entry.ranges.length > 0);

type CourtEditFormProps = {
  court: CourtRecord;
  sports: SportOption[];
  existingPhotos: ExistingPhoto[];
  copy: {
    title: string;
    subtitle: string;
    selectSport: string;
    name: string;
    address: string;
    district: string;
    province: string;
    price: string;
    openingHours: string;
    phone: string;
    line: string;
    lineQr: string;
    website: string;
    placeSearch: string;
    placeSearchHelper: string;
    placeSearchNoResults: string;
    submit: string;
    submitting: string;
    success: string;
    error: string;
    photos: string;
    locationMissing: string;
  };
};

const COURT_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_COURT_BUCKET || "court-images";

export function CourtEditForm({
  court,
  sports,
  existingPhotos,
  copy,
}: CourtEditFormProps) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [form, setForm] = useState<CourtFormValues>({
    sportId: court.sportId,
    name: court.name,
    address: court.address,
    district: court.district,
    province: court.province,
    price_note: court.price_note,
    phone: court.phone,
    line_id: court.line_id,
    website_url: court.website_url,
    latitude: court.latitude,
    longitude: court.longitude,
    googlePlaceId: court.google_place_id ?? "",
  });
  const initialFormRef = useRef<CourtFormValues>({ ...form });
  const [photos, setPhotos] = useState<EditablePhoto[]>(
    (existingPhotos ?? []).map((photo) => ({
      ...photo,
      status: "existing",
    })),
  );
  const [deletedPhotoIds, setDeletedPhotoIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [openingHours, setOpeningHours] = useState<OpeningHoursEntry[]>(
    ensureAllDays(court.opening_hours),
  );
  const initialHoursRef = useRef(
    JSON.stringify(
      (court.opening_hours ?? []).filter(
        (entry) => entry.ranges?.length > 0,
      ),
    ),
  );
  const [lineQrPreview, setLineQrPreview] = useState<string | null>(
    court.lineQrUrl ?? null,
  );
  const [lineQrFile, setLineQrFile] = useState<File | null>(null);
  const [lineQrRemovalPending, setLineQrRemovalPending] = useState(false);

  useEffect(() => {
    return () => {
      if (lineQrPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(lineQrPreview);
      }
    };
  }, [lineQrPreview]);
  const initialPrimaryIdRef = useRef(
    existingPhotos.find((photo) => photo.is_primary)?.id ?? null,
  );
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

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const computeFormChanges = (): Partial<CourtFormValues> => {
    const initial = initialFormRef.current;
    const diff: Partial<CourtFormValues> = {};
    (Object.keys(form) as (keyof CourtFormValues)[]).forEach((key) => {
      if (form[key] !== initial[key]) {
        diff[key] = form[key];
      }
    });
    return diff;
  };

  const formHasChanges =
    Object.keys(computeFormChanges()).length > 0;
  const normalizedHours = sanitizeHours(openingHours);
  const structuredChanged =
    JSON.stringify(normalizedHours) !== initialHoursRef.current;
  const hasDeletions = deletedPhotoIds.length > 0;
  const hasNewPhotos = photos.some((photo) => photo.status === "new");
  const currentPrimaryId =
    photos.find((photo) => photo.is_primary)?.id ?? null;
  const primaryChanged = currentPrimaryId !== initialPrimaryIdRef.current;
  const photoChanges =
    hasDeletions || hasNewPhotos || primaryChanged;
  const hasPendingChanges =
    formHasChanges || structuredChanged || photoChanges;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    const normalizedStructured = normalizedHours;
    if (normalizedStructured.length === 0) {
      showToast({
        variant: "error",
        message: "Please add at least one opening hour range.",
      });
      setSubmitting(false);
      return;
    }
    if (!form.latitude || !form.longitude) {
      showToast({ variant: "error", message: copy.locationMissing });
      setSubmitting(false);
      return;
    }

    const formChanges = computeFormChanges();
    const structuredChanged =
      JSON.stringify(normalizedStructured) !== initialHoursRef.current;
    const shouldUpdateForm =
      Object.keys(formChanges).length > 0 || structuredChanged;
    const hasDeletions = deletedPhotoIds.length > 0;
    const hasNewPhotos = photos.some((photo) => photo.status === "new");
    const currentPrimaryId =
      photos.find((photo) => photo.is_primary)?.id ?? null;
    const primaryChanged =
      currentPrimaryId !== initialPrimaryIdRef.current;
    const shouldUpdatePhotos =
      hasDeletions || hasNewPhotos || primaryChanged;

    if (!shouldUpdateForm && !shouldUpdatePhotos) {
      setSubmitting(false);
      showToast({
        variant: "info",
        message: "No changes to save.",
      });
      return;
    }

    try {
      if (shouldUpdateForm) {
        const payload = formatPayload(formChanges);
        if (structuredChanged) {
          payload.opening_hours = normalizedStructured;
        }
        const response = await fetch(`/api/courts/${court.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data?.error || copy.error);
        }
        initialFormRef.current = { ...form };
        if (structuredChanged) {
          initialHoursRef.current = JSON.stringify(normalizedStructured);
        }
      }

      if (shouldUpdatePhotos) {
        setUploading(true);
        await handlePhotoOperations(primaryChanged);
      }
      if (lineQrFile || lineQrRemovalPending) {
        await handleLineQrUpdate();
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
      await fetch(`/api/court-photos/${photoId}`, { method: "DELETE" });
    }

    for (const photo of newPhotos) {
      if (!photo.file) continue;
      const file = photo.file;
      const ext = file.name.split(".").pop();
      const filePath = `${court.id}/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}.${ext ?? "jpg"}`;
      const { error: uploadError } = await supabase.storage
        .from(COURT_BUCKET)
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
      } = supabase.storage.from(COURT_BUCKET).getPublicUrl(filePath);
      const uploadResponse = await fetch("/api/admin/court-photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courtId: court.id,
          imageUrl: publicUrl,
          isPrimary: false,
        }),
      });
      const uploadData = await uploadResponse.json().catch(() => null);
      if (!uploadResponse.ok || !uploadData?.photo) {
        throw new Error(uploadData?.error ?? "Failed to upload court photo.");
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
      await fetch(`/api/court-photos/${finalPrimaryId}`, {
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

  const handleLineQrUpdate = async () => {
    if (lineQrFile && lineQrPreview) {
      const ext = lineQrFile.name.split(".").pop();
      const filePath = `${court.id}/line-qr.${ext ?? "jpg"}`;
      const { error: uploadError } = await supabase.storage
        .from(COURT_BUCKET)
        .upload(filePath, lineQrFile, {
          cacheControl: "3600",
          upsert: true,
          contentType: lineQrFile.type,
        });
      if (uploadError) {
        throw new Error(uploadError.message);
      }
      const {
        data: { publicUrl },
      } = supabase.storage.from(COURT_BUCKET).getPublicUrl(filePath);
      const response = await fetch(`/api/courts/${court.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lineQrUrl: publicUrl }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || copy.error);
      }
      if (lineQrPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(lineQrPreview);
      }
      setLineQrPreview(publicUrl);
      setLineQrFile(null);
      setLineQrRemovalPending(false);
      return;
    }
    if (lineQrRemovalPending) {
      const response = await fetch(`/api/courts/${court.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lineQrUrl: null }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || copy.error);
      }
      setLineQrPreview(null);
      setLineQrRemovalPending(false);
    }
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
    if (!files) return;
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

  const handleLineQrChange = (file: File | null, previewUrl: string | null) => {
    if (lineQrPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(lineQrPreview);
    }
    setLineQrFile(file);
    setLineQrPreview(previewUrl ?? null);
    if (file) {
      setLineQrRemovalPending(false);
    } else if (!previewUrl) {
      setLineQrRemovalPending(Boolean(lineQrPreview));
    }
  };

  const handlePlaceResolution = (resolution: PlaceResolution) => {
    const coords = resolution.coordinates;
    const structured = ensureAllDays(
      resolution.place?.openingHoursStructured ?? null,
    );
    setOpeningHours(structured);
    setForm((prev) => ({
      ...prev,
      latitude: coords.latitude != null ? String(coords.latitude) : prev.latitude,
      longitude:
        coords.longitude != null ? String(coords.longitude) : prev.longitude,
      name: resolution.place?.name ?? prev.name,
      address: resolution.place?.address ?? prev.address,
      district: resolution.place?.district ?? prev.district,
      province: resolution.place?.province ?? prev.province,
      phone: resolution.place?.phone ?? prev.phone,
      website_url: resolution.place?.website ?? prev.website_url,
      googlePlaceId:
        resolution.place?.placeId ??
        resolution.placeId ??
        prev.googlePlaceId,
    }));
  };

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <PlaceSearchField
        label={copy.placeSearch}
        helper={copy.placeSearchHelper}
        noResults={copy.placeSearchNoResults}
        onResolve={handlePlaceResolution}
        initialQuery={
          form.googlePlaceId
            ? [form.name, form.address].filter(Boolean).join(" · ")
            : ""
        }
        selectedCoordinates={
          form.latitude && form.longitude
            ? {
                latitude: form.latitude,
                longitude: form.longitude,
              }
            : null
        }
      />
      <div className="space-y-2">
        <label className="text-sm font-semibold text-slate-700">
          {copy.openingHours}
        </label>
        <OpeningHoursEditor
          value={openingHours}
          onChange={(next) => setOpeningHours(next)}
        />
      </div>
      <CourtFormFields
        values={form}
        copy={copy}
        sports={sports}
        onChange={handleChange}
        extras={
          <div className="space-y-4">
            <LineQrUploader
              label={copy.lineQr}
              previewUrl={lineQrPreview}
              onChange={handleLineQrChange}
              disabled={submitting || uploading}
            />
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
                      alt="Court photo"
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
          </div>
        }
      />

      <button
        type="submit"
        disabled={submitting || !hasPendingChanges}
      className="w-full rounded-2xl bg-slate-900 px-4 py-3 font-semibold text-white hover:bg-slate-800 disabled:bg-slate-500 disabled:text-white disabled:border disabled:border-slate-500 disabled:cursor-not-allowed"
      >
        {submitting ? `${copy.submitting}...` : copy.submit}
      </button>
    </form>
  );
}
