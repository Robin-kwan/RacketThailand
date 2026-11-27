"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { Flag, ShieldCheck, X } from "lucide-react";
import { track } from "@vercel/analytics";
import { showToast } from "@/components/toaster";

export type ListingReportCopy = {
  trigger: string;
  signInHint: string;
  title: string;
  subtitle: string;
  reasonLabel: string;
  reasons: {
    incorrect: { title: string; description: string };
    ownershipClaim: { title: string; description: string };
    other: { title: string; description: string };
  };
  detailsLabel: string;
  detailsPlaceholder: string;
  claimNotice: string;
  claimContactLabel: string;
  claimContactPlaceholder: string;
  proofUrlLabel: string;
  proofUrlPlaceholder: string;
  proofUrlHint: string;
  cancel: string;
  submit: string;
  submitting: string;
  close: string;
  success: string;
  error: string;
  duplicate: string;
};

type ListingType = "court" | "group";
type ReportCategory = "incorrect" | "ownership_claim" | "other";

type ListingReportDialogProps = {
  listingType: ListingType;
  listingId: string;
  isAuthenticated: boolean;
  canClaimOwnership?: boolean;
  loginHref: string;
  copy: ListingReportCopy;
};

const REASON_KEYS: ReportCategory[] = [
  "incorrect",
  "ownership_claim",
  "other",
];

