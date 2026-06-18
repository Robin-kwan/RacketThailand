"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  Eye,
  LoaderCircle,
  Pencil,
  Search,
  Trash2,
} from "lucide-react";
import { showToast } from "@/components/toaster";
import { ConfirmationDialog } from "@/components/confirmation-dialog";

export type AdminResourceDetail = {
  label: string;
  value: string;
};

export type AdminResourceSortKey = "item" | "details" | "status" | "actions";

export type AdminResourceRowAction = {
  key: string;
  label: string;
  pendingLabel?: string;
  confirmTitle?: string;
  confirmMessage?: string;
  confirmLabel?: string;
  endpoint: string;
  method?: "PATCH" | "POST";
  body?: Record<string, unknown>;
  tone?: "green" | "yellow" | "slate" | "rose";
  successMessage?: string;
  errorMessage?: string;
  nextStatusLabel?: string;
  nextStatusTone?: AdminResourceRow["statusTone"];
  nextActions?: AdminResourceRowAction[];
  nextSortValues?: Partial<Record<AdminResourceSortKey, string>>;
};

export type AdminResourceRow = {
  id: string;
  title: string;
  subtitle?: string;
  meta?: string[];
  details: AdminResourceDetail[];
  statusLabel?: string;
  statusTone?: "green" | "yellow" | "slate" | "rose";
  statusAction?: AdminResourceRowAction;
  sortValues?: Partial<Record<AdminResourceSortKey, string>>;
  viewHref: string;
  editHref: string;
  deleteEndpoint: string;
};

export type AdminResourceTableCopy = {
  searchLabel: string;
  searchPlaceholder: string;
  resultsLabel: string;
  headers: {
    item: string;
    details: string;
    status: string;
    actions: string;
  };
  view: string;
  edit: string;
  delete: string;
  deleting: string;
  cancel: string;
  confirmDelete: string;
  deleted: string;
  empty: string;
  error: string;
  noDetails: string;
};

type AdminResourceTableProps = {
  rows: AdminResourceRow[];
  copy: AdminResourceTableCopy;
};

