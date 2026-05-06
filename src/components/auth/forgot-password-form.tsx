"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { showToast } from "@/components/toaster";

type ForgotCopy = {
  emailLabel: string;
  emailPlaceholder: string;
  submit: string;
  submitting: string;
  success: string;
  helper: string;
  cooldown: string;
  error: string;
};

type ForgotPasswordFormProps = {
  copy: ForgotCopy;
};

const REQUEST_COOLDOWN_MS = 3 * 60 * 1000;
const STORAGE_KEY = "rt-password-reset-request-map";

type CooldownMap = Record<string, number>;

function readCooldownMap(): CooldownMap {
  if (typeof window === "undefined") {
    return {};
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      return parsed as CooldownMap;
    }
    return {};
  } catch {
    return {};
  }
}

function writeCooldownEntry(emailKey: string) {
  if (typeof window === "undefined" || !emailKey) return;
  const map = readCooldownMap();
  map[emailKey] = Date.now();
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export function ForgotPasswordForm({ copy }: ForgotPasswordFormProps) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const isCoolingDown = cooldownRemaining > 0;

  const normalizedEmail = email.trim().toLowerCase();

  useEffect(() => {
    const updateCooldown = () => {
      if (!normalizedEmail) {
        setCooldownRemaining(0);
        return;
      }
      const map = readCooldownMap();
      const lastRequest = map[normalizedEmail];
      if (!lastRequest) {
        setCooldownRemaining(0);
        return;
      }
      const remaining = REQUEST_COOLDOWN_MS - (Date.now() - lastRequest);
      setCooldownRemaining(remaining > 0 ? remaining : 0);
    };
    updateCooldown();
    const interval = window.setInterval(updateCooldown, 1000);
    return () => {
      window.clearInterval(interval);
    };
  }, [normalizedEmail]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isCoolingDown) {
      showToast({
        variant: "error",
        message: copy.cooldown.replace(
          "{time}",
          formatCooldown(cooldownRemaining),
        ),
      });
      return;
    }
    setSubmitting(true);
    const redirectTo = `${window.location.origin}/auth/reset`;
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      { redirectTo },
    );
    setSubmitting(false);
    if (resetError) {
      showToast({ variant: "error", message: copy.error });
      return;
    }
    if (normalizedEmail) {
      writeCooldownEntry(normalizedEmail);
      setCooldownRemaining(REQUEST_COOLDOWN_MS);
    } else {
      setCooldownRemaining(0);
    }
    showToast({ variant: "success", message: copy.success });
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <label className="text-sm font-semibold text-slate-700">
          {copy.emailLabel}
        </label>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--rt-primary-border)] focus:bg-white"
          placeholder={copy.emailPlaceholder}
          required
        />
      </div>
      <button
        type="submit"
        disabled={submitting || isCoolingDown}
        className="w-full rounded-2xl bg-emerald-400 px-4 py-3 font-semibold text-slate-900 hover:bg-emerald-300 disabled:bg-slate-500 disabled:text-white disabled:border disabled:border-slate-500 disabled:cursor-not-allowed"
      >
        {submitting ? copy.submitting : copy.submit}
      </button>
      <p className="text-xs text-slate-400">
        {isCoolingDown
          ? copy.cooldown.replace(
              "{time}",
              formatCooldown(cooldownRemaining),
            )
          : copy.helper}
      </p>
    </form>
  );
}

function formatCooldown(ms: number) {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes <= 0) {
    return `${seconds}s`;
  }
  return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
}
