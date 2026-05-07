"use client";

import { useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { track } from "@vercel/analytics";
import { MultiImageInput } from "@/components/multi-image-input";
import { LineQrUploader } from "@/components/line-qr-uploader";
import { showToast } from "@/components/toaster";
import {
  CourtFormFields,
  CourtFormValues,
} from "@/components/admin/court-form-fields";
import {
  PlaceSearchField,
  type PlaceResolution,
} from "@/components/admin/place-search-field";
import {
  OpeningHoursEditor,
} from "@/components/admin/opening-hours-editor";
import {
  createAlwaysOpenSchedule,
  ensureAllDays,
  type OpeningHoursEntry,
} from "@/lib/opening-hours";

type SportOption = {
  id: string;
  label: string;
};

type CourtFormProps = {
  sports: SportOption[];
  submitEndpoint?: string;
  analyticsSurface?: string;
  copy: {
    selectSport: string;
    name: string;
    description: string;
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
    photos: string;
    primaryPhoto: string;
    makePrimaryPhoto: string;
    submit: string;
    submitting: string;
    success: string;
    successPending?: string;
    error: string;
    locationMissing: string;
  };
};

const COURT_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_COURT_BUCKET || "court-images";
const COURT_LINE_QR_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_COURT_LINE_QR_BUCKET || "court-line-qr";

export function CourtAdminForm({
  sports,
  submitEndpoint = "/api/admin/courts",
  analyticsSurface,
  copy,
}: CourtFormProps) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [form, setForm] = useState<CourtFormValues>({
    sportId: sports[0]?.id ?? "",
    name: "",
    description: "",
    address: "",
    district: "",
    province: "",
    price_note: "",
    phone: "",
    line_id: "",
    website_url: "",
    latitude: "",
    longitude: "",
    googlePlaceId: "",
  });
  const [submitting, setSubmitting] = useState(false);
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

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);

    if (!form.latitude || !form.longitude) {
      showToast({
        variant: "error",
        message: copy.locationMissing,
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
        message: "Please add at least one opening hour range.",
      });
      setSubmitting(false);
      return;
    }
    if (analyticsSurface) {
      track("court_submit_started", {
        surface: analyticsSurface,
        sport: form.sportId,
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
        const ext = file.name.split(".").pop();
        const filePath = `${courtId}/${Date.now()}-${index}.${ext ?? "jpg"}`;
        const { error: uploadError } = await supabase.storage
          .from(COURT_BUCKET)
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
        } = supabase.storage.from(COURT_BUCKET).getPublicUrl(filePath);
        await fetch("/api/admin/court-photos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            courtId,
            imageUrl: publicUrl,
            isPrimary: index === 0,
          }),
        });
      }
    }

    if (courtId && lineQrFile && lineQrPreview) {
      const ext = lineQrFile.name.split(".").pop();
      const filePath = `${courtId}/line-qr.${ext ?? "jpg"}`;
      const { error: uploadError } = await supabase.storage
        .from(COURT_LINE_QR_BUCKET)
        .upload(filePath, lineQrFile, {
          cacheControl: "3600",
          upsert: true,
          contentType: lineQrFile.type,
        });
      if (uploadError) {
        showToast({ variant: "error", message: uploadError.message });
      } else {
        const {
          data: { publicUrl },
        } = supabase.storage.from(COURT_LINE_QR_BUCKET).getPublicUrl(filePath);
        await fetch(`/api/courts/${courtId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lineQrUrl: publicUrl }),
        });
      }
    }

    setSubmitting(false);
    if (analyticsSurface) {
      track("court_submit_success", {
        surface: analyticsSurface,
        sport: form.sportId,
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
    setForm((prev) => ({
      ...prev,
      sportId: sports[0]?.id ?? "",
      name: "",
      description: "",
      address: "",
      district: "",
      province: "",
      price_note: "",
      phone: "",
      line_id: "",
      website_url: "",
      latitude: "",
      longitude: "",
      googlePlaceId: "",
    }));
    setImages([]);
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
      googlePlaceId: resolution.place?.placeId ?? resolution.placeId ?? prev.googlePlaceId,
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
                latitude: Number(form.latitude),
                longitude: Number(form.longitude),
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
          onChange={setOpeningHours}
        />
      </div>

      <CourtFormFields
        values={form}
        sports={sports}
        copy={copy}
        onChange={handleChange}
        extras={
          <div className="space-y-4">
            <LineQrUploader
              label={copy.lineQr}
              previewUrl={lineQrPreview}
              onChange={handleLineQrChange}
            />
            <MultiImageInput
              label={copy.photos}
              limit={8}
              value={images}
              primaryLabel={copy.primaryPhoto}
              makePrimaryLabel={copy.makePrimaryPhoto}
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
