"use client";

import { useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { MultiImageInput } from "@/components/multi-image-input";
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
  copy: {
    selectSport: string;
    name: string;
    address: string;
    district: string;
    province: string;
    price: string;
    openingHours: string;
    phone: string;
    line: string;
    website: string;
    placeSearch: string;
    placeSearchHelper: string;
    placeSearchNoResults: string;
    photos: string;
    submit: string;
    submitting: string;
    success: string;
    error: string;
    locationMissing: string;
  };
};

const COURT_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_COURT_BUCKET || "court-images";

export function CourtAdminForm({ sports, copy }: CourtFormProps) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [form, setForm] = useState<CourtFormValues>({
    sportId: sports[0]?.id ?? "",
    name: "",
    address: "",
    district: "",
    province: "",
    price_note: "",
    phone: "",
    line_id: "",
    website_url: "",
    latitude: "",
    longitude: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [openingHours, setOpeningHours] = useState<OpeningHoursEntry[]>(
    createAlwaysOpenSchedule(),
  );

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
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
    const response = await fetch("/api/admin/courts", {
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

    setSubmitting(false);
    showToast({ variant: "success", message: copy.success });
    setForm((prev) => ({
      ...prev,
      sportId: sports[0]?.id ?? "",
      name: "",
      address: "",
      district: "",
      province: "",
      price_note: "",
      phone: "",
      line_id: "",
      website_url: "",
      latitude: "",
      longitude: "",
    }));
    setImages([]);
    setOpeningHours(createAlwaysOpenSchedule());
  };

  const handlePlaceResolution = (resolution: PlaceResolution) => {
    const coords = resolution.coordinates;
    setStructuredHours(resolution.place?.openingHoursStructured ?? null);
    const structured = ensureAllDays(
      resolution.place?.openingHoursStructured ?? null,
    );
    setOpeningHours(structured);
    setForm((prev) => ({
      ...prev,
      latitude: coords.latitude,
      longitude: coords.longitude,
      name: resolution.place?.name ?? prev.name,
      address: resolution.place?.address ?? prev.address,
      district: resolution.place?.district ?? prev.district,
      province: resolution.place?.province ?? prev.province,
      phone: resolution.place?.phone ?? prev.phone,
      website_url: resolution.place?.website ?? prev.website_url,
    }));
  };

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <PlaceSearchField
        label={copy.placeSearch}
        helper={copy.placeSearchHelper}
        noResults={copy.placeSearchNoResults}
        onResolve={handlePlaceResolution}
        currentCoordinates={
          form.latitude && form.longitude
            ? { latitude: form.latitude, longitude: form.longitude }
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
          <MultiImageInput
            label={copy.photos}
            limit={8}
            value={images}
            onChange={setImages}
          />
        }
      />

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-2xl bg-slate-900 px-4 py-3 font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? `${copy.submitting}...` : copy.submit}
      </button>
    </form>
  );
}
