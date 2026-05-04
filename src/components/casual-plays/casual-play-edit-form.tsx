"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

type CasualPlayEditCopy = CasualPlayFormCopy & {
  submit: string;
  submitting: string;
  success: string;
  error: string;
};

type CasualPlayRecord = CasualPlayFormValues & {
  id: string;
};

type CasualPlayEditFormProps = {
  play: CasualPlayRecord;
  sports: Option[];
  courts: Record<string, Option[]>;
  copy: CasualPlayEditCopy;
  locale: Locale;
  minDate: string;
  maxDate: string;
};

export function CasualPlayEditForm({
  play,
  sports,
  courts,
  copy,
  locale,
  minDate,
  maxDate,
}: CasualPlayEditFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

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

    const response = await fetch(`/api/casual-plays/${play.id}`, {
      method: "PATCH",
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

    showToast({ variant: "success", message: copy.success });
    router.push(buildLocalizedPath(`/casual-plays/${play.id}`, locale));
    router.refresh();
  };

  return (
    <CasualPlayForm
      initialValues={play}
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
      sportDisabled={false}
      disableIfUnchanged
    />
  );
}
