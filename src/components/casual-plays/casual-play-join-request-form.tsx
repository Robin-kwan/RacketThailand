"use client";

import Link from "next/link";
import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import { BaseTextArea } from "@/components/base-text-area";
import { BaseTextField } from "@/components/base-text-field";
import { showToast } from "@/components/toaster";

export type JoinRequestStatus = "pending" | "accepted" | "rejected" | "cancelled";

export type CasualPlayJoinRequestFormCopy = {
  title: string;
  subtitle: string;
  loginPrompt: string;
  loginCta: string;
  contactName: string;
  phone: string;
  line: string;
  message: string;
  submit: string;
  submitting: string;
  success: string;
  error: string;
  contactRequired: string;
  statusPending: string;
  statusAccepted: string;
  statusRejected: string;
  full: string;
  sendAgain: string;
};

type CasualPlayJoinRequestFormProps = {
  playId: string;
  isAuthenticated: boolean;
  loginHref: string;
  initialStatus: JoinRequestStatus | null;
  isFull?: boolean;
  copy: CasualPlayJoinRequestFormCopy;
};

export function CasualPlayJoinRequestForm({
  playId,
  isAuthenticated,
  loginHref,
  initialStatus,
  isFull = false,
  copy,
}: CasualPlayJoinRequestFormProps) {
  const [status, setStatus] = useState<JoinRequestStatus | null>(initialStatus);
  const [showForm, setShowForm] = useState(
    !isFull && (!initialStatus || initialStatus === "rejected"),
  );
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    contactName: "",
    phone: "",
    lineId: "",
    message: "",
  });

  const updateField = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    if (!form.phone.trim() && !form.lineId.trim()) {
      showToast({ variant: "error", message: copy.contactRequired });
      return;
    }

    setSubmitting(true);
    const response = await fetch(`/api/casual-plays/${playId}/join-requests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setSubmitting(false);
      showToast({
        variant: "error",
        message: typeof data?.error === "string" ? data.error : copy.error,
      });
      return;
    }

    setStatus("pending");
    setShowForm(false);
    setSubmitting(false);
    showToast({ variant: "success", message: copy.success });
  };

  const statusMessage =
    status === "pending"
      ? copy.statusPending
      : status === "accepted"
        ? copy.statusAccepted
        : status === "rejected"
          ? copy.statusRejected
          : null;
  const isFullBlocked =
    isFull && status !== "pending" && status !== "accepted";

  return (
    <section className="rounded-[32px] border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-[var(--foreground)]">
            {copy.title}
          </h2>
          <p className="mt-1 text-sm text-[rgb(var(--foreground-rgb)/0.7)]">
            {copy.subtitle}
          </p>
        </div>
      </div>

      {isFullBlocked ? (
        <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm font-semibold text-rose-700">
          {copy.full}
        </div>
      ) : !isAuthenticated ? (
        <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-600">
          <p>{copy.loginPrompt}</p>
          <Link
            href={loginHref}
            className="mt-3 inline-flex rounded-full bg-[var(--rt-primary)] px-4 py-2 text-xs font-semibold text-[var(--rt-primary-text)]"
          >
            {copy.loginCta}
          </Link>
        </div>
      ) : (
        <>
          {statusMessage && !showForm && (
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
              <p>{statusMessage}</p>
              {status === "rejected" && (
                <button
                  type="button"
                  className="mt-3 rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:border-slate-500"
                  onClick={() => setShowForm(true)}
                >
                  {copy.sendAgain}
                </button>
              )}
            </div>
          )}

          {showForm && !isFullBlocked && (
            <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">
                    {copy.contactName}
                  </label>
                  <BaseTextField
                    name="contactName"
                    value={form.contactName}
                    onChange={updateField}
                    variant="light"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">
                    {copy.phone}
                  </label>
                  <BaseTextField
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={updateField}
                    variant="light"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">
                  {copy.line}
                </label>
                <BaseTextField
                  name="lineId"
                  value={form.lineId}
                  onChange={updateField}
                  variant="light"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">
                  {copy.message}
                </label>
                <BaseTextArea
                  name="message"
                  value={form.message}
                  onChange={updateField}
                  rows={4}
                  variant="light"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="rt-btn-primary inline-flex items-center justify-center gap-2 px-5 py-3 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting && (
                  <LoaderCircle
                    className="h-4 w-4 animate-spin"
                    strokeWidth={1.8}
                    aria-hidden
                  />
                )}
                {submitting ? copy.submitting : copy.submit}
              </button>
            </form>
          )}
        </>
      )}
    </section>
  );
}
