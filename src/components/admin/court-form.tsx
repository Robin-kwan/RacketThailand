"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { track } from "@vercel/analytics";
import { MultiImageInput } from "@/components/multi-image-input";
import {
  LineQrUploader,
  type LineQrUploaderCopy,
} from "@/components/line-qr-uploader";
import { showToast } from "@/components/toaster";
import {
  CourtFormFields,
  CourtFormValues,
  LocationDetailsCard,
} from "@/components/admin/court-form-fields";
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
  createAlwaysOpenSchedule,
  ensureAllDays,
  type OpeningHoursEntry,
} from "@/lib/opening-hours";
import { buildLocalizedPath, normalizeLocale } from "@/lib/i18n";

type SportOption = {
  id: string;
  label: string;
};

type CourtFormProps = {
  sports: SportOption[];
  defaultSportId?: string;
  submitEndpoint?: string;
  analyticsSurface?: string;
  copy: {
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
    photos: string;
    primaryPhoto: string;
    makePrimaryPhoto: string;
    photoUploadHelper: string;
    photoProcessError: string;
    courtPhotoUploadError?: string;
    lineQrUploadError?: string;
    submit: string;
    submitting: string;
    success: string;
    successPending?: string;
    error: string;
    locationMissing: string;
  };
};

export function CourtAdminForm({
  sports,
  defaultSportId,
  submitEndpoint = "/api/admin/courts",
  analyticsSurface,
  copy,
}: CourtFormProps) {
  const router = useRouter();
  const initialSportId =
    defaultSportId && sports.some((sport) => sport.id === defaultSportId)
      ? defaultSportId
      : sports[0]?.id ?? "";
  const [form, setForm] = useState<CourtFormValues>({
    sportId: initialSportId,
    sportIds: initialSportId ? [initialSportId] : [],
    name: "",
    description: "",
    address: "",
    district: "",
    province: "",
    districtId: "",
    provinceId: "",
    price_note: "",
    phone: "",
    line_id: "",
    website_url: "",
    latitude: "",
    longitude: "",
    googlePlaceId: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [duplicateCourt, setDuplicateCourt] = useState<ExistingCourt | null>(
    null,
  );
  const [images, setImages] = useState<File[]>([]);
  const [lineQrFile, setLineQrFile] = useState<File | null>(null);
  const [lineQrPreview, setLineQrPreview] = useState<string | null>(null);
  const [openingHours, setOpeningHours] = useState<OpeningHoursEntry[]>(
    createAlwaysOpenSchedule(),
  );

  const handleLineQrChange = (file: File | null, previewUrl: string | null) => {
    if (lineQrPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(lineQrPreview);
    }
    setLineQrFile(file);
    setLineQrPreview(previewUrl ?? null);
  };

  const handleChange = (
    event: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
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

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);

    if (!form.latitude || !form.longitude || !form.provinceId || !form.districtId) {
      showToast({
        variant: "error",
        message: copy.locationMissing,
      });
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

    const parsedHours = openingHours.filter(
      (entry) => entry.ranges.length > 0,
    );
    if (parsedHours.length === 0) {
      showToast({
        variant: "error",
        message:
          copy.openingHoursRequired ??
          "Please add at least one opening hour range.",
      });
      setSubmitting(false);
      return;
    }
    if (analyticsSurface) {
      track("court_submit_started", {
        surface: analyticsSurface,
        sport: form.sportIds.join(",") || form.sportId,
      });
    }

    const response = await fetch(submitEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        opening_hours: parsedHours,
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
        provinceId: Number(form.provinceId),
        districtId: Number(form.districtId),
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setSubmitting(false);
      showToast({
        variant: "error",
        message: data?.error || copy.error,
      });
      return;
    }

    const courtId = data?.courtId as string | undefined;
    if (courtId && images.length > 0) {
      for (let index = 0; index < images.length; index += 1) {
        const file = images[index];
        const photoForm = new FormData();
        photoForm.set("file", file);
        photoForm.set("isPrimary", String(index === 0));
        const uploadResponse = await fetch(`/api/courts/${courtId}/photos`, {
          method: "POST",
          body: photoForm,
        });
        const uploadData = await uploadResponse.json().catch(() => ({}));
        if (!uploadResponse.ok) {
          showToast({
            variant: "error",
            message:
              uploadData?.error ??
              copy.courtPhotoUploadError ??
              "Failed to upload court photo.",
          });
          continue;
        }
      }
    }

    if (courtId && lineQrFile && lineQrPreview) {
      const qrForm = new FormData();
      qrForm.set("file", lineQrFile);
      const qrResponse = await fetch(`/api/courts/${courtId}/line-qr`, {
        method: "POST",
        body: qrForm,
      });
      const qrData = await qrResponse.json().catch(() => ({}));
      if (!qrResponse.ok) {
        showToast({
          variant: "error",
          message:
            qrData?.error ??
            copy.lineQrUploadError ??
            "Failed to upload LINE QR image.",
        });
      }
    }

    setSubmitting(false);
    if (analyticsSurface) {
      track("court_submit_success", {
        surface: analyticsSurface,
        sport: form.sportIds.join(",") || form.sportId,
        courtId: courtId ?? null,
      });
    }
    const requiresApproval = data?.requiresApproval === true;
    showToast({
      variant: "success",
      message:
        requiresApproval && copy.successPending
          ? copy.successPending
          : copy.success,
    });
    if (courtId) {
      const locale =
        typeof window === "undefined"
          ? "th"
          : normalizeLocale(
              new URLSearchParams(window.location.search).get("lang"),
            );
      window.setTimeout(() => {
        router.push(buildLocalizedPath(`/courts/${courtId}`, locale));
      }, 900);
      return;
    }
    setForm((prev) => ({
      ...prev,
      sportId: sports[0]?.id ?? "",
      sportIds: sports[0]?.id ? [sports[0].id] : [],
      name: "",
      description: "",
      address: "",
      district: "",
      province: "",
      districtId: "",
      provinceId: "",
      price_note: "",
      phone: "",
      line_id: "",
      website_url: "",
      latitude: "",
      longitude: "",
      googlePlaceId: "",
    }));
    setImages([]);
    setDuplicateCourt(null);
    if (lineQrPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(lineQrPreview);
    }
    setLineQrFile(null);
    setLineQrPreview(null);
    setOpeningHours(createAlwaysOpenSchedule());
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
      googlePlaceId: resolution.place?.placeId ?? resolution.placeId ?? prev.googlePlaceId,
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
        initialQuery={
          form.googlePlaceId
            ? [form.name, form.address].filter(Boolean).join(" · ")
            : ""
        }
        selectedCoordinates={
          form.latitude && form.longitude
            ? {
                latitude: Number(form.latitude),
                longitude: Number(form.longitude),
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
          onChange={setOpeningHours}
          copy={copy.openingHoursEditor}
        />
      </div>

      <CourtFormFields
        values={form}
        sports={sports}
        copy={copy}
        onChange={handleChange}
        onSportIdsChange={handleSportIdsChange}
        extras={
          <div className="space-y-4">
            <LineQrUploader
              label={copy.lineQr}
              previewUrl={lineQrPreview}
              onChange={handleLineQrChange}
              {...copy.lineQrUploader}
            />
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
          </div>
        }
      />

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-2xl bg-emerald-400 px-4 py-3 font-semibold text-slate-900 hover:bg-emerald-300 disabled:bg-slate-500 disabled:text-white disabled:border disabled:border-slate-500 disabled:cursor-not-allowed"
      >
        {submitting ? `${copy.submitting}...` : copy.submit}
      </button>
    </form>
  );
}
