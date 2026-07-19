"use client";

import { useState } from "react";
import Link from "next/link";
import { BaseSelect } from "@/components/base-select";
import { BaseTextField } from "@/components/base-text-field";

type FilterOption = {
  value: string;
  label: string;
};

type Props = {
  locale: "th" | "en";
  area: string;
  skill: string;
  clearHref: string;
  skillOptions: FilterOption[];
  copy: {
    area: string;
    areaPlaceholder: string;
    skill: string;
    apply: string;
    clear: string;
  };
};

export function PlayerFinderFilters({
  locale,
  area,
  skill,
  clearHref,
  skillOptions,
  copy,
}: Props) {
  const [selectedSkill, setSelectedSkill] = useState(skill);

  return (
    <form
      method="get"
      className="grid gap-3 border-b border-slate-200 pb-6 sm:grid-cols-[minmax(0,1fr)_14rem_auto]"
    >
      {locale === "en" && <input type="hidden" name="lang" value="en" />}
      <div className="space-y-2">
        <label
          htmlFor="player-finder-area"
          className="block text-sm font-semibold text-slate-700"
        >
          {copy.area}
        </label>
        <BaseTextField
          id="player-finder-area"
          type="search"
          name="area"
          defaultValue={area}
          placeholder={copy.areaPlaceholder}
          variant="light"
        />
      </div>
      <BaseSelect
        label={copy.skill}
        name="skill"
        value={selectedSkill}
        onChange={(event) => setSelectedSkill(event.target.value)}
        options={skillOptions}
        variant="light"
      />
      <div className="flex items-end gap-2">
        <button
          type="submit"
          className="rt-btn-primary inline-flex min-h-[42px] items-center justify-center px-5 py-3 text-sm"
        >
          {copy.apply}
        </button>
        {(area || skill) && (
          <Link
            href={clearHref}
            className="inline-flex min-h-[42px] items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700"
          >
            {copy.clear}
          </Link>
        )}
      </div>
    </form>
  );
}
