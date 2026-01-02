"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { buildLocalizedPath, type Locale } from "@/lib/i18n";

type RequestCard = {
  id: string;
  created_at: string;
  note: string | null;
  groups: {
    id: string;
    name: string | null;
    description: string | null;
  } | null;
  courts: {
    id: string;
    name: string | null;
    province: string | null;
  } | null;
};

type CourtRequestCopy = {
  empty: string;
  verify: string;
  reject: string;
  verifying: string;
  rejecting: string;
  rejectedNote: string;
  badge: string;
  submitted: string;
};

type CourtRequestListProps = {
  requests: RequestCard[];
  copy: CourtRequestCopy;
  locale: Locale;
};

function formatDate(value: string) {
  const date = new Date(value);
  return date.toISOString().replace("T", " ").slice(0, 16) + " UTC";
}

export function CourtRequestList({
  requests,
  copy,
  locale,
}: CourtRequestListProps) {
  const [items, setItems] = useState(requests);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleDecision = (id: string, status: "verified" | "rejected") => {
    setPendingId(id);
    startTransition(async () => {
      await fetch(`/api/court-groups/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      setItems((prev) => prev.filter((item) => item.id !== id));
      setPendingId(null);
    });
  };

  if (items.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
        {copy.empty}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((request) => (
        <article
          key={request.id}
          className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-100"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase text-slate-500">
                {copy.badge}
              </p>
              <h3 className="text-2xl font-semibold text-slate-900">
                {request.groups?.name ?? "Unnamed group"}
              </h3>
              <p className="text-sm text-slate-500">
                {copy.submitted} {formatDate(request.created_at)}
              </p>
            </div>
            <Link
              href={buildLocalizedPath(
                `/courts/${request.courts?.id ?? ""}`,
                locale,
              )}
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-500"
            >
              {request.courts?.name ??
                request.courts?.province ??
                "View court"}
            </Link>
          </div>
          {request.groups?.description && (
            <p className="mt-3 text-sm text-slate-600">
              {request.groups.description}
            </p>
          )}
          {request.note && (
            <p className="mt-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-2 text-xs text-slate-500">
              {copy.rejectedNote}: {request.note}
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => handleDecision(request.id, "verified")}
              disabled={isPending && pendingId === request.id}
              className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
            >
              {isPending && pendingId === request.id
                ? copy.verifying
                : copy.verify}
            </button>
            <button
              type="button"
              onClick={() => handleDecision(request.id, "rejected")}
              disabled={isPending && pendingId === request.id}
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-500 disabled:opacity-60"
            >
              {isPending && pendingId === request.id
                ? copy.rejecting
                : copy.reject}
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
