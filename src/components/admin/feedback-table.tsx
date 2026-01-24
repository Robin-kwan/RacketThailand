"use client";

import { useState, useTransition } from "react";
import { BaseCard } from "@/components/base-card";

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
    <BaseCard className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-sm text-[var(--rt-primary-text)]">
          <thead className="bg-[rgb(var(--rt-primary-rgb)/0.85)] text-left text-xs font-semibold uppercase text-[rgb(var(--rt-primary-text-rgb)/0.8)]">
            <tr>
              <th className="border-b border-[var(--rt-primary-border)] px-6 py-3">
                {copy.headers.subject}
              </th>
              <th className="border-b border-[rgb(var(--rt-primary-border-rgb)/0.7)] px-6 py-3">
                {copy.headers.reporter}
              </th>
              <th className="border-b border-[rgb(var(--rt-primary-border-rgb)/0.7)] px-6 py-3">
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
                ? "bg-[rgb(var(--rt-primary-rgb)/0.35)]"
                : "bg-[rgb(var(--rt-primary-rgb)/0.15)]";
              return (
                <tr
                  key={row.id}
                  className={`${rowBackground} border-t border-[var(--rt-primary-border)]`}
                >
                 <td className="align-top px-6 py-5">
                    <div className="space-y-2">
                      <p className="text-base font-semibold text-[var(--rt-primary-text)]">
                        {row.subject?.trim() || copy.noSubject}
                      </p>
                      <p className="text-sm rt-text-muted line-clamp-2">
                        {row.message?.trim() || copy.noMessage}
                      </p>
                      <div className="flex flex-wrap gap-2 text-[11px] font-semibold uppercase rt-text-muted">
                        {row.type && (
                          <span className="rounded-full border border-[rgb(var(--rt-primary-text-rgb)/0.2)] bg-[rgb(var(--rt-primary-soft-rgb)/0.6)] px-2 py-0.5 text-[var(--rt-primary-text)]">
                            {copy.typeLabel}: {row.type}
                          </span>
                        )}
                        {row.status && (
                          <span className="rounded-full border border-[rgb(var(--rt-primary-text-rgb)/0.2)] bg-[rgb(var(--rt-primary-soft-rgb)/0.6)] px-2 py-0.5 text-[var(--rt-primary-text)]">
                            {copy.statusLabel}: {row.status}
                          </span>
                        )}
                        {row.priority && (
                          <span className="rounded-full border border-[rgb(var(--rt-primary-text-rgb)/0.2)] bg-[rgb(var(--rt-primary-soft-rgb)/0.6)] px-2 py-0.5 text-[var(--rt-primary-text)]">
                            {copy.priorityLabel}: {row.priority}
                          </span>
                        )}
                        <span
                          className={`rounded-full px-2 py-0.5 ${
                            row.checked
                              ? "border border-[rgb(var(--rt-primary-text-rgb)/0.3)] bg-[rgb(var(--rt-primary-soft-rgb)/0.4)] text-[var(--rt-primary-text)]"
                              : "border border-[rgb(var(--rt-primary-text-rgb)/0.3)] bg-[rgb(var(--rt-primary-rgb)/0.35)] text-[var(--rt-primary-text)]"
                          }`}
                        >
                          {row.checked ? copy.checked : copy.unchecked}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="align-top px-6 py-5 text-sm text-[var(--rt-primary-text)]">
                    <p className="font-semibold text-[var(--rt-primary-text)]">
                      {row.reporterName}
                    </p>
                    {row.reporterEmail && (
                      <p className="rt-text-muted">{row.reporterEmail}</p>
                    )}
                  </td>
                  <td className="align-top px-6 py-5 text-sm rt-text-muted">
                    {formatDate(row.createdAt)}
                  </td>
                  <td className="align-top px-6 py-5 text-right">
                    <button
                      type="button"
                      onClick={() => toggleChecked(row.id, !row.checked)}
                      disabled={isPending && pendingId === row.id}
                      className={`rt-btn-primary px-4 py-2 text-sm ${
                        row.checked
                          ? "bg-transparent text-[var(--rt-primary-text)] hover:bg-[rgb(var(--rt-primary-soft-rgb)/0.3)]"
                          : ""
                      }`}
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
    </BaseCard>
  );

  if (items.length === 0) {
    return (
      <div className="space-y-4">
        {error && (
          <p className="rounded-2xl border border-rose-500/40 bg-rose-500/20 px-4 py-3 text-sm text-rose-100">
            {error}
          </p>
        )}
        <p className="rounded-2xl border border-dashed border-[rgb(var(--rt-primary-border-rgb)/0.8)] bg-[rgb(var(--rt-primary-soft-rgb)/0.6)] p-6 text-sm text-[var(--rt-primary-text)]">
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
