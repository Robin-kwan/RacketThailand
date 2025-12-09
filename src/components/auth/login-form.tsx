"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import type { Locale } from "@/lib/i18n";
import { buildLocalizedPath } from "@/lib/i18n";

type LoginCopy = {
  emailLabel: string;
  passwordLabel: string;
  rememberMe: string;
  forgotPassword: string;
  button: string;
  agreeTerms: string;
  emailNotVerified: string;
  passwordToggleShow: string;
  passwordToggleHide: string;
};

type LoginFormProps = {
  locale: Locale;
  copy: LoginCopy;
  redirectTo?: string;
};

export function LoginForm({
  locale,
  copy,
  redirectTo = "/",
}: LoginFormProps) {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // Set once so the server HTML matches the first client render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true);
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    setSubmitting(true);
    setError(null);
    setSuccess(null);
    const { data: loginData, error: signInError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });
    setSubmitting(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    if (loginData?.user && !loginData.user.email_confirmed_at) {
      const params = new URLSearchParams({
        email,
      });
      if (loginData.user.id) {
        params.set("userId", loginData.user.id);
      }
      await supabase.auth.signOut();
      router.replace(
        buildLocalizedPath(`/verify?${params.toString()}`, locale),
      );
      return;
    }

    try {
      await fetch("/api/profile/ensure", {
        method: "POST",
      });
    } catch (apiError) {
      console.error("Profile ensure failed", apiError);
    }

    setSuccess("Signed in successfully.");
    router.replace(buildLocalizedPath(redirectTo, locale));
  };

  if (!isMounted) {
    return (
      <div className="mt-8 space-y-4">
        <div className="h-14 rounded-2xl bg-slate-100/80" />
        <div className="h-14 rounded-2xl bg-slate-100/80" />
        <div className="h-10 rounded-2xl bg-slate-100/80" />
        <div className="h-12 rounded-2xl bg-slate-900/70" />
      </div>
    );
  }

  return (
    <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-700">
          {copy.emailLabel}
        </label>
        <input
          type="email"
          name="email"
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:bg-white"
          placeholder="name@email.com"
          required
        />
      </div>
      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-700">
          {copy.passwordLabel}
        </label>
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            name="password"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:bg-white"
            placeholder="••••••••"
            minLength={8}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute inset-y-0 right-3 text-xs font-semibold text-slate-600"
          >
            {showPassword ? copy.passwordToggleHide : copy.passwordToggleShow}
          </button>
        </div>
      </div>
      <div className="flex items-center justify-between text-sm">
        <label className="flex items-center gap-2 text-slate-600">
          <input type="checkbox" className="rounded border-slate-300" />
          {copy.rememberMe}
        </label>
        <button type="button" className="font-semibold text-slate-700">
          {copy.forgotPassword}
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-emerald-600">{success}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-2xl bg-slate-900 px-4 py-3 font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? `${copy.button}...` : copy.button}
      </button>
      <p className="text-sm text-slate-500">{copy.agreeTerms}</p>
    </form>
  );
}
