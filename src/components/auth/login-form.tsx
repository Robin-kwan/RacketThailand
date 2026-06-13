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
  PENDING_AUTH_REDIRECT_STORAGE_KEY,
} from "@/lib/auth-redirect";
import {
  OAuthButtons,
  type AuthOAuthProvider,
} from "@/components/auth/oauth-buttons";

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
  lineButton: string;
  success: string;
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
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [oauthLoading, setOauthLoading] =
    useState<AuthOAuthProvider | null>(null);

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

  const handleOAuthLogin = async (provider: AuthOAuthProvider) => {
    if (typeof window === "undefined") return;
    setOauthLoading(provider);
    const redirectPath = buildLocalizedAuthRedirectPath(redirectTo, locale);
    const baseUrl =
      typeof window !== "undefined"
        ? window.location.origin
        : process.env.NEXT_PUBLIC_SITE_URL || "";
    const callbackUrl = new URL("/auth/callback", baseUrl);
    callbackUrl.searchParams.set("next", redirectPath);
    window.sessionStorage.setItem(
      PENDING_AUTH_REDIRECT_STORAGE_KEY,
      redirectPath,
    );
    type SupabaseOAuthProvider = Parameters<
      typeof supabase.auth.signInWithOAuth
    >[0]["provider"];
    const providerId =
      provider === "line" ? "custom:line" : provider;
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      // auth-js types in this repo list built-ins only, but Supabase custom
      // providers are addressed with "custom:*" identifiers.
      provider: providerId as SupabaseOAuthProvider,
      options: {
        redirectTo: callbackUrl.toString(),
        ...(provider === "line"
          ? { scopes: "openid profile" }
          : {}),
      },
    });
    if (oauthError) {
      window.sessionStorage.removeItem(PENDING_AUTH_REDIRECT_STORAGE_KEY);
      setOauthLoading(null);
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
        <OAuthButtons
          copy={copy}
          disabled={submitting}
          loadingProvider={oauthLoading}
          onProviderClick={handleOAuthLogin}
        />
      </div>
    </>
  );
}
