"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { CourtRecord } from "@/server/courtFinder";
import {
  DEFAULT_LOCALE,
  buildLocalizedPath,
  type Locale,
} from "@/lib/i18n";
import { BaseSelect } from "@/components/base-select";

type CourtFinderCopy = {
  searchPlaceholder: string;
  provinceLabel: string;
  resetFilters: string;
  emptyTitle: string;
  emptyDescription: string;
  backLink: string;
  lastUpdated: string;
};

type CourtFinderProps = {
  sportCode: string;
  locale: Locale;
  accent: string;
  copy: CourtFinderCopy;
  initialCourts: CourtRecord[];
  provinces: string[];
  total: number;
};

const PAGE_SIZE = 12;

export function CourtFinder({
  sportCode,
  locale,
  accent,
  copy,
  initialCourts,
  provinces,
  total,
}: CourtFinderProps) {
  const [search, setSearch] = useState("");
  const [province, setProvince] = useState<string>("");
  const [courts, setCourts] = useState(initialCourts);
  const [availableProvinces, setAvailableProvinces] = useState(provinces);
  const [loading, setLoading] = useState(false);
  const [count, setCount] = useState(total);
  const localeQuery =
    locale === DEFAULT_LOCALE ? "" : `?lang=${locale}`;
  const provinceOptions = useMemo(
    () => [
      { value: "", label: copy.resetFilters },
      ...availableProvinces.map((prov) => ({
        value: prov,
        label: prov,
      })),
    ],
    [availableProvinces, copy.resetFilters],
  );

  useEffect(() => {
    let isActive = true;
    const load = async () => {
      setLoading(true);
      const params = new URLSearchParams({
        sport: sportCode,
        limit: PAGE_SIZE.toString(),
      });
      if (search) params.set("q", search);
      if (province) params.set("province", province);
      const response = await fetch(`/api/courts?${params.toString()}`, {
        cache: "no-store",
      });
      const data = await response.json();
      if (!isActive) return;
      setCourts(data.courts ?? []);
      setCount(data.count ?? 0);
      setAvailableProvinces(data.provinces ?? []);
      setLoading(false);
    };
    load();
    return () => {
      isActive = false;
    };
  }, [sportCode, search, province]);

  const handleReset = () => {
    setSearch("");
    setProvince("");
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200">
        <div className="flex flex-col gap-4 md:flex-row md:items-end">
          <div className="flex-1 space-y-2">
            <label className="text-sm font-semibold text-slate-700">
              {copy.searchPlaceholder}
            </label>
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={copy.searchPlaceholder}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:bg-white"
            />
          </div>
          <div className="w-full md:w-64">
            <BaseSelect
              label={copy.provinceLabel}
              name="province"
              value={province}
              onChange={(event) => setProvince(event.target.value)}
              options={provinceOptions}
            />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between text-sm text-slate-500">
          <p>
            {count.toLocaleString("en-US")} courts ·{" "}
            {loading ? "loading..." : "live data"}
          </p>
          <button
            type="button"
            onClick={handleReset}
            className="text-slate-700 underline-offset-4 hover:underline"
          >
            {copy.resetFilters}
          </button>
        </div>
      </div>

      {courts.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-6 py-16 text-center text-slate-600">
          <p className="text-xl font-semibold text-slate-900">
            {copy.emptyTitle}
          </p>
          <p className="mt-2 text-sm text-slate-500">{copy.emptyDescription}</p>
          <Link
            href={buildLocalizedPath("/", locale)}
            className="mt-6 inline-flex rounded-full border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700 hover:border-slate-500"
          >
            {copy.backLink}
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {courts.map((court) => (
            <Link
              key={court.id}
              href={`/courts/${court.id}${localeQuery}`}
              className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white px-5 py-6 shadow-md shadow-slate-200 transition hover:-translate-y-1"
            >
              <div className="overflow-hidden rounded-2xl border border-slate-100 bg-slate-100">
                <div className="relative h-36 w-full">
                  <Image
                    src={
                      court.court_photos?.find((p) => p.is_primary)?.image_url ??
                      court.court_photos?.[0]?.image_url ??
                      "/sports/badminton.svg"
                    }
                    alt={court.name ?? "Court image"}
                    fill
                    sizes="(max-width:768px) 100vw, 50vw"
                    className="object-cover"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl font-semibold text-slate-900">
                  {court.name ?? "Unnamed court"}
                </h3>
                <p className="text-sm text-slate-600">
                  {[court.district, court.province].filter(Boolean).join(" · ")}
                </p>
              </div>
              <ul className="space-y-2 text-sm text-slate-600">
                {[
                  court.address,
                  court.price_note ? `฿ ${court.price_note}` : null,
                  court.phone ? `Tel: ${court.phone}` : null,
                  court.line_id ? `Line: ${court.line_id}` : null,
                ]
                  .filter(Boolean)
                  .map((detail) => (
                    <li key={`${court.id}-${detail}`}>{detail}</li>
                  ))}
                {court.created_at && (
                  <li className="text-xs text-slate-400">
                    {copy.lastUpdated}{" "}
                    {new Date(court.created_at).toLocaleDateString("en-US")}
                  </li>
                )}
              </ul>
              <div className="flex gap-3 text-xs uppercase tracking-[0.3em] text-slate-500">
                <span
                  className="inline-flex rounded-full px-3 py-1"
                  style={{ backgroundColor: `${accent}15`, color: accent }}
                >
                  {court.province || "TH"}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
