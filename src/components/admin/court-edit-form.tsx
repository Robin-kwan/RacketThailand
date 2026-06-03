"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Plus } from "lucide-react";
import { BaseImageCard } from "@/components/base-image-card";
import {
  LineQrUploader,
  type LineQrUploaderCopy,
} from "@/components/line-qr-uploader";
import {
  CourtFormFields,
  CourtFormValues,
  LocationDetailsCard,
} from "@/components/admin/court-form-fields";
import { showToast } from "@/components/toaster";
import {
  PlaceSearchField,
  type ExistingCourt,
  type PlaceResolution,
} from "@/components/admin/place-search-field";
import {
  OpeningHoursEditor,
  type OpeningHoursEditorCopy,
} from "@/components/admin/opening-hours-editor";
import {
  ensureAllDays,
  createAlwaysOpenSchedule,
  type OpeningHoursEntry,
} from "@/lib/opening-hours";
import { buildLocalizedPath, type Locale } from "@/lib/i18n";
import { PHOTO_UPLOAD_ACCEPT, optimizePhotoFile } from "@/lib/image-upload";

type SportOption = {
  id: string;
  label: string;
};

type CourtRecord = {
  id: string;
  sportId: string;
  sportIds?: string[];
  name: string;
  description: string;
  address: string;
  district: string;
  province: string;
  districtId: string;
  provinceId: string;
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
    if (
      key === "latitude" ||
      key === "longitude" ||
      key === "provinceId" ||
      key === "districtId"
    ) {
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
  locale: Locale;
  copy: {
    title: string;
    subtitle: string;
    selectSport: string;
    name: string;
    description: string;
    address: string;
    district: string;
    province: string;
    locationDetailsTitle: string;
    locationDetailsHelper: string;
    locationDetailsEmpty: string;
    locationLockedBadge: string;
    price: string;
    openingHours: string;
    openingHoursEditor?: OpeningHoursEditorCopy;
    openingHoursRequired?: string;
    phone: string;
    line: string;
    lineQr: string;
    lineQrUploader?: LineQrUploaderCopy;
    website: string;
    placeSearch: string;
    placeSearchHelper: string;
    placeSearchNoResults: string;
    placeAlreadyRegistered?: string;
    placeExistingCourtLinkFallback?: string;
    submit: string;
    submitting: string;
    success: string;
    error: string;
    photos: string;
    primaryPhoto: string;
    makePrimaryPhoto: string;
    courtPhotoUploadError?: string;
    noChanges?: string;
    locationMissing: string;
  };
};

export function CourtEditForm({
  court,
  sports,
  existingPhotos,
  locale,
  copy,
}: CourtEditFormProps) {
  const router = useRouter();
  const initialSportIds =
    court.sportIds && court.sportIds.length > 0
      ? court.sportIds
      : court.sportId
        ? [court.sportId]
        : [];
  const [form, setForm] = useState<CourtFormValues>({
    sportId: initialSportIds[0] ?? "",
    sportIds: initialSportIds,
    name: court.name,
    description: court.description,
    address: court.address,
    district: court.district,
    province: court.province,
    districtId: court.districtId,
    provinceId: court.provinceId,
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
  const [duplicateCourt, setDuplicateCourt] = useState<ExistingCourt | null>(
    null,
  );
  const [uploading, setUploading] = useState(false);
  const [openingHours, setOpeningHours] = useState<OpeningHoursEntry[]>(
    court.opening_hours && court.opening_hours.length > 0
      ? ensureAllDays(court.opening_hours)
      : createAlwaysOpenSchedule(),
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

  const handleSportIdsChange = (sportIds: string[]) => {
    setForm((prev) => ({
      ...prev,
      sportIds,
      sportId: sportIds[0] ?? "",
    }));
  };

  const computeFormChanges = (): Partial<CourtFormValues> => {
    const initial = initialFormRef.current;
    const diff: Partial<CourtFormValues> = {};
    (Object.keys(form) as (keyof CourtFormValues)[]).forEach((key) => {
      const current = form[key];
      const previous = initial[key];
      const changed =
        Array.isArray(current) || Array.isArray(previous)
          ? JSON.stringify(current) !== JSON.stringify(previous)
          : current !== previous;
      if (changed) {
        (diff as Record<keyof CourtFormValues, string | string[]>)[key] =
          form[key];
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
        message:
          copy.openingHoursRequired ??
          "Please add at least one opening hour range.",
      });
      setSubmitting(false);
      return;
    }
    if (!form.latitude || !form.longitude || !form.provinceId || !form.districtId) {
      showToast({ variant: "error", message: copy.locationMissing });
      setSubmitting(false);
      return;
    }
    if (duplicateCourt) {
      showToast({
        variant: "error",
        message: `${
          copy.placeAlreadyRegistered ??
          "This place is already registered as"
        } ${duplicateCourt.name ?? copy.placeExistingCourtLinkFallback ?? "existing court"}.`,
      });
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
        message: copy.noChanges ?? "No changes to save.",
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
      router.push(buildLocalizedPath(`/courts/${court.id}`, locale));
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
      const photoForm = new FormData();
      photoForm.set("file", file);
      photoForm.set("isPrimary", "false");
      const uploadResponse = await fetch(`/api/courts/${court.id}/photos`, {
        method: "POST",
        body: photoForm,
      });
      const uploadData = await uploadResponse.json().catch(() => null);
      if (!uploadResponse.ok || !uploadData?.photo) {
        throw new Error(
          uploadData?.error ??
            copy.courtPhotoUploadError ??
            "Failed to upload court photo.",
        );
      }
      uploadedMap.set(photo.id, {
        id: uploadData.photo.id,
        image_url: uploadData.photo.image_url,
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
      const qrForm = new FormData();
      qrForm.set("file", lineQrFile);
      const response = await fetch(`/api/courts/${court.id}/line-qr`, {
        method: "POST",
        body: qrForm,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || copy.error);
      }
      if (lineQrPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(lineQrPreview);
      }
      setLineQrPreview(data?.lineQrUrl ?? null);
      setLineQrFile(null);
      setLineQrRemovalPending(false);
      return;
    }
    if (lineQrRemovalPending) {
      const response = await fetch(`/api/courts/${court.id}/line-qr`, {
        method: "DELETE",
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

  const handleAddPhotos = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (uploading) return;
    const files = event.target.files;
    if (!files) return;
    setUploading(true);
    try {
      const optimizedFiles: File[] = [];
      for (const file of Array.from(files).slice(0, Math.max(8 - photos.length, 0))) {
        try {
          optimizedFiles.push(await optimizePhotoFile(file));
        } catch (error) {
          showToast({
            variant: "error",
            message: error instanceof Error ? error.message : copy.error,
          });
        }
      }

      if (optimizedFiles.length > 0) {
        updatePhotos((prev) => {
          const next = [...prev];
          optimizedFiles.forEach((file) => {
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
      }
    } finally {
      setUploading(false);
      event.target.value = "";
    }
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
    setOpeningHours(
      structured.some((entry) => entry.ranges.length > 0)
        ? structured
        : createAlwaysOpenSchedule(),
    );
    setForm((prev) => ({
      ...prev,
      latitude: coords.latitude != null ? String(coords.latitude) : prev.latitude,
      longitude:
        coords.longitude != null ? String(coords.longitude) : prev.longitude,
      name: resolution.place?.name ?? prev.name,
      address: resolution.place?.address ?? prev.address,
      district: resolution.place?.district ?? prev.district,
      province: resolution.place?.province ?? prev.province,
      districtId:
        resolution.place?.districtId != null
          ? String(resolution.place.districtId)
          : prev.districtId,
      provinceId:
        resolution.place?.provinceId != null
          ? String(resolution.place.provinceId)
          : prev.provinceId,
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
        placeholder={copy.placeSearch}
        helper={copy.placeSearchHelper}
        noResults={copy.placeSearchNoResults}
        duplicateLabel={copy.placeAlreadyRegistered}
        duplicateLinkLabel={copy.placeExistingCourtLinkFallback}
        onResolve={handlePlaceResolution}
        onDuplicateCourtChange={setDuplicateCourt}
        currentCourtId={court.id}
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
      <LocationDetailsCard
        values={form}
        copy={{
          address: copy.address,
          district: copy.district,
          province: copy.province,
          locationDetailsTitle: copy.locationDetailsTitle,
          locationDetailsHelper: copy.locationDetailsHelper,
          locationDetailsEmpty: copy.locationDetailsEmpty,
          locationLockedBadge: copy.locationLockedBadge,
        }}
      />
      <div className="space-y-2">
        <label className="text-sm font-semibold text-slate-700">
          {copy.openingHours}
        </label>
        <OpeningHoursEditor
          value={openingHours}
          onChange={(next) => setOpeningHours(next)}
          copy={copy.openingHoursEditor}
        />
      </div>
      <CourtFormFields
        values={form}
        copy={copy}
        sports={sports}
        onChange={handleChange}
        onSportIdsChange={handleSportIdsChange}
        extras={
          <div className="space-y-4">
            <LineQrUploader
              label={copy.lineQr}
              previewUrl={lineQrPreview}
              onChange={handleLineQrChange}
              disabled={submitting || uploading}
              {...copy.lineQrUploader}
            />
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-700">
                  {copy.photos}
                </p>
                {(uploading || submitting) && (
                  <span className="flex items-center gap-1 text-xs text-slate-500">
                    <LoaderCircle
                      className="h-3 w-3 animate-spin"
                      strokeWidth={1.8}
                      aria-hidden
                    />
                    {copy.submitting}
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
                          {photo.is_primary
                            ? copy.primaryPhoto
                            : copy.makePrimaryPhoto}
                        </button>
                      }
                    />
                ))}
                {photos.length < 8 && (
                  <label className="flex h-40 cursor-pointer items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-3xl text-slate-400 hover:border-slate-500 hover:text-slate-600 focus-within:border-slate-500">
                    <Plus
                      className="h-8 w-8"
                      strokeWidth={1.8}
                      aria-hidden
                    />
                    <input
                      type="file"
                      accept={PHOTO_UPLOAD_ACCEPT}
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
