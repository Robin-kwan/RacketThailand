"use client";

import { useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { showToast } from "@/components/toaster";
import { isTurnstileEnabled, TurnstileChallenge } from "@/components/auth/turnstile-challenge";

type ResendProps = {
  email: string;
  label: string;
  successMessage: string;
  errorMessage: string;
  captchaRequired: string;
};

export function ResendVerificationButton({
  email,
  label,
  successMessage,
  errorMessage,
  captchaRequired,
}: ResendProps) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const handleResend = async () => {
    if (isTurnstileEnabled && !captchaToken) {
      showToast({ variant: "error", message: captchaRequired });
      return;
    }
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: captchaToken ? { captchaToken } : undefined,
    });
    if (error) {
      showToast({
        variant: "error",
        message: errorMessage || error.message,
      });
      return;
    }
    showToast({ variant: "success", message: successMessage });
  };

  return (
    <div className="flex flex-col gap-3">
      <TurnstileChallenge onTokenChange={setCaptchaToken} />
      <button
        type="button"
        onClick={handleResend}
        className="rounded-full border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-900 hover:border-slate-500"
      >
        {label}
      </button>
    </div>
  );
}
