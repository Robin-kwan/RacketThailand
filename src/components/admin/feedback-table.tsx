"use client";

import Link from "next/link";
import { Fragment, useState, useTransition } from "react";
import { ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { showToast } from "@/components/toaster";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { formatDateForDisplay } from "@/lib/date-format";

export type AdminFeedbackRow = {
  id: string;
  subject: string | null;
  message: string | null;
  type: string | null;
  status: string | null;
  priority: string | null;
  checked: boolean;
  createdAt: string;
  reporterName: string;
  reporterEmail?: string | null;
  reporterId: string | null;
  listingType: "court" | "group" | null;
  listingId: string | null;
  listingName: string | null;
  listingHref: string | null;
};

export type FeedbackTableCopy = {
  headers: {
    subject: string;
    reporter: string;
    submitted: string;
    status: string;
    actions: string;
  };
  sortBy: string;
  sortByDate: string;
  newest: string;
  oldest: string;
  sortByStatus: string;
  statusPending: string;
  statusInReview: string;
  statusResolved: string;
  statusDismissed: string;
  noSubject: string;
  noMessage: string;
  messageLabel: string;
  typeLabel: string;
  statusLabel: string;
  priorityLabel: string;
  markRead: string;
  markUnread: string;
  mark: string;
  checked: string;
  unchecked: string;
  changeStatus: string;
  updating: string;
  empty: string;
  error: string;
  listing: string;
  viewListing: string;
  assignToReporter: string;
  assignConfirmTitle: string;
  assignConfirmMessage: string;
  assignConfirm: string;
  cancel: string;
  assignmentSuccess: string;
  assignmentError: string;
  details: string;
  hideDetails: string;
};

type FeedbackTableProps = {
  rows: AdminFeedbackRow[];
  copy: FeedbackTableCopy;
};

type SortType = "date-desc" | "date-asc" | "status";

function getStatusSelectClass(status: string | null): string {
  if (!status)
    return "bg-slate-50 text-slate-900 border-slate-300 hover:border-slate-400";
  switch (status) {
    case "open":
      return "bg-yellow-50 text-yellow-900 border-yellow-300 hover:border-yellow-400";
    case "in_review":
      return "bg-blue-50 text-blue-900 border-blue-300 hover:border-blue-400";
    case "resolved":
      return "bg-green-50 text-green-900 border-green-300 hover:border-green-400";
    case "dismissed":
      return "bg-slate-50 text-slate-700 border-slate-300 hover:border-slate-400";
    default:
      return "bg-slate-50 text-slate-900 border-slate-300 hover:border-slate-400";
  }
}

export function AdminFeedbackTable({ rows, copy }: FeedbackTableProps) {
  const [items, setItems] = useState(rows);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [sortType, setSortType] = useState<SortType>("date-desc");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [claimToAssign, setClaimToAssign] = useState<AdminFeedbackRow | null>(
    null,
  );

  const sortedItems = [...items].sort((a, b) => {
    if (sortType === "date-desc") {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    if (sortType === "date-asc") {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    }
    if (sortType === "status") {
      const statusOrder = { open: 0, in_review: 1, resolved: 2, dismissed: 3 };
      const statusA = statusOrder[a.status as keyof typeof statusOrder] ?? 4;
      const statusB = statusOrder[b.status as keyof typeof statusOrder] ?? 4;
      return statusA - statusB;
    }
    return 0;
  });

  const updateStatus = (rowId: string, newStatus: string) => {
    setPendingId(rowId);
    startTransition(async () => {
      const response = await fetch(`/api/feedback/${rowId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!response.ok) {
        showToast({ variant: "error", message: copy.error });
        setPendingId(null);
        return;
      }
      setItems((previous) =>
        previous.map((row) =>
          row.id === rowId ? { ...row, status: newStatus } : row,
        ),
      );
      setPendingId(null);
    });
  };

  const toggleChecked = (rowId: string, nextState: boolean) => {
    setPendingId(rowId);
    startTransition(async () => {
      const response = await fetch(`/api/feedback/${rowId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checked: nextState }),
      });
      if (!response.ok) {
        showToast({ variant: "error", message: copy.error });
        setPendingId(null);
        return;
      }
      setItems((previous) =>
        previous.map((row) =>
          row.id === rowId ? { ...row, checked: nextState } : row,
        ),
      );
      setPendingId(null);
    });
  };

  const assignOwnership = async () => {
    if (!claimToAssign) return;
    const claim = claimToAssign;
    setPendingId(claim.id);
    try {
      const response = await fetch(
        `/api/feedback/${claim.id}/approve-ownership`,
        { method: "POST" },
      );
      if (!response.ok) {
        throw new Error(copy.assignmentError);
      }
      setItems((previous) =>
        previous.map((row) =>
          row.id === claim.id
            ? { ...row, status: "resolved", checked: true }
            : row.type === "ownership_claim" &&
                row.listingType === claim.listingType &&
                row.listingId === claim.listingId &&
                row.status !== "resolved" &&
                row.status !== "dismissed"
              ? { ...row, status: "dismissed", checked: true }
            : row,
        ),
      );
      setClaimToAssign(null);
      showToast({ variant: "success", message: copy.assignmentSuccess });
    } catch {
      showToast({ variant: "error", message: copy.assignmentError });
    } finally {
      setPendingId(null);
    }
  };

  if (items.length === 0) {
    return (
      <div className="space-y-3">
        <div className="rounded border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
          <p className="text-sm text-slate-600">{copy.empty}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-slate-700">
          {copy.sortBy}
        </span>
        <span className="relative inline-flex">
          <select
            value={sortType}
            onChange={(e) => setSortType(e.target.value as SortType)}
            className="cursor-pointer appearance-none rounded border border-slate-300 bg-white px-3 py-1.5 pr-9 text-xs font-medium text-slate-900 transition hover:border-slate-400"
          >
            <option value="date-desc">
              {copy.sortByDate} ({copy.newest})
            </option>
            <option value="date-asc">
              {copy.sortByDate} ({copy.oldest})
            </option>
            <option value="status">{copy.sortByStatus}</option>
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500"
            strokeWidth={1.8}
            aria-hidden
          />
        </span>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-900 w-2/5">
                  {copy.headers.subject}
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-900 w-1/5">
                  {copy.headers.reporter}
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-900 w-1/6">
                  {copy.headers.submitted}
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-900 w-1/6">
                  {copy.headers.status}
                </th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-slate-900 w-1/12">
                  {copy.headers.actions}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {sortedItems.map((row) => (
                <Fragment key={row.id}>
                  <tr className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedId((current) =>
                            current === row.id ? null : row.id,
                          )
                        }
                        className="flex w-full items-start justify-between gap-3 text-left"
                        aria-expanded={expandedId === row.id}
                      >
                        <span>
                          <span className="line-clamp-1 text-sm font-semibold text-slate-900">
                            {row.subject?.trim() || copy.noSubject}
                          </span>
                          <span className="mt-1 block text-xs font-medium text-slate-500">
                            {expandedId === row.id
                              ? copy.hideDetails
                              : copy.details}
                          </span>
                        </span>
                        {expandedId === row.id ? (
                          <ChevronUp
                            className="mt-0.5 size-4 shrink-0 text-slate-400"
                            aria-hidden
                          />
                        ) : (
                          <ChevronDown
                            className="mt-0.5 size-4 shrink-0 text-slate-400"
                            aria-hidden
                          />
                        )}
                      </button>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {row.reporterName}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm text-slate-600 whitespace-nowrap">
                        {formatDateForDisplay(row.createdAt)}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      {isPending && pendingId === row.id ? (
                        <span className="text-xs text-slate-500 font-medium">
                          {copy.updating}
                        </span>
                      ) : (
                        <span className="relative inline-flex">
                          <select
                            value={row.status || "open"}
                            onChange={(e) =>
                              updateStatus(row.id, e.target.value)
                            }
                            className={`cursor-pointer appearance-none rounded border px-2.5 py-1.5 pr-8 text-xs font-medium transition ${getStatusSelectClass(row.status)}`}
                          >
                            <option value="open">{copy.statusPending}</option>
                            <option value="in_review">
                              {copy.statusInReview}
                            </option>
                            <option value="resolved">
                              {copy.statusResolved}
                            </option>
                            <option value="dismissed">
                              {copy.statusDismissed}
                            </option>
                          </select>
                          <ChevronDown
                            className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-current opacity-65"
                            strokeWidth={1.8}
                            aria-hidden
                          />
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => toggleChecked(row.id, !row.checked)}
                        disabled={isPending && pendingId === row.id}
                        className={`text-xs font-medium px-2.5 py-1.5 rounded transition ${
                          row.checked
                            ? "bg-slate-200 text-slate-700 hover:bg-slate-300"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                        aria-pressed={row.checked}
                      >
                        {isPending && pendingId === row.id
                          ? "..."
                          : row.checked
                            ? "✓"
                            : copy.mark}
                      </button>
                    </td>
                  </tr>
                  {expandedId === row.id ? (
                    <tr className="bg-slate-50/70">
                      <td colSpan={5} className="px-5 py-5">
                        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto]">
                          <div className="min-w-0 space-y-4">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                {copy.typeLabel}
                              </p>
                              <p className="mt-1 text-sm font-semibold text-slate-800">
                                {row.type || "general"}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                {copy.messageLabel}
                              </p>
                              <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                                {row.message?.trim() || copy.noMessage}
                              </p>
                            </div>
                            {row.listingHref ? (
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                  {copy.listing}
                                </p>
                                <Link
                                  href={row.listingHref}
                                  className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--rt-primary)] hover:underline"
                                >
                                  {row.listingName || copy.viewListing}
                                  <ExternalLink
                                    className="size-3.5"
                                    aria-hidden
                                  />
                                </Link>
                              </div>
                            ) : null}
                          </div>
                          {row.type === "ownership_claim" &&
                          row.reporterId &&
                          row.listingId &&
                          row.listingType &&
                          row.status !== "resolved" &&
                          row.status !== "dismissed" ? (
                            <button
                              type="button"
                              onClick={() => setClaimToAssign(row)}
                              disabled={pendingId === row.id}
                              className="rt-btn-primary self-start px-4 py-2.5 text-sm disabled:opacity-50"
                            >
                              {copy.assignToReporter}
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <ConfirmationDialog
        open={Boolean(claimToAssign)}
        title={copy.assignConfirmTitle}
        message={copy.assignConfirmMessage}
        confirmLabel={copy.assignConfirm}
        cancelLabel={copy.cancel}
        loading={Boolean(claimToAssign && pendingId === claimToAssign.id)}
        onConfirm={assignOwnership}
        onClose={() => setClaimToAssign(null)}
      />
    </div>
  );
}
