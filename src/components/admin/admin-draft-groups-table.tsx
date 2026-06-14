"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Eye,
  LoaderCircle,
  Pencil,
  Search,
  Trash2,
} from "lucide-react";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { showToast } from "@/components/toaster";

export type DraftGroupRow = {
  id: string;
  title: string;
  subtitle?: string;
  meta?: string[];
  missingCourt?: boolean;
  details: Array<{
    label: string;
    value: string;
  }>;
  statusLabel: string;
  viewHref: string;
  editHref: string;
  publishEndpoint: string;
  deleteEndpoint: string;
};

type AdminDraftGroupsTableProps = {
  rows: DraftGroupRow[];
};

function normalize(value: string | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function buildSearchText(row: DraftGroupRow) {
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

export function AdminDraftGroupsTable({
  rows,
}: AdminDraftGroupsTableProps) {
  const router = useRouter();
  const [items, setItems] = useState(rows);
  const [query, setQuery] = useState("");
  const [pendingPublishId, setPendingPublishId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DraftGroupRow | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredItems = useMemo(() => {
    const normalizedQuery = normalize(query);
    if (!normalizedQuery) return items;
    return items.filter((row) => buildSearchText(row).includes(normalizedQuery));
  }, [items, query]);

  const handlePublish = (row: DraftGroupRow) => {
    setPendingPublishId(row.id);
    startTransition(async () => {
      const response = await fetch(row.publishEndpoint, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "published" }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        showToast({
          variant: "error",
          message:
            typeof data?.error === "string"
              ? data.error
              : "Unable to display this draft right now.",
        });
        setPendingPublishId(null);
        return;
      }

      setItems((previous) => previous.filter((item) => item.id !== row.id));
      showToast({
        variant: "success",
        message: "Draft is now visible on the website.",
      });
      setPendingPublishId(null);
      router.refresh();
    });
  };

  const handleDelete = (row: DraftGroupRow) => {
    setPendingDeleteId(row.id);
    startTransition(async () => {
      const response = await fetch(row.deleteEndpoint, {
        method: "DELETE",
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        showToast({
          variant: "error",
          message:
            typeof data?.error === "string"
              ? data.error
              : "Unable to delete this draft right now.",
        });
        setPendingDeleteId(null);
        setDeleteTarget(null);
        return;
      }

      setItems((previous) => previous.filter((item) => item.id !== row.id));
      showToast({ variant: "success", message: "Draft deleted." });
      setPendingDeleteId(null);
      setDeleteTarget(null);
      router.refresh();
    });
  };

  const hasItems = items.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <label className="block max-w-xl flex-1">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Search
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
              placeholder="Search draft groups, venue, contact, or notes"
              className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
            />
          </span>
        </label>
        <p className="text-sm font-semibold text-slate-600">
          {filteredItems.length.toLocaleString()} drafts
        </p>
      </div>

      {!hasItems ? (
        <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
          No draft groups are waiting for review.
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="w-[30%] px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Item
                  </th>
                  <th className="w-[36%] px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Details
                  </th>
                  <th className="w-[12%] px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Status
                  </th>
                  <th className="w-[22%] px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Actions
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
                      No draft groups match this search.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((row) => {
                    const isPublishing =
                      isPending && pendingPublishId === row.id;
                    const isDeleting = isPending && pendingDeleteId === row.id;

                    return (
                      <tr
                        key={row.id}
                        className="align-top transition hover:bg-slate-50/70"
                      >
                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-900">
                            {row.title}
                          </p>
                          {row.subtitle ? (
                            <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                              {row.subtitle}
                            </p>
                          ) : null}
                          {row.meta && row.meta.length > 0 ? (
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {row.missingCourt ? (
                                <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-700">
                                  Needs court
                                </span>
                              ) : null}
                              {row.meta.map((item) => (
                                <span
                                  key={item}
                                  className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-600"
                                >
                                  {item}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-5 py-4">
                          {row.details.length === 0 ? (
                            <p className="text-sm text-slate-500">No details</p>
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
                          <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
                            {row.statusLabel}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex flex-wrap justify-end gap-2">
                            <Link
                              href={row.viewHref}
                              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                            >
                              <Eye className="h-3.5 w-3.5" strokeWidth={1.8} />
                              View
                            </Link>
                            <Link
                              href={row.editHref}
                              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                            >
                              <Pencil className="h-3.5 w-3.5" strokeWidth={1.8} />
                              Edit
                            </Link>
                            <button
                              type="button"
                              onClick={() => handlePublish(row)}
                              disabled={isPublishing || isDeleting}
                              className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                            >
                              {isPublishing ? (
                                <LoaderCircle
                                  className="h-3.5 w-3.5 animate-spin"
                                  strokeWidth={1.8}
                                />
                              ) : (
                                <CheckCircle2
                                  className="h-3.5 w-3.5"
                                  strokeWidth={1.8}
                                />
                              )}
                              {isPublishing ? "Displaying" : "Display"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(row)}
                              disabled={isPublishing || isDeleting}
                              className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                            >
                              {isDeleting ? (
                                <LoaderCircle
                                  className="h-3.5 w-3.5 animate-spin"
                                  strokeWidth={1.8}
                                />
                              ) : (
                                <Trash2
                                  className="h-3.5 w-3.5"
                                  strokeWidth={1.8}
                                />
                              )}
                              {isDeleting ? "Deleting" : "Delete"}
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
        title="Delete"
        message={
          deleteTarget
            ? `Delete ${deleteTarget.title}? Group photos and LINE QR images will also be removed.`
            : ""
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        loading={Boolean(deleteTarget && pendingDeleteId === deleteTarget.id)}
        onConfirm={() => {
          if (deleteTarget) {
            handleDelete(deleteTarget);
          }
        }}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
