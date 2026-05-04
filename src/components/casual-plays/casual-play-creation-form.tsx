"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { track } from "@vercel/analytics";
import { showToast } from "@/components/toaster";
import {
  buildLocalizedPath,
  type Locale,
} from "@/lib/i18n";
import {
  CasualPlayForm,
  type CasualPlayFormCopy,
  type CasualPlayFormValues,
} from "@/components/casual-plays/casual-play-form";
import type { Option } from "@/components/groups/group-form";

type CasualPlayCreationCopy = CasualPlayFormCopy & {
  submit: string;
  submitting: string;
  success: string;
  error: string;
};

type CasualPlayCreationFormProps = {
  sports: Option[];
  courts: Record<string, Option[]>;
  copy: CasualPlayCreationCopy;
  locale: Locale;
  minDate: string;
  maxDate: string;
};

export function CasualPlayCreationForm({
  sports,
  courts,
  copy,
  locale,
  minDate,
  maxDate,
}: CasualPlayCreationFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const initialValues: CasualPlayFormValues = useMemo(
    () => ({
      sportId: sports[0]?.value ?? "",
      title: "",
      description: "",
      courtId: "",
      venueName: "",
      locationNote: "",
      playDate: minDate,
      startTime: "",
      endTime: "",
      playerAmount: "",
      phone: "",
      lineId: "",
      allowPublicContact: false,
    }),
    [minDate, sports],
  );

  const handleSubmit = async (payload: {
    sportId: string;
    title: string;
    description: string;
    courtId: string;
    venueName?: string;
    locationNote?: string;
    playDate: string;
    startTime: string;
    endTime?: string;
    playerAmount?: string;
    phone?: string;
    lineId?: string;
    allowPublicContact?: boolean;
  }) => {
    setSubmitting(true);

    const response = await fetch("/api/casual-plays", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
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

    track("casual_play_submit_success", {
      surface: "casual_play_create",
      sport: payload.sportId,
      cta: "create_casual_play",
    });
    showToast({ variant: "success", message: copy.success });
    router.push(buildLocalizedPath(`/casual-plays/${data.playId}`, locale));
    router.refresh();
  };

  return (
    <CasualPlayForm
      initialValues={initialValues}
      sports={sports}
      courts={courts}
      copy={copy}
      locale={locale}
      minDate={minDate}
      maxDate={maxDate}
      onSubmit={handleSubmit}
      submitting={submitting}
      submitLabel={copy.submit}
      submittingLabel={copy.submitting}
    />
  );
}
