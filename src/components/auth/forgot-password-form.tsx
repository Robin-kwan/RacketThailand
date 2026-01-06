"use client";

import { useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

export function ForgotPasswordForm() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    setError(null);
    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    const redirectTo = `${baseUrl}/auth/reset`;
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      { redirectTo },
    );
    setSubmitting(false);
    if (resetError) {
      setError(
        resetError.message ||
          "We couldn't send a reset email. Please try again soon.",
      );
      return;
    }
    setMessage(
      "Check your inbox for a link to set a new password. This also lets Google sign-in users set a manual password.",
    );
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <label className="text-sm font-semibold text-slate-100">
          Email address
        </label>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full rounded-2xl border border-slate-700 bg-slate-900/60 px-4 py-3 text-sm text-white outline-none focus:border-slate-500 focus:bg-slate-900"
          placeholder="you@email.com"
          required
        />
      </div>
      {error && <p className="text-sm text-rose-400">{error}</p>}
      {message && <p className="text-sm text-emerald-400">{message}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-2xl bg-emerald-400 px-4 py-3 font-semibold text-slate-900 hover:bg-emerald-300 disabled:bg-slate-500 disabled:text-white disabled:border disabled:border-slate-500 disabled:cursor-not-allowed"
      >
        {submitting ? "Sending…" : "Send reset link"}
      </button>
      <p className="text-xs text-slate-400">
        We'll send a secure link to set a new password.
      </p>
    </form>
  );
}
