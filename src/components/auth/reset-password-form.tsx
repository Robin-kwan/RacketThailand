"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
type ResetCopy = {
  newLabel: string;
  confirmLabel: string;
  button: string;
  updating: string;
  helper: string;
  success: string;
  sessionMissing: string;
  errorMismatch: string;
  errorWeak: string;
};

const COMPLEXITY_REGEX =
  /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]).{8,}$/;

export function ResetPasswordForm({ copy }: { copy: ResetCopy }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      if (!data.session) {
        setError(copy.sessionMissing);
      } else {
        setSessionReady(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [supabase]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!sessionReady) {
      setError(copy.sessionMissing);
      return;
    }
    if (password !== confirmPassword) {
      setError(copy.errorMismatch);
      return;
    }
    if (!COMPLEXITY_REGEX.test(password)) {
      setError(copy.errorWeak);
      return;
    }
    setError(null);
    setSuccess(null);
    setUpdating(true);
    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });
    setUpdating(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    await supabase.auth.signOut();
    if (typeof document !== "undefined") {
      document.cookie = "rt-recovery=; Max-Age=0; path=/";
    }
    setSuccess(copy.success);
    setTimeout(() => {
      const lang = searchParams?.get("lang");
      router.replace(lang ? `/login?lang=${lang}` : "/login");
    }, 2000);
  };

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <label className="text-sm font-semibold text-slate-700">
          {copy.newLabel}
        </label>
        <input
          type="password"
          className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--rt-primary-border)] focus:bg-white"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="••••••••"
          minLength={8}
          required
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-semibold text-slate-700">
          {copy.confirmLabel}
        </label>
        <input
          type="password"
          className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--rt-primary-border)] focus:bg-white"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder="••••••••"
          minLength={8}
          required
        />
      </div>
      {error && <p className="text-sm text-rose-400">{error}</p>}
      {success && <p className="text-sm text-emerald-400">{success}</p>}
      <button
        type="submit"
        disabled={updating}
        className="w-full rounded-2xl bg-emerald-400 px-4 py-3 font-semibold text-slate-900 hover:bg-emerald-300 disabled:bg-slate-500 disabled:text-white disabled:border disabled:border-slate-500 disabled:cursor-not-allowed"
      >
        {updating ? copy.updating : copy.button}
      </button>
      <p className="text-xs text-slate-400">
        {copy.helper}
      </p>
    </form>
  );
}
