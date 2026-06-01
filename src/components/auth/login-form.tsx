"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createSupabaseBrowserClient,
  setAuthStorageMode,
  type AuthStorageMode,
} from "@/lib/supabase-browser";
import { showToast } from "@/components/toaster";
import type { Locale } from "@/lib/i18n";
import { buildLocalizedPath } from "@/lib/i18n";
import {
  buildAuthPagePath,
  buildLocalizedAuthRedirectPath,
} from "@/lib/auth-redirect";

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
  success: string;
};

type LoginFormProps = {
  locale: Locale;
  copy: LoginCopy;
  redirectTo?: string;
};

function GoogleIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      aria-hidden
      focusable="false"
    >
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.82-.07-1.42-.23-2.05H12v3.87h6.61c-.13.96-.85 2.41-2.45 3.39l-.02.13 3.56 2.4.25.02c2.29-1.84 3.54-4.55 3.54-7.76z"
      />
      <path
        fill="#34A853"
        d="M12 23c3.27 0 6.02-.94 8.03-2.57l-3.83-2.95c-1.03.62-2.4 1.06-4.2 1.06-3.2 0-5.92-1.84-6.89-4.39l-.14.01-3.7 2.48-.05.12C3.2 20.47 7.27 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.11 14.15A6.01 6.01 0 0 1 4.78 12c0-.75.12-1.48.31-2.15l-.01-.14-3.75-2.52-.12.05A10.23 10.23 0 0 0 0 12c0 1.71.47 3.32 1.28 4.76l3.83-2.61z"
      />
      <path
        fill="#EA4335"
        d="M12 5.46c2.27 0 3.8.85 4.67 1.57l3.41-2.89C17.99 2.45 15.27 1.5 12 1.5c-4.73 0-8.8 2.53-10.72 6.24l3.82 2.61C6.08 7.3 8.8 5.46 12 5.46z"
      />
    </svg>
  );
}

export function LoginForm({
  locale,
  copy,
  redirectTo = "/",
}: LoginFormProps) {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [submitting, setSubmitting] = useState(false);
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

    const mode: AuthStorageMode = rememberMe ? "local" : "session";
    setAuthStorageMode(mode);

    const { data: loginData, error: signInError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });
    setSubmitting(false);

    if (signInError) {
      showToast({ variant: "error", message: signInError.message });
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
      const verifyPath = buildAuthPagePath("/verify", locale, redirectTo);
      const joiner = verifyPath.includes("?") ? "&" : "?";
      router.replace(`${verifyPath}${joiner}${params.toString()}`);
      return;
    }

    try {
      await fetch("/api/profile/ensure", {
        method: "POST",
      });
    } catch (apiError) {
      console.error("Profile ensure failed", apiError);
    }

    showToast({ variant: "success", message: copy.success });
    const target = buildLocalizedAuthRedirectPath(redirectTo, locale);
    router.replace(target);
    router.refresh();
  };

  const handleGoogleLogin = async () => {
    if (typeof window === "undefined") return;
    setGoogleLoading(true);
    const redirectPath = buildLocalizedAuthRedirectPath(redirectTo, locale);
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
      showToast({ variant: "error", message: oauthError.message });
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
            <GoogleIcon />
          </span>
          <span>
            {googleLoading ? `${copy.googleButton}...` : copy.googleButton}
          </span>
        </button>
      </div>
    </>
  );
}
