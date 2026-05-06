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
    <div className="space-y-6 text-left">
      <div className="space-y-2 text-[var(--foreground)]">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[rgb(var(--foreground-rgb)/0.65)]">
          Feedback
        </p>
        <h2 className="text-2xl font-semibold">
          {copy.title}
        </h2>
        <p className="text-sm text-[rgb(var(--foreground-rgb)/0.55)]">
          {copy.subtitle}
        </p>
      </div>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label className="text-sm font-medium text-[rgb(var(--foreground-rgb)/0.8)]">
            {copy.subjectLabel}
          </label>
          <input
            type="text"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            placeholder={copy.subjectPlaceholder}
            className="w-full rounded-2xl border border-[rgb(var(--rt-primary-text-rgb)/0.2)] bg-white px-4 py-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[rgb(var(--rt-primary-text-rgb)/0.4)]"
            maxLength={120}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-[rgb(var(--foreground-rgb)/0.8)]">
            {copy.messageLabel}
          </label>
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder={copy.messagePlaceholder}
            className="min-h-[140px] w-full rounded-2xl border border-[rgb(var(--rt-primary-text-rgb)/0.2)] bg-white px-4 py-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[rgb(var(--rt-primary-text-rgb)/0.4)]"
            required
          />
        </div>
        <button
          type="submit"
          disabled={submitting || !message.trim()}
          className="rt-btn-primary w-full px-4 py-3 text-base disabled:opacity-100"
        >
          {submitting ? `${copy.submitLabel}...` : copy.submitLabel}
        </button>
      </form>
    </div>
  );
}
