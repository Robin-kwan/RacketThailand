"use client";

import { useState } from "react";

type FeedbackFormCopy = {
  title: string;
  subtitle: string;
  subjectLabel: string;
  subjectPlaceholder: string;
  messageLabel: string;
  messagePlaceholder: string;
  submitLabel: string;
  successMessage: string;
  errorMessage: string;
};

type FeedbackFormProps = {
  copy: FeedbackFormCopy;
};

export function FeedbackForm({ copy }: FeedbackFormProps) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subject,
          message,
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || copy.errorMessage);
      }
      setSuccess(copy.successMessage);
      setSubject("");
      setMessage("");
    } catch (feedbackError) {
      setError(
        feedbackError instanceof Error
          ? feedbackError.message
          : copy.errorMessage,
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 text-left">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase text-slate-400">
          Feedback
        </p>
        <h2 className="text-2xl font-semibold">{copy.title}</h2>
        <p className="text-sm text-slate-600">{copy.subtitle}</p>
      </div>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">
            {copy.subjectLabel}
          </label>
          <input
            type="text"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            placeholder={copy.subjectPlaceholder}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400"
            maxLength={120}
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">
            {copy.messageLabel}
          </label>
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder={copy.messagePlaceholder}
            className="min-h-[140px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400"
            required
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-emerald-600">{success}</p>}
        <button
          type="submit"
          disabled={submitting || !message.trim()}
          className="w-full rounded-2xl bg-slate-900 px-4 py-3 font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? `${copy.submitLabel}...` : copy.submitLabel}
        </button>
      </form>
    </div>
  );
}
