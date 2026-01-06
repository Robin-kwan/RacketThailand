"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

export function ResetPasswordForm() {
  const router = useRouter();
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
        setError(
          "Password reset link is invalid or has expired. Request a new email from the login page.",
        );
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
      setError(
        "Password reset link is invalid or has expired. Request a new email from the login page.",
      );
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
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
    setSuccess("Password updated! Redirecting to login…");
    setTimeout(() => {
      router.replace("/login");
    }, 2000);
  };

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <label className="text-sm font-semibold text-slate-100">
          New password
        </label>
        <input
          type="password"
          className="w-full rounded-2xl border border-slate-700 bg-slate-900/60 px-4 py-3 text-sm text-white outline-none focus:border-slate-500 focus:bg-slate-900"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="••••••••"
          minLength={8}
          required
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-semibold text-slate-100">
          Confirm password
        </label>
        <input
          type="password"
          className="w-full rounded-2xl border border-slate-700 bg-slate-900/60 px-4 py-3 text-sm text-white outline-none focus:border-slate-500 focus:bg-slate-900"
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
        {updating ? "Updating…" : "Update password"}
      </button>
      <p className="text-xs text-slate-400">
        After updating, you'll return to the login page to sign in.
      </p>
    </form>
  );
}
