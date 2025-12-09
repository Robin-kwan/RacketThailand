"use client";

import { useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { MultiImageInput } from "@/components/multi-image-input";
import { showToast } from "@/components/toaster";
import {
  CourtFormFields,
  CourtFormValues,
} from "@/components/admin/court-form-fields";

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
    photos: string;
    submit: string;
    submitting: string;
    success: string;
    error: string;
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
    opening_hours: "",
    phone: "",
    line_id: "",
    website_url: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [images, setImages] = useState<File[]>([]);

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);

    const response = await fetch("/api/admin/courts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
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
      opening_hours: "",
      phone: "",
      line_id: "",
      website_url: "",
    }));
    setImages([]);
  };

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
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
