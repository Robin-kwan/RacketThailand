"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { buildLocalizedPath, type Locale } from "@/lib/i18n";
import { showToast } from "@/components/toaster";

type CourtSubmissionRequest = {
  id: string;
  name: string | null;
  description: string | null;
  address: string | null;
  district: string | null;
  province: string | null;
  created_at: string;
};

type CourtSubmissionRequestsCopy = {
  title: string;
  empty: string;
  submitted: string;
  view: string;
  publish: string;
  reject: string;
  publishing: string;
  rejecting: string;
  error: string;
};

type CourtSubmissionRequestsProps = {
  locale: Locale;
  requests: CourtSubmissionRequest[];
  copy: CourtSubmissionRequestsCopy;
};

function formatDate(value: string) {
  const date = new Date(value);
  return date.toLocaleString();
}

export function CourtSubmissionRequests({
  locale,
  requests,
  copy,
}: CourtSubmissionRequestsProps) {
  const [items, setItems] = useState(requests);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<"publish" | "reject" | null>(
    null,
  );
  const [isPending, startTransition] = useTransition();

  const handleAction = (courtId: string, action: "publish" | "reject") => {
    setPendingId(courtId);
    setPendingAction(action);
    startTransition(async () => {
      const response = await fetch(`/api/admin/court-submissions/${courtId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        showToast({
          variant: "error",
          message: data?.error || copy.error,
        });
        setPendingId(null);
        setPendingAction(null);
        return;
      }
      setItems((previous) => previous.filter((item) => item.id !== courtId));
      setPendingId(null);
      setPendingAction(null);
    });
  };

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6">
      <h2 className="text-xl font-semibold text-slate-900">{copy.title}</h2>
      {items.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-600">
          {copy.empty}
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {items.map((court) => {
            const location = [court.district, court.province]
              .filter((value): value is string => Boolean(value))
              .join(" - ");
            const isRowPending = isPending && pendingId === court.id;
            return (
              <article
                key={court.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-slate-900">
                      {court.name?.trim() || "Unnamed court"}
                    </p>
                    {court.description && (
                      <p className="mt-1 max-w-2xl whitespace-pre-line text-sm text-slate-600">
                        {court.description}
                      </p>
                    )}
                    {court.address && (
                      <p className="mt-1 text-sm text-slate-600">{court.address}</p>
                    )}
                    {location && (
                      <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {location}
                      </p>
                    )}
                    <p className="mt-2 text-xs text-slate-500">
                      {copy.submitted} {formatDate(court.created_at)}
                    </p>
                  </div>
                  <Link
                    href={buildLocalizedPath(`/courts/${court.id}`, locale)}
                    className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700 hover:border-slate-500"
                  >
                    {copy.view}
                  </Link>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleAction(court.id, "publish")}
                    disabled={isRowPending}
                    className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-500"
                  >
                    {isRowPending && pendingAction === "publish"
                      ? copy.publishing
                      : copy.publish}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAction(court.id, "reject")}
                    disabled={isRowPending}
                    className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-500 disabled:cursor-not-allowed disabled:bg-slate-500 disabled:text-white"
                  >
                    {isRowPending && pendingAction === "reject"
                      ? copy.rejecting
                      : copy.reject}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
