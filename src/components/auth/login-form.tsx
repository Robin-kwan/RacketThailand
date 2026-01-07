"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createSupabaseBrowserClient,
  setAuthStorageMode,
  type AuthStorageMode,
} from "@/lib/supabase-browser";
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
  googleButton: string;
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
  const [rememberMe, setRememberMe] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

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

    const mode: AuthStorageMode = rememberMe ? "local" : "session";
    setAuthStorageMode(mode);

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
    const target = buildLocalizedPath(redirectTo, locale);
    router.replace(target);
    router.refresh();
  };

  const handleGoogleLogin = async () => {
    if (typeof window === "undefined") return;
    setError(null);
    setSuccess(null);
    setGoogleLoading(true);
    const redirectPath = buildLocalizedPath(redirectTo, locale);
    const baseUrl =
      typeof window !== "undefined"
        ? window.location.origin
        : process.env.NEXT_PUBLIC_SITE_URL || "";
    const callbackUrl = new URL("/auth/callback", baseUrl);
    callbackUrl.searchParams.set("next", redirectPath);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callbackUrl.toString(),
      },
    });
    if (oauthError) {
      setGoogleLoading(false);
      setError(oauthError.message);
    }
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
    <>
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
            <input
              type="checkbox"
              className="rounded border-slate-300"
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.target.checked)}
            />
            {copy.rememberMe}
          </label>
          <button
            type="button"
            className="font-semibold text-slate-700"
            onClick={() =>
              router.push(buildLocalizedPath("/forgot", locale))
            }
          >
            {copy.forgotPassword}
          </button>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-emerald-600">{success}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-2xl bg-emerald-400 px-4 py-3 font-semibold text-slate-900 hover:bg-emerald-300 disabled:bg-slate-500 disabled:text-white disabled:border disabled:border-slate-500 disabled:cursor-not-allowed"
        >
          {submitting ? `${copy.button}...` : copy.button}
        </button>
        <p className="text-sm text-slate-500">{copy.agreeTerms}</p>
      </form>
      <div className="mt-6">
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={googleLoading}
          className="flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:border-slate-400 disabled:bg-slate-500 disabled:text-white disabled:border-slate-500 disabled:cursor-not-allowed"
        >
          <span className="flex h-6 w-6 items-center justify-center">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M21.6 12.227c0-.765-.068-1.503-.195-2.227H12v4.214h5.4c-.234 1.215-.94 2.244-1.982 2.93v2.435h3.203c1.873-1.727 2.979-4.273 2.979-7.352Z"
                fill="#4285F4"
              />
              <path
                d="M12 22.5c2.7 0 4.968-.9 6.624-2.421l-3.203-2.435c-.9.6-2.052.957-3.42.957-2.634 0-4.866-1.777-5.664-4.162H3.03v2.512C4.674 20.362 8.1 22.5 12 22.5Z"
                fill="#34A853"
              />
              <path
                d="M6.336 14.439A6.28 6.28 0 0 1 6 12c0-.84.15-1.65.336-2.438V7.05H3.03A10.446 10.446 0 0 0 2.1 12c0 1.65.375 3.218.93 4.95l3.306-2.511Z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.25c1.473 0 2.784.506 3.822 1.47l2.85-2.85C16.968 2.55 14.7 1.5 12 1.5 8.1 1.5 4.674 3.637 2.93 7.05l3.306 2.513c.798-2.385 3.03-4.312 5.764-4.312Z"
                fill="#EA4335"
              />
            </svg>
          </span>
          <span>
            {googleLoading ? `${copy.googleButton}...` : copy.googleButton}
          </span>
        </button>
      </div>
    </>
  );
}
