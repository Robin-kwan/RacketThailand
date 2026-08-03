"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { BaseSelect } from "@/components/base-select";

type TournamentFinderFiltersProps = {
  locale: "th" | "en";
  initialQuery: string;
  initialProvince: string;
  provinces: string[];
};

export function TournamentFinderFilters({
  locale,
  initialQuery,
  initialProvince,
  provinces,
}: TournamentFinderFiltersProps) {
  const [province, setProvince] = useState(initialProvince);
  const th = locale === "th";
  const searchLabel = th
    ? "ค้นหาการแข่งขัน กลุ่ม ผู้จัด สนาม หรือสถานที่"
    : "Search tournaments, groups, organizers, courts, or locations";

  return (
    <form className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_16rem_auto] md:items-end">
        <div className="space-y-2">
          <label
            htmlFor="tournament-search"
            className="text-sm font-semibold text-slate-700"
          >
            {searchLabel}
          </label>
          <input
            id="tournament-search"
            type="search"
            name="q"
            defaultValue={initialQuery}
            placeholder={searchLabel}
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--rt-primary)] focus:ring-4 focus:ring-[rgb(var(--rt-primary-rgb)/0.12)]"
          />
        </div>

        <BaseSelect
          label={th ? "จังหวัด" : "Province"}
          name="province"
          value={province}
          onChange={(event) => setProvince(event.target.value)}
          options={[
            { value: "", label: th ? "ทุกจังหวัด" : "All provinces" },
            ...provinces.map((item) => ({ value: item, label: item })),
          ]}
          variant="light"
        />

        {locale !== "th" && <input type="hidden" name="lang" value={locale} />}

        <button className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-300">
          <Search className="h-4 w-4" aria-hidden />
          {th ? "ค้นหา" : "Search"}
        </button>
      </div>
    </form>
  );
}
