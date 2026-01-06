"use client";

import { useState, useTransition } from "react";

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
    actions: string;
  };
  noSubject: string;
  noMessage: string;
  typeLabel: string;
  statusLabel: string;
  priorityLabel: string;
  markRead: string;
  markUnread: string;
  checked: string;
  unchecked: string;
  empty: string;
  error: string;
};

type FeedbackTableProps = {
  rows: AdminFeedbackRow[];
  copy: FeedbackTableCopy;
};

function formatDate(value: string) {
  const date = new Date(value);
  return date.toLocaleString();
}

export function AdminFeedbackTable({ rows, copy }: FeedbackTableProps) {
  const [items, setItems] = useState(rows);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const toggleChecked = (rowId: string, nextState: boolean) => {
    setPendingId(rowId);
    setError(null);
    startTransition(async () => {
      const response = await fetch(`/api/feedback/${rowId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checked: nextState }),
      });
      if (!response.ok) {
        setError(copy.error);
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

  const renderTable = () => (
    <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 text-slate-100 shadow-2xl shadow-slate-900/40">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-sm text-slate-100">
          <thead className="bg-slate-900/70 text-left text-xs font-semibold uppercase text-slate-400">
            <tr>
              <th className="px-6 py-3 border-b border-slate-800">
                {copy.headers.subject}
              </th>
              <th className="px-6 py-3 border-b border-slate-800">
                {copy.headers.reporter}
              </th>
              <th className="px-6 py-3 border-b border-slate-800">
                {copy.headers.submitted}
              </th>
              <th className="px-6 py-3 text-right">
                {copy.headers.actions}
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((row) => {
              const rowBackground = row.checked
                ? "bg-slate-900/40"
                : "bg-slate-900/20";
              return (
                <tr
                  key={row.id}
                  className={`${rowBackground} border-t border-slate-800`}
                >
                  <td className="align-top px-6 py-5">
                    <div className="space-y-2">
                      <p className="text-base font-semibold text-white">
                        {row.subject?.trim() || copy.noSubject}
                      </p>
                      <p className="text-sm text-slate-400 line-clamp-2">
                        {row.message?.trim() || copy.noMessage}
                      </p>
                      <div className="flex flex-wrap gap-2 text-[11px] font-semibold uppercase text-slate-400">
                        {row.type && (
                          <span className="rounded-full bg-slate-800 px-2 py-0.5 text-slate-200">
                            {copy.typeLabel}: {row.type}
                          </span>
                        )}
                        {row.status && (
                          <span className="rounded-full bg-slate-800 px-2 py-0.5 text-slate-200">
                            {copy.statusLabel}: {row.status}
                          </span>
                        )}
                        {row.priority && (
                          <span className="rounded-full bg-slate-800 px-2 py-0.5 text-slate-200">
                            {copy.priorityLabel}: {row.priority}
                          </span>
                        )}
                        <span
                          className={`rounded-full px-2 py-0.5 ${
                            row.checked
                              ? "bg-slate-800 text-slate-300"
                              : "bg-emerald-500/30 text-emerald-100"
                          }`}
                        >
                          {row.checked ? copy.checked : copy.unchecked}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="align-top px-6 py-5 text-sm text-slate-200">
                    <p className="font-semibold text-white">
                      {row.reporterName}
                    </p>
                    {row.reporterEmail && (
                      <p className="text-slate-400">{row.reporterEmail}</p>
                    )}
                  </td>
                  <td className="align-top px-6 py-5 text-sm text-slate-400">
                    {formatDate(row.createdAt)}
                  </td>
                  <td className="align-top px-6 py-5 text-right">
                    <button
                      type="button"
                      onClick={() => toggleChecked(row.id, !row.checked)}
                      disabled={isPending && pendingId === row.id}
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                        row.checked
                          ? "border border-slate-300 text-slate-700 hover:border-slate-500"
                          : "bg-slate-900 text-white hover:bg-slate-800"
                      } disabled:bg-slate-500 disabled:text-white disabled:border-slate-500 disabled:cursor-not-allowed`}
                      aria-pressed={row.checked}
                    >
                      {isPending && pendingId === row.id
                        ? "…"
                        : row.checked
                          ? copy.markUnread
                          : copy.markRead}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  if (items.length === 0) {
    return (
      <div className="space-y-4">
        {error && (
          <p className="rounded-2xl border border-rose-500/40 bg-rose-500/20 px-4 py-3 text-sm text-rose-100">
            {error}
          </p>
        )}
        <p className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-300">
          {copy.empty}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-2xl border border-rose-500/40 bg-rose-500/20 px-4 py-3 text-sm text-rose-100">
          {error}
        </p>
      )}
      {renderTable()}
    </div>
  );
}
