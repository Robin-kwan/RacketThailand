"use client";

import { useState } from "react";
import { showToast } from "@/components/toaster";

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

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
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
      showToast({ variant: "success", message: copy.successMessage });
      setSubject("");
      setMessage("");
    } catch (feedbackError) {
      showToast({
        variant: "error",
        message:
          feedbackError instanceof Error
            ? feedbackError.message
            : copy.errorMessage,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-7 text-left">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
          {copy.title}
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {copy.subtitle}
        </p>
      </div>
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-800">
            {copy.subjectLabel}
          </label>
          <input
            type="text"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            placeholder={copy.subjectPlaceholder}
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-[var(--rt-primary)] focus:ring-4 focus:ring-[rgb(var(--rt-primary-rgb)/0.12)]"
            maxLength={120}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-800">
            {copy.messageLabel}
          </label>
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder={copy.messagePlaceholder}
            className="min-h-36 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-[var(--rt-primary)] focus:ring-4 focus:ring-[rgb(var(--rt-primary-rgb)/0.12)]"
            required
          />
        </div>
        <button
          type="submit"
          disabled={submitting || !message.trim()}
          className="rt-btn-primary px-5 py-3 text-sm disabled:opacity-100"
        >
          {submitting ? `${copy.submitLabel}...` : copy.submitLabel}
        </button>
      </form>
    </div>
  );
}