function normalize(value: string | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function getStatusClass(tone: AdminResourceRow["statusTone"]) {
  switch (tone) {
    case "green":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "yellow":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "rose":
      return "border-rose-200 bg-rose-50 text-rose-800";
    case "slate":
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

function buildSearchText(row: AdminResourceRow) {
  return [
    row.title,
    row.subtitle,
    ...(row.meta ?? []),
    row.statusLabel,
    ...row.details.flatMap((detail) => [detail.label, detail.value]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function buildSortValue(row: AdminResourceRow, key: AdminResourceSortKey) {
  const explicitValue = row.sortValues?.[key];
  if (explicitValue) {
    return explicitValue;
  }

  switch (key) {
    case "item":
      return [row.title, row.subtitle, ...(row.meta ?? [])]
        .filter(Boolean)
        .join(" ");
    case "details":
      return row.details
        .flatMap((detail) => [detail.label, detail.value])
        .join(" ");
    case "status":
      return row.statusLabel ?? "";
    case "actions":
      return [
        row.statusAction?.label,
        row.viewHref,
        row.editHref,
      ]
        .filter(Boolean)
        .join(" ");
    default:
      return row.title;
  }
}

export function AdminResourceTable({ rows, copy }: AdminResourceTableProps) {
  const router = useRouter();
  const [items, setItems] = useState(rows);
  const [query, setQuery] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [pendingActionKey, setPendingActionKey] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminResourceRow | null>(
    null,
  );
  const [statusTarget, setStatusTarget] = useState<{
    row: AdminResourceRow;
    action: AdminResourceRowAction;
  } | null>(null);
  const [sortKey, setSortKey] = useState<AdminResourceSortKey>("item");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [isPending, startTransition] = useTransition();

  const filteredItems = useMemo(() => {
    const normalizedQuery = normalize(query);
    const matchedItems = normalizedQuery
      ? items.filter((row) => buildSearchText(row).includes(normalizedQuery))
      : items;

    return [...matchedItems].sort((left, right) => {
      const leftValue = buildSortValue(left, sortKey);
      const rightValue = buildSortValue(right, sortKey);
      const result = leftValue.localeCompare(rightValue, undefined, {
        numeric: true,
        sensitivity: "base",
      });
      return sortDirection === "asc" ? result : result * -1;
    });
  }, [items, query, sortDirection, sortKey]);

  const toggleSort = (nextKey: AdminResourceSortKey) => {
    if (sortKey === nextKey) {
      setSortDirection((previous) => (previous === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(nextKey);
    setSortDirection("asc");
  };

  const handleDelete = (row: AdminResourceRow) => {
    setPendingId(row.id);
    setPendingActionKey("delete");
    startTransition(async () => {
      const response = await fetch(row.deleteEndpoint, {
        method: "DELETE",
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message =
          typeof data?.error === "string" ? data.error : copy.error;
        showToast({ variant: "error", message });
        setPendingId(null);
        setPendingActionKey(null);
        setDeleteTarget(null);
        return;
      }

      setItems((previous) => previous.filter((item) => item.id !== row.id));
      showToast({ variant: "success", message: copy.deleted });
      setPendingId(null);
      setPendingActionKey(null);
      setDeleteTarget(null);
      router.refresh();
    });
  };

  const handleRowAction = (row: AdminResourceRow, action: AdminResourceRowAction) => {
    setPendingId(row.id);
    setPendingActionKey(action.key);
    startTransition(async () => {
      const response = await fetch(action.endpoint, {
        method: action.method ?? "POST",
        headers: action.body ? { "Content-Type": "application/json" } : undefined,
        body: action.body ? JSON.stringify(action.body) : undefined,
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message =
          typeof data?.error === "string"
            ? data.error
            : action.errorMessage ?? copy.error;
        showToast({ variant: "error", message });
        setPendingId(null);
        setPendingActionKey(null);
        setStatusTarget(null);
        return;
      }

      setItems((previous) =>
        previous.map((item) =>
          item.id === row.id
            ? {
                ...item,
                statusLabel: action.nextStatusLabel ?? item.statusLabel,
                statusTone: action.nextStatusTone ?? item.statusTone,
                statusAction: action.nextActions?.[0] ?? item.statusAction,
                sortValues: action.nextSortValues
                  ? { ...item.sortValues, ...action.nextSortValues }
                  : item.sortValues,
              }
            : item,
        ),
      );

      if (action.successMessage) {
        showToast({ variant: "success", message: action.successMessage });
      }
      setPendingId(null);
      setPendingActionKey(null);
      setStatusTarget(null);
      router.refresh();
    });
  };

  const hasItems = items.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <label className="block max-w-xl flex-1">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            {copy.searchLabel}
          </span>
          <span className="mt-2 flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 focus-within:border-slate-400 focus-within:bg-white">
            <Search
              className="h-4 w-4 flex-none text-slate-400"
              strokeWidth={1.8}
              aria-hidden
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={copy.searchPlaceholder}
              className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
            />
          </span>
        </label>
        <p className="text-sm font-semibold text-slate-600">
          {filteredItems.length.toLocaleString()} {copy.resultsLabel}
        </p>
      </div>

      {!hasItems ? (
        <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
          {copy.empty}
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="w-[30%] px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                    <button
                      type="button"
                      onClick={() => toggleSort("item")}
                      className="inline-flex items-center gap-1.5 transition hover:text-slate-900"
                    >
                      {copy.headers.item}
                      {sortKey === "item" ? (
                        sortDirection === "asc" ? (
                          <ChevronUp className="h-3.5 w-3.5" aria-hidden />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5" aria-hidden />
                        )
                      ) : (
                        <ArrowUpDown className="h-3.5 w-3.5" aria-hidden />
                      )}
                    </button>
                  </th>
                  <th className="w-[38%] px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                    <button
                      type="button"
                      onClick={() => toggleSort("details")}
                      className="inline-flex items-center gap-1.5 transition hover:text-slate-900"
                    >
                      {copy.headers.details}
                      {sortKey === "details" ? (
                        sortDirection === "asc" ? (
                          <ChevronUp className="h-3.5 w-3.5" aria-hidden />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5" aria-hidden />
                        )
                      ) : (
                        <ArrowUpDown className="h-3.5 w-3.5" aria-hidden />
                      )}
                    </button>
                  </th>
                  <th className="w-[14%] px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                    <button
                      type="button"
                      onClick={() => toggleSort("status")}
                      className="inline-flex items-center gap-1.5 transition hover:text-slate-900"
                    >
                      {copy.headers.status}
                      {sortKey === "status" ? (
                        sortDirection === "asc" ? (
                          <ChevronUp className="h-3.5 w-3.5" aria-hidden />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5" aria-hidden />
                        )
                      ) : (
                        <ArrowUpDown className="h-3.5 w-3.5" aria-hidden />
                      )}
                    </button>
                  </th>
                  <th className="w-[18%] px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">
                    <button
                      type="button"
                      onClick={() => toggleSort("actions")}
                      className="inline-flex items-center gap-1.5 transition hover:text-slate-900"
                    >
                      {copy.headers.actions}
                      {sortKey === "actions" ? (
                        sortDirection === "asc" ? (
                          <ChevronUp className="h-3.5 w-3.5" aria-hidden />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5" aria-hidden />
                        )
                      ) : (
                        <ArrowUpDown className="h-3.5 w-3.5" aria-hidden />
                      )}
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-5 py-10 text-center text-sm text-slate-600"
                    >
                      {copy.empty}
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((row) => {
                    const isDeleting =
                      isPending && pendingId === row.id && pendingActionKey === "delete";
                    return (
                      <tr
                        key={row.id}
                        className="align-top transition hover:bg-slate-50/70"
                      >
                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-900">
                            {row.title}
                          </p>
                          {row.subtitle && (
                            <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                              {row.subtitle}
                            </p>
                          )}
                          {row.meta && row.meta.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {row.meta.map((item) => (
                                <span
                                  key={item}
                                  className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-600"
                                >
                                  {item}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          {row.details.length === 0 ? (
                            <p className="text-sm text-slate-500">
                              {copy.noDetails}
                            </p>
                          ) : (
                            <dl className="grid gap-2 md:grid-cols-2">
                              {row.details.map((detail) => (
                                <div key={`${row.id}-${detail.label}`}>
                                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                                    {detail.label}
                                  </dt>
                                  <dd
                                    className="mt-0.5 max-w-[18rem] truncate text-sm text-slate-700"
                                    title={detail.value}
                                  >
                                    {detail.value}
                                  </dd>
                                </div>
                              ))}
                            </dl>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          {row.statusLabel ? (
                            row.statusAction ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setStatusTarget({
                                    row,
                                    action: row.statusAction!,
                                  })
                                }
                                disabled={
                                  isPending &&
                                  pendingId === row.id &&
                                  pendingActionKey === row.statusAction.key
                                }
                                className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold transition hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-60 ${getStatusClass(row.statusTone)}`}
                              >
                                {isPending &&
                                pendingId === row.id &&
                                pendingActionKey === row.statusAction.key ? (
                                  <LoaderCircle
                                    className="mr-1 h-3.5 w-3.5 animate-spin"
                                    strokeWidth={1.8}
                                    aria-hidden
                                  />
                                ) : null}
                                {row.statusLabel}
                              </button>
                            ) : (
                              <span
                                className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusClass(row.statusTone)}`}
                              >
                                {row.statusLabel}
                              </span>
                            )
                          ) : (
                            <span className="text-sm text-slate-500">-</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex flex-wrap justify-end gap-2">
                            <Link
                              href={row.viewHref}
                              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                            >
                              <Eye
                                className="h-3.5 w-3.5"
                                strokeWidth={1.8}
                                aria-hidden
                              />
                              {copy.view}
                            </Link>
                            <Link
                              href={row.editHref}
                              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                            >
                              <Pencil
                                className="h-3.5 w-3.5"
                                strokeWidth={1.8}
                                aria-hidden
                              />
                              {copy.edit}
                            </Link>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(row)}
                              disabled={isDeleting}
                              className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                            >
                              {isDeleting ? (
                                <LoaderCircle
                                  className="h-3.5 w-3.5 animate-spin"
                                  strokeWidth={1.8}
                                  aria-hidden
                                />
                              ) : (
                                <Trash2
                                  className="h-3.5 w-3.5"
                                  strokeWidth={1.8}
                                  aria-hidden
                                />
                              )}
                              {isDeleting ? copy.deleting : copy.delete}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <ConfirmationDialog
        open={Boolean(deleteTarget)}
        title={copy.delete}
        message={
          deleteTarget
            ? copy.confirmDelete
                .replace("%ITEM%", deleteTarget.title)
                .replace("{item}", deleteTarget.title)
            : ""
        }
        confirmLabel={copy.delete}
        cancelLabel={copy.cancel}
        loading={Boolean(deleteTarget && pendingId === deleteTarget.id)}
        onConfirm={() => {
          if (deleteTarget) {
            handleDelete(deleteTarget);
          }
        }}
        onClose={() => setDeleteTarget(null)}
      />
      <ConfirmationDialog
        open={Boolean(statusTarget)}
        title={statusTarget?.action.confirmTitle ?? statusTarget?.action.label ?? ""}
        message={statusTarget?.action.confirmMessage ?? ""}
        confirmLabel={
          statusTarget?.action.confirmLabel ?? statusTarget?.action.label ?? ""
        }
        cancelLabel={copy.cancel}
        loading={Boolean(
          statusTarget &&
            pendingId === statusTarget.row.id &&
            pendingActionKey === statusTarget.action.key,
        )}
        onConfirm={() => {
          if (statusTarget) {
            handleRowAction(statusTarget.row, statusTarget.action);
          }
        }}
        onClose={() => setStatusTarget(null)}
      />
    </div>
  );
}
