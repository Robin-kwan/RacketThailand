"use client";

import { useMemo } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { showToast } from "@/components/toaster";

type ResendProps = {
  email: string;
  label: string;
  successMessage: string;
  errorMessage: string;
};

export function ResendVerificationButton({
  email,
  label,
  successMessage,
  errorMessage,
}: ResendProps) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const handleResend = async () => {
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
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