export function ListingReportDialog({
  listingType,
  listingId,
  isAuthenticated,
  canClaimOwnership = true,
  loginHref,
  copy,
}: ListingReportDialogProps) {
  const titleId = useId();
  const subtitleId = useId();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<ReportCategory>("incorrect");
  const [details, setDetails] = useState("");
  const [claimContact, setClaimContact] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || submitting) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, submitting]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const openDialog = () => {
    track("listing_report_started", { listingType, listingId });
    setOpen(true);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting || !details.trim()) return;
    if (category === "ownership_claim" && !claimContact.trim()) return;

    setSubmitting(true);
    try {
      const response = await fetch("/api/listing-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingType,
          listingId,
          category,
          message: details,
          claimContact:
            category === "ownership_claim" ? claimContact : undefined,
          proofUrl: category === "ownership_claim" ? proofUrl : undefined,
        }),
      });
      const result = (await response.json().catch(() => ({}))) as {
        code?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(
          result.code === "DUPLICATE_CLAIM"
            ? copy.duplicate
            : result.code === "NOT_AUTHENTICATED"
              ? copy.signInHint
              : copy.error,
        );
      }

      track("listing_report_submitted", {
        listingType,
        listingId,
        category,
      });
      setOpen(false);
      setCategory("incorrect");
      setDetails("");
      setClaimContact("");
      setProofUrl("");
      showToast({ variant: "success", message: copy.success });
    } catch (error) {
      showToast({
        variant: "error",
        message: error instanceof Error ? error.message : copy.error,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const triggerClassName =
    "inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2";

  const trigger = isAuthenticated ? (
    <button type="button" onClick={openDialog} className={triggerClassName}>
      <Flag className="size-4" aria-hidden />
      {copy.trigger}
    </button>
  ) : (
    <Link
      href={loginHref}
      className={triggerClassName}
      title={copy.signInHint}
      onClick={() =>
        track("listing_report_started", {
          listingType,
          listingId,
          authenticated: false,
        })
      }
    >
      <Flag className="size-4" aria-hidden />
      {copy.trigger}
    </Link>
  );

  const reasonCopy = {
    incorrect: copy.reasons.incorrect,
    ownership_claim: copy.reasons.ownershipClaim,
    other: copy.reasons.other,
  };
  const availableReasons = canClaimOwnership
    ? REASON_KEYS
    : REASON_KEYS.filter((reason) => reason !== "ownership_claim");

  return (
    <>
      {trigger}
      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed inset-0 z-[9997] flex items-end justify-center bg-slate-950/45 backdrop-blur-sm sm:items-center sm:px-4 sm:py-8"
              role="presentation"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget && !submitting) {
                  setOpen(false);
                }
              }}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={subtitleId}
                className="flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-white/80 bg-white shadow-[0_28px_90px_rgb(15_23_42/0.3)] sm:max-w-xl sm:rounded-2xl"
              >
                <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-5 sm:px-6">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-slate-950">
                      <Flag className="size-5 shrink-0" aria-hidden />
                      <h2 id={titleId} className="text-lg font-semibold">
                        {copy.title}
                      </h2>
                    </div>
                    <p
                      id={subtitleId}
                      className="mt-2 text-sm leading-6 text-slate-600"
                    >
                      {copy.subtitle}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    disabled={submitting}
                    className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-900 disabled:opacity-50"
                    aria-label={copy.close}
                  >
                    <X className="size-4" aria-hidden />
                  </button>
                </div>

                <form
                  className="overflow-y-auto px-5 py-5 sm:px-6"
                  onSubmit={handleSubmit}
                >
                  <fieldset>
                    <legend className="text-sm font-semibold text-slate-900">
                      {copy.reasonLabel}
                    </legend>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {availableReasons.map((reason) => {
                        const selected = category === reason;
                        return (
                          <label
                            key={reason}
                            className={`cursor-pointer rounded-lg border p-3 transition ${
                              selected
                                ? "border-[rgb(var(--rt-primary-border-rgb))] bg-[rgb(var(--rt-primary-rgb))] text-[var(--rt-primary-text)]"
                                : "border-slate-200 bg-white text-slate-900 hover:border-slate-300 hover:bg-slate-50"
                            }`}
                          >
                            <input
                              type="radio"
                              name="report-category"
                              value={reason}
                              checked={selected}
                              onChange={() => setCategory(reason)}
                              className="sr-only"
                            />
                            <span className="block text-sm font-semibold">
                              {reasonCopy[reason].title}
                            </span>
                            <span
                              className={`mt-1 block text-xs leading-5 ${selected ? "text-[rgb(var(--rt-primary-text-rgb)/0.78)]" : "text-slate-500"}`}
                            >
                              {reasonCopy[reason].description}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>

                  {category === "ownership_claim" ? (
                    <div className="mt-5 rounded-lg border border-blue-200 bg-blue-50 p-4">
                      <div className="flex gap-3">
                        <ShieldCheck
                          className="mt-0.5 size-5 shrink-0 text-blue-700"
                          aria-hidden
                        />
                        <p className="text-sm leading-6 text-blue-950">
                          {copy.claimNotice}
                        </p>
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-5 space-y-2">
                    <label
                      htmlFor={`${titleId}-details`}
                      className="text-sm font-semibold text-slate-900"
                    >
                      {copy.detailsLabel}
                    </label>
                    <textarea
                      id={`${titleId}-details`}
                      value={details}
                      onChange={(event) => setDetails(event.target.value)}
                      placeholder={copy.detailsPlaceholder}
                      required
                      maxLength={3000}
                      className="min-h-28 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-[var(--rt-primary)] focus:ring-4 focus:ring-[rgb(var(--rt-primary-rgb)/0.12)]"
                    />
                  </div>

                  {category === "ownership_claim" ? (
                    <div className="mt-5 space-y-5">
                      <div className="space-y-2">
                        <label
                          htmlFor={`${titleId}-contact`}
                          className="text-sm font-semibold text-slate-900"
                        >
                          {copy.claimContactLabel}
                        </label>
                        <input
                          id={`${titleId}-contact`}
                          type="text"
                          value={claimContact}
                          onChange={(event) =>
                            setClaimContact(event.target.value)
                          }
                          placeholder={copy.claimContactPlaceholder}
                          required
                          maxLength={300}
                          className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-[var(--rt-primary)] focus:ring-4 focus:ring-[rgb(var(--rt-primary-rgb)/0.12)]"
                        />
                      </div>
                      <div className="space-y-2">
                        <label
                          htmlFor={`${titleId}-proof`}
                          className="text-sm font-semibold text-slate-900"
                        >
                          {copy.proofUrlLabel}
                        </label>
                        <input
                          id={`${titleId}-proof`}
                          type="url"
                          inputMode="url"
                          value={proofUrl}
                          onChange={(event) => setProofUrl(event.target.value)}
                          placeholder={copy.proofUrlPlaceholder}
                          maxLength={1000}
                          className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-[var(--rt-primary)] focus:ring-4 focus:ring-[rgb(var(--rt-primary-rgb)/0.12)]"
                        />
                        <p className="text-xs leading-5 text-slate-500">
                          {copy.proofUrlHint}
                        </p>
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-6 grid gap-3 border-t border-slate-200 pt-5 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      disabled={submitting}
                      className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                    >
                      {copy.cancel}
                    </button>
                    <button
                      type="submit"
                      disabled={
                        submitting ||
                        !details.trim() ||
                        (category === "ownership_claim" && !claimContact.trim())
                      }
                      className="rt-btn-primary min-h-11 px-5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {submitting ? copy.submitting : copy.submit}
                    </button>
                  </div>
                </form>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
