"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, LoaderCircle, Pencil, Search, Trash2 } from "lucide-react";
import { showToast } from "@/components/toaster";

export type AdminResourceDetail = {
  label: string;
  value: string;
};

export type AdminResourceRow = {
  id: string;
  title: string;
  subtitle?: string;
  meta?: string[];
  details: AdminResourceDetail[];
  statusLabel?: string;
  statusTone?: "green" | "yellow" | "slate" | "rose";
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

export function AdminResourceTable({ rows, copy }: AdminResourceTableProps) {
  const router = useRouter();
  const [items, setItems] = useState(rows);
  const [query, setQuery] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredItems = useMemo(() => {
    const normalizedQuery = normalize(query);
    if (!normalizedQuery) return items;
    return items.filter((row) => buildSearchText(row).includes(normalizedQuery));
  }, [items, query]);

  const handleDelete = (row: AdminResourceRow) => {
    const message = copy.confirmDelete
      .replace("%ITEM%", row.title)
      .replace("{item}", row.title);
    if (!window.confirm(message)) return;

    setError(null);
    setPendingId(row.id);
    startTransition(async () => {
      const response = await fetch(row.deleteEndpoint, {
        method: "DELETE",
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message =
          typeof data?.error === "string" ? data.error : copy.error;
        setError(message);
        showToast({ variant: "error", message });
        setPendingId(null);
        return;
      }

      setItems((previous) => previous.filter((item) => item.id !== row.id));
      showToast({ variant: "success", message: copy.deleted });
      setPendingId(null);
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

      {error && (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </p>
      )}

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
                    {copy.headers.item}
                  </th>
                  <th className="w-[38%] px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                    {copy.headers.details}
                  </th>
                  <th className="w-[14%] px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                    {copy.headers.status}
                  </th>
                  <th className="w-[18%] px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">
                    {copy.headers.actions}
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
                    const isDeleting = isPending && pendingId === row.id;
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
                                  <dd className="mt-0.5 text-sm text-slate-700">
                                    {detail.value}
                                  </dd>
                                </div>
                              ))}
                            </dl>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          {row.statusLabel ? (
                            <span
                              className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusClass(row.statusTone)}`}
                            >
                              {row.statusLabel}
                            </span>
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
                              onClick={() => handleDelete(row)}
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
    </div>
  );
}
