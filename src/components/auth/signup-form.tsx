"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/i18n";
import { buildLocalizedPath } from "@/lib/i18n";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

type SignupCopy = {
  nameLabel: string;
  emailLabel: string;
  passwordLabel: string;
  confirmPasswordLabel: string;
  button: string;
  agreeTerms: string;
  verifyNotice: string;
  passwordToggleShow: string;
  passwordToggleHide: string;
  passwordRequirements: string;
};

type SignupFormProps = {
  locale: Locale;
  copy: SignupCopy;
};

export function SignupForm({ locale, copy }: SignupFormProps) {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const passwordPattern =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

  useEffect(() => {
    // Show the real form only after the client hydrates.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true);
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "");
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const confirm = String(formData.get("confirmPassword") ?? "");

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (!passwordPattern.test(password)) {
      setError(
        "Password must include lowercase, uppercase, digit, and symbol (min 8 characters).",
      );
      return;
    }

    setSubmitting(true);
    setError(null);
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
        },
      },
    });
    setSubmitting(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    await supabase.auth.signOut();
    const params = new URLSearchParams({
      email,
    });
    if (signUpData?.user?.id) {
      params.set("userId", signUpData.user.id);
    }
    router.replace(
      buildLocalizedPath(`/verify?${params.toString()}`, locale),
    );
  };

  if (!isMounted) {
    return (
      <div className="mt-8 space-y-4">
        <div className="h-14 rounded-2xl bg-slate-100/80" />
        <div className="h-14 rounded-2xl bg-slate-100/80" />
        <div className="h-14 rounded-2xl bg-slate-100/80" />
        <div className="h-14 rounded-2xl bg-slate-100/80" />
        <div className="h-12 rounded-2xl bg-slate-900/70" />
      </div>
    );
  }

  return (
    <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-700">
          {copy.nameLabel}
        </label>
        <input
          type="text"
          name="name"
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:bg-white"
          placeholder="Jane Doe"
          required
        />
      </div>
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
            {showPassword
              ? copy.passwordToggleHide
              : copy.passwordToggleShow}
          </button>
        </div>
      </div>
      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-700">
          {copy.confirmPasswordLabel}
        </label>
        <div className="relative">
          <input
            type={showConfirmPassword ? "text" : "password"}
            name="confirmPassword"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:bg-white"
            placeholder="••••••••"
            minLength={8}
            required
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword((prev) => !prev)}
            className="absolute inset-y-0 right-3 text-xs font-semibold text-slate-600"
          >
            {showConfirmPassword
              ? copy.passwordToggleHide
              : copy.passwordToggleShow}
          </button>
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <p className="text-xs text-slate-500">{copy.passwordRequirements}</p>
      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-2xl bg-slate-900 px-4 py-3 font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? `${copy.button}...` : copy.button}
      </button>
      <p className="text-sm text-slate-500">{copy.agreeTerms}</p>
      <p className="text-sm text-slate-500">{copy.verifyNotice}</p>
    </form>
  );
}
