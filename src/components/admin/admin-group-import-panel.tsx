"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { buildLocalizedPath, type Locale } from "@/lib/i18n";

type PreviewCandidate = {
  groupName?: string | null;
  venue?: string[] | null;
  provinceDistrict?: string[] | null;
  schedule?: string[] | null;
  contactMethods?: string[] | null;
  cleanedDescription?: string | null;
  originalExcerpt?: string | null;
  imageFilenames?: string[] | null;
};

type PreviewPayload = {
  runDate?: string | null;
  candidates?: PreviewCandidate[] | null;
};

type ImportResult = {
  importedCount: number;
  runDate?: string | null;
  ownerProfile?: {
    id: string;
    username: string | null;
    displayName: string | null;
  };
  imported: Array<{
    candidateIndex: number;
    name: string;
    groupId: string;
    courtId: string | null;
    courtName: string | null;
    imageCount: number;
    warnings: string[];
  }>;
};

type AdminGroupImportPanelProps = {
  locale: Locale;
  initialRunDate: string | null;
  initialPreviewText: string;
};

function parsePreview(text: string): PreviewPayload | null {
  try {
    return JSON.parse(text) as PreviewPayload;
  } catch {
    return null;
  }
}

export function AdminGroupImportPanel({
  locale,
  initialRunDate,
  initialPreviewText,
}: AdminGroupImportPanelProps) {
  const [previewText, setPreviewText] = useState(initialPreviewText);
  const [runDate, setRunDate] = useState(initialRunDate ?? "");
  const [selectedIndexes, setSelectedIndexes] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  const preview = useMemo(() => parsePreview(previewText), [previewText]);
  const candidates = preview?.candidates ?? [];

  useEffect(() => {
    setSelectedIndexes(candidates.map((_, index) => index));
  }, [previewText]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (preview?.runDate && !runDate) {
      setRunDate(preview.runDate);
    }
  }, [preview, runDate]);

  const toggleIndex = (index: number) => {
    setSelectedIndexes((prev) =>
      prev.includes(index)
        ? prev.filter((value) => value !== index)
        : [...prev, index].sort((a, b) => a - b),
    );
  };

  const handleImport = async () => {
    if (!preview) {
      setError("Preview JSON is invalid.");
      return;
    }

    if (selectedIndexes.length === 0) {
      setError("Select at least one candidate to import.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/admin/groups/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          preview,
          runDate: runDate || preview.runDate || null,
          selectedCandidateIndexes: selectedIndexes,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as
        | ImportResult
        | { error?: string };

      if (!response.ok) {
        throw new Error(data && "error" in data ? data.error : undefined);
      }

      setResult(data as ImportResult);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to import draft groups.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-slate-900">
            Import automation preview as hidden draft groups
          </h2>
          <p className="text-sm text-slate-600">
            Imported groups are assigned to the `racketthailand` admin profile
            and stay out of the public finder and detail pages until an admin
            publishes them. Images are uploaded from the local automation run
            folder when the filenames exist.
          </p>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">
              Run date
            </span>
            <input
              type="text"
              value={runDate}
              onChange={(event) => setRunDate(event.target.value)}
              placeholder="YYYY-MM-DD"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">
              Preview JSON
            </span>
            <textarea
              value={previewText}
              onChange={(event) => setPreviewText(event.target.value)}
              rows={14}
              className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 font-mono text-xs text-slate-900 outline-none transition focus:border-slate-400"
            />
          </label>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setSelectedIndexes(candidates.map((_, index) => index))}
            className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-white"
          >
            Select all
          </button>
          <button
            type="button"
            onClick={() => setSelectedIndexes([])}
            className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-white"
          >
            Clear selection
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={submitting || !preview}
            className="rt-btn-primary px-5 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Importing drafts..." : "Import selected drafts"}
          </button>
        </div>

        {error ? (
          <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </p>
        ) : null}
      </section>

      <section className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              Candidates
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              {preview
                ? `${candidates.length} candidates loaded`
                : "Fix the JSON above to load candidates."}
            </p>
          </div>
          <p className="text-sm text-slate-500">
            {selectedIndexes.length} selected
          </p>
        </div>

        {!preview ? (
          <p className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-600">
            Preview JSON is invalid.
          </p>
        ) : candidates.length === 0 ? (
          <p className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-600">
            No candidates found in this preview.
          </p>
        ) : (
          <div className="mt-5 space-y-4">
            {candidates.map((candidate, index) => {
              const checked = selectedIndexes.includes(index);
              const description =
                candidate.cleanedDescription?.trim() ||
                candidate.originalExcerpt?.trim() ||
                "";

              return (
                <label
                  key={`${candidate.groupName ?? "candidate"}-${index}`}
                  className={`block rounded-3xl border p-5 transition ${
                    checked
                      ? "border-emerald-300 bg-emerald-50/50"
                      : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleIndex(index)}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-[var(--rt-primary)] focus:ring-[var(--rt-primary)]"
                    />
                    <div className="min-w-0 flex-1 space-y-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                            Candidate {index + 1}
                          </p>
                          <h4 className="mt-1 text-base font-semibold text-slate-900">
                            {candidate.groupName?.trim() || "Unnamed group"}
                          </h4>
                        </div>
                        <div className="text-right text-xs text-slate-500">
                          <p>
                            {(candidate.imageFilenames ?? []).length} local images
                          </p>
                          <p>
                            {(candidate.contactMethods ?? []).length} contact hints
                          </p>
                        </div>
                      </div>

                      <div className="grid gap-3 text-sm text-slate-700 md:grid-cols-2">
                        <p>
                          <span className="font-semibold text-slate-900">
                            Venue:
                          </span>{" "}
                          {(candidate.venue ?? []).join(", ") || "-"}
                        </p>
                        <p>
                          <span className="font-semibold text-slate-900">
                            Province / district:
                          </span>{" "}
                          {(candidate.provinceDistrict ?? []).join(", ") || "-"}
                        </p>
                        <p>
                          <span className="font-semibold text-slate-900">
                            Schedule:
                          </span>{" "}
                          {(candidate.schedule ?? []).join(", ") || "-"}
                        </p>
                        <p>
                          <span className="font-semibold text-slate-900">
                            Contacts:
                          </span>{" "}
                          {(candidate.contactMethods ?? []).join(", ") || "-"}
                        </p>
                      </div>

                      {description ? (
                        <p className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                          {description}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        )}
      </section>

      {result ? (
        <section className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">
            Import result
          </h3>
          <p className="mt-2 text-sm text-slate-600">
            Imported {result.importedCount} draft groups from run{" "}
            {(result.runDate ?? runDate) || "unknown"}
            {result.ownerProfile?.username
              ? ` under ${result.ownerProfile.username}.`
              : "."}
          </p>
          <div className="mt-5 space-y-4">
            {result.imported.map((item) => (
              <div
                key={item.groupId}
                className="rounded-3xl border border-slate-200 bg-slate-50 p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-slate-900">
                      {item.name}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {item.imageCount} images uploaded
                      {item.courtName ? ` • Court: ${item.courtName}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={buildLocalizedPath(`/groups/${item.groupId}`, locale)}
                      className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
                    >
                      View draft
                    </Link>
                    <Link
                      href={buildLocalizedPath(`/groups/${item.groupId}/edit`, locale)}
                      className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
                    >
                      Edit
                    </Link>
                  </div>
                </div>
                {item.warnings.length > 0 ? (
                  <ul className="mt-3 space-y-2 text-sm text-amber-700">
                    {item.warnings.map((warning) => (
                      <li key={warning}>- {warning}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
