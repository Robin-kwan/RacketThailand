"use client";

import { useEffect, useState, useTransition } from "react";

type CourtSubmissionPolicyCopy = {
  title: string;
  current: string;
  toggleLabel: string;
  directMode: string;
  requestMode: string;
  save: string;
  saving: string;
  saved: string;
  unsaved: string;
  error: string;
};

type CourtSubmissionPolicyToggleProps = {
  initialAllowPublicCourtPublish: boolean;
  copy: CourtSubmissionPolicyCopy;
};

export function CourtSubmissionPolicyToggle({
  initialAllowPublicCourtPublish,
  copy,
}: CourtSubmissionPolicyToggleProps) {
  const [persistedAllowPublicCourtPublish, setPersistedAllowPublicCourtPublish] =
    useState(initialAllowPublicCourtPublish);
  const [draftAllowPublicCourtPublish, setDraftAllowPublicCourtPublish] =
    useState(initialAllowPublicCourtPublish);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!savedMessage) {
      return;
    }
    const timeoutId = window.setTimeout(() => {
      setSavedMessage(null);
    }, 2600);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [savedMessage]);

  useEffect(() => {
    setPersistedAllowPublicCourtPublish(initialAllowPublicCourtPublish);
    setDraftAllowPublicCourtPublish(initialAllowPublicCourtPublish);
  }, [initialAllowPublicCourtPublish]);

  const hasChanges =
    draftAllowPublicCourtPublish !== persistedAllowPublicCourtPublish;

  const handleSave = () => {
    if (!hasChanges) {
      return;
    }

    setError(null);
    setSavedMessage(null);
    startTransition(async () => {
      const response = await fetch("/api/admin/court-submission-policy", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          allowPublicCourtPublish: draftAllowPublicCourtPublish,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data?.error || copy.error);
        return;
      }
      const updatedValue = Boolean(data?.allowPublicCourtPublish);
      setPersistedAllowPublicCourtPublish(updatedValue);
      setDraftAllowPublicCourtPublish(updatedValue);
      setSavedMessage(copy.saved);
    });
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-[0_18px_52px_rgb(var(--foreground-rgb)/0.08)]">
      <h2 className="text-xl font-semibold text-slate-900">{copy.title}</h2>

      <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {copy.current}
            </p>
            <span
              className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                draftAllowPublicCourtPublish
                  ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                  : "border-amber-300 bg-amber-50 text-amber-700"
              }`}
            >
              {draftAllowPublicCourtPublish ? copy.directMode : copy.requestMode}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-slate-700">
              {copy.toggleLabel}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={draftAllowPublicCourtPublish}
              onClick={() =>
                setDraftAllowPublicCourtPublish((previous) => !previous)
              }
              className={`relative inline-flex h-7 w-12 items-center rounded-full border transition ${
                draftAllowPublicCourtPublish
                  ? "border-emerald-500 bg-emerald-500"
                  : "border-slate-300 bg-slate-300"
              }`}
            >
              <span
                className={`h-5 w-5 rounded-full bg-white shadow transition ${
                  draftAllowPublicCourtPublish
                    ? "translate-x-6"
                    : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={!hasChanges || isPending}
          className="rt-btn-primary rounded-full px-5 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-100"
        >
          {isPending ? copy.saving : copy.save}
        </button>
        {hasChanges && !isPending && (
          <span className="text-xs font-semibold uppercase tracking-wide text-amber-700">
            {copy.unsaved}
          </span>
        )}
        {savedMessage && (
          <span className="rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
            {savedMessage}
          </span>
        )}
      </div>

      {error && (
        <p className="mt-3 rounded-2xl border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      )}
    </div>
  );
}
