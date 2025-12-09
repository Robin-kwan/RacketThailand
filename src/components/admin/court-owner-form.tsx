"use client";

import { useState } from "react";
import { BaseSelect } from "@/components/base-select";
import { BaseAutocomplete } from "@/components/base-autocomplete";
import { showToast } from "@/components/toaster";

type Option = {
  value: string;
  label: string;
};

type CourtOwnerFormProps = {
  courts: Option[];
  profiles: Option[];
  copy: {
    courtLabel: string;
    profileLabel: string;
    submit: string;
    submitting: string;
    success: string;
    error: string;
  };
};

export function CourtOwnerForm({
  courts,
  profiles,
  copy,
}: CourtOwnerFormProps) {
  const [courtId, setCourtId] = useState(courts[0]?.value ?? "");
  const [profileId, setProfileId] = useState(profiles[0]?.value ?? "");
  const [submitting, setSubmitting] = useState(false);
  const showToastMessage = (type: "success" | "error", message: string) =>
    showToast({ variant: type, message });

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    const response = await fetch("/api/admin/court-owners", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courtId, profileId }),
    });
    const data = await response.json().catch(() => ({}));
    setSubmitting(false);
    if (!response.ok) {
      showToastMessage("error", data?.error || copy.error);
      return;
    }
    showToastMessage("success", copy.success);
  };

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <BaseSelect
        label={copy.profileLabel}
        name="profileId"
        value={profileId}
        onChange={(event) => setProfileId(event.target.value)}
        options={profiles}
      />
      <BaseAutocomplete
        label={copy.courtLabel}
        name="courtId"
        value={courtId}
        onChange={(event) => setCourtId(event.target.value)}
        options={courts}
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
