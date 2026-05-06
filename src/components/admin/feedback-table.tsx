"use client";

import { useState, useTransition } from "react";
import { showToast } from "@/components/toaster";

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
  sortByStatus: string;
  statusPending: string;
  statusInReview: string;
  statusResolved: string;
  statusDismissed: string;
  noSubject: string;
  noMessage: string;
  typeLabel: string;
  statusLabel: string;
  priorityLabel: string;
  markRead: string;
  markUnread: string;
  checked: string;
  unchecked: string;
  changeStatus: string;
  updating: string;
  empty: string;
  error: string;
};

type FeedbackTableProps = {
  rows: AdminFeedbackRow[];
  copy: FeedbackTableCopy;
};

type SortType = "date-desc" | "date-asc" | "status";

function getStatusSelectClass(status: string | null): string {
  if (!status) return "bg-slate-50 text-slate-900 border-slate-300 hover:border-slate-400";
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

  if (items.length === 0) {
    return (
      <div className="space-y-3">
        <div className="rounded border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
          <p className="text-sm text-slate-600">
            {copy.empty}
          </p>
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
        <select
          value={sortType}
          onChange={(e) => setSortType(e.target.value as SortType)}
          className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-900 transition hover:border-slate-400"
        >
          <option value="date-desc">{copy.sortByDate} (Newest)</option>
          <option value="date-asc">{copy.sortByDate} (Oldest)</option>
          <option value="status">{copy.sortByStatus}</option>
        </select>
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
                <tr
                  key={row.id}
                  className="hover:bg-slate-50/50 transition-colors"
                >
                  <td className="px-5 py-4">
                    <p className="text-sm font-semibold text-slate-900 line-clamp-1">
                      {row.subject?.trim() || copy.noSubject}
                    </p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {row.reporterName}
                    </p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-sm text-slate-600 whitespace-nowrap">
                      {new Date(row.createdAt).toLocaleDateString()}
                    </p>
                  </td>
                  <td className="px-5 py-4">
                    {isPending && pendingId === row.id ? (
                      <span className="text-xs text-slate-500 font-medium">{copy.updating}</span>
                    ) : (
                      <select
                        value={row.status || "open"}
                        onChange={(e) => updateStatus(row.id, e.target.value)}
                        className={`text-xs font-medium rounded border px-2.5 py-1.5 transition appearance-none cursor-pointer ${getStatusSelectClass(row.status)}`}
                      >
                        <option value="open">{copy.statusPending}</option>
                        <option value="in_review">{copy.statusInReview}</option>
                        <option value="resolved">{copy.statusResolved}</option>
                        <option value="dismissed">{copy.statusDismissed}</option>
                      </select>
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
                        ? "…"
                        : row.checked
                          ? "✓"
                          : "Mark"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
