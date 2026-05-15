"use client";

import { useState, useTransition } from "react";
import { showToast } from "@/components/toaster";
import type { JoinRequestStatus } from "@/components/casual-plays/casual-play-join-request-form";

export type CasualPlayJoinRequestRow = {
  id: string;
  requesterName: string;
  contactName: string | null;
  phone: string | null;
  lineId: string | null;
  message: string | null;
  status: JoinRequestStatus;
  createdAt: string;
};

export type CasualPlayJoinRequestsManagerCopy = {
  title: string;
  subtitle: string;
  empty: string;
  requester: string;
  contact: string;
  message: string;
  submitted: string;
  accept: string;
  reject: string;
  accepting: string;
  rejecting: string;
  statusPending: string;
  statusAccepted: string;
  statusRejected: string;
  full: string;
  error: string;
};

type CasualPlayJoinRequestsManagerProps = {
  playId: string;
  requests: CasualPlayJoinRequestRow[];
  maxPlayers?: number | null;
  copy: CasualPlayJoinRequestsManagerCopy;
  locale: "th" | "en";
};

function getStatusLabel(
  status: JoinRequestStatus,
  copy: CasualPlayJoinRequestsManagerCopy,
) {
  if (status === "accepted") return copy.statusAccepted;
  if (status === "rejected") return copy.statusRejected;
  return copy.statusPending;
}

function getStatusClass(status: JoinRequestStatus) {
  if (status === "accepted") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }
  if (status === "rejected") {
    return "border-rose-200 bg-rose-50 text-rose-800";
  }
  return "border-amber-200 bg-amber-50 text-amber-800";
}

export function CasualPlayJoinRequestsManager({
  playId,
  requests,
  maxPlayers = null,
  copy,
  locale,
}: CasualPlayJoinRequestsManagerProps) {
  const [items, setItems] = useState(requests);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<"accept" | "reject" | null>(
    null,
  );
  const [isPending, startTransition] = useTransition();
  const playerLimit =
    typeof maxPlayers === "number" &&
    Number.isFinite(maxPlayers) &&
    maxPlayers > 0
      ? maxPlayers
      : null;
  const acceptedCount = items.filter((item) => item.status === "accepted").length;
  const playerCount = playerLimit === null ? 0 : acceptedCount + 1;
  const isFull = playerLimit !== null && playerCount >= playerLimit;

  const updateRequest = (requestId: string, action: "accept" | "reject") => {
    setPendingId(requestId);
    setPendingAction(action);
    startTransition(async () => {
      const response = await fetch(
        `/api/casual-plays/${playId}/join-requests/${requestId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        showToast({
          variant: "error",
          message: typeof data?.error === "string" ? data.error : copy.error,
        });
        setPendingId(null);
        setPendingAction(null);
        return;
      }
      const nextStatus = action === "accept" ? "accepted" : "rejected";
      setItems((previous) =>
        previous.map((item) =>
          item.id === requestId ? { ...item, status: nextStatus } : item,
        ),
      );
      setPendingId(null);
      setPendingAction(null);
    });
  };

  return (
    <section className="rounded-[32px] border border-slate-200 bg-white p-6">
      <h2 className="text-xl font-semibold text-[var(--foreground)]">
        {copy.title}
      </h2>
      <p className="mt-1 text-sm text-[rgb(var(--foreground-rgb)/0.7)]">
        {copy.subtitle}
      </p>
      {playerLimit !== null && (
        <p className="mt-3 inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
          {locale === "th" ? "ผู้เล่น" : "Players"}: {playerCount}/
          {playerLimit}
          {isFull && (
            <span className="ml-2 text-rose-700">{copy.full}</span>
          )}
        </p>
      )}

      {items.length === 0 ? (
        <p className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-600">
          {copy.empty}
        </p>
      ) : (
        <div className="mt-5 space-y-3">
          {items.map((item) => {
            const isRowPending = isPending && pendingId === item.id;
            const acceptLabel = isFull
              ? copy.full
              : isRowPending && pendingAction === "accept"
                ? copy.accepting
                : copy.accept;
            const contactParts = [
              item.contactName,
              item.phone ? `Phone: ${item.phone}` : null,
              item.lineId ? `LINE: ${item.lineId}` : null,
            ].filter(Boolean);
            return (
              <article
                key={item.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      {copy.requester}
                    </p>
                    <p className="mt-1 text-base font-semibold text-slate-900">
                      {item.requesterName}
                    </p>
                  </div>
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClass(item.status)}`}
                  >
                    {getStatusLabel(item.status, copy)}
                  </span>
                </div>
                <div className="mt-4 grid gap-3 text-sm text-slate-700 md:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      {copy.contact}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap">
                      {contactParts.join(" · ") || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      {copy.submitted}
                    </p>
                    <p className="mt-1">
                      {new Date(item.createdAt).toLocaleString(
                        locale === "th" ? "th-TH" : "en-US",
                      )}
                    </p>
                  </div>
                </div>
                {item.message && (
                  <div className="mt-4 text-sm text-slate-700">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      {copy.message}
                    </p>
                    <p className="mt-1 whitespace-pre-line">{item.message}</p>
                  </div>
                )}
                {item.status === "pending" && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => updateRequest(item.id, "accept")}
                      disabled={isRowPending || isFull}
                      className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-400"
                    >
                      {acceptLabel}
                    </button>
                    <button
                      type="button"
                      onClick={() => updateRequest(item.id, "reject")}
                      disabled={isRowPending}
                      className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-500 disabled:cursor-not-allowed disabled:bg-slate-400 disabled:text-white"
                    >
                      {isRowPending && pendingAction === "reject"
                        ? copy.rejecting
                        : copy.reject}
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
