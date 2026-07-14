"use client";

import { MapPinned, UsersRound } from "lucide-react";
import { useState } from "react";
import { TrackedLink } from "@/components/analytics/tracked-link";
import { BaseSelect } from "@/components/base-select";
import { buildLocalizedPath, type Locale } from "@/lib/i18n";

type LandingHeroFinderProps = {
  locale: Locale;
  sports: {
    code: string;
    name: string;
    color: string;
  }[];
  sportLabel: string;
  groupLabel: string;
  courtLabel: string;
};

export function LandingHeroFinder({
  locale,
  sports,
  sportLabel,
  groupLabel,
  courtLabel,
}: LandingHeroFinderProps) {
  const [sportCode, setSportCode] = useState(sports[0]?.code ?? "badminton");

  return (
    <div className="flex w-full flex-col gap-3 rounded-lg border border-slate-200/90 bg-white p-3 shadow-[0_18px_45px_rgb(15_23_42/0.13)] sm:flex-row sm:items-stretch sm:gap-3 sm:p-2">
      <div className="relative min-w-0 flex-1">
        <BaseSelect
          label={sportLabel}
          name="landingSport"
          value={sportCode}
          onChange={(event) => setSportCode(event.target.value)}
          options={sports.map((sport) => ({
            value: sport.code,
            label: sport.name,
            color: sport.color,
          }))}
          variant="light"
          labelPlacement="inside"
          menuId="landing-sport-menu"
        />
      </div>

      <div className="grid shrink-0 gap-2 sm:grid-cols-2">
        <TrackedLink
          href={buildLocalizedPath(`/${sportCode}/group-finder`, locale)}
          eventName="landing_cta_click"
          eventPayload={{
            surface: "landing_hero_finder",
            cta: "find_group",
            sport: sportCode,
          }}
          className="rt-btn-primary inline-flex min-h-11 items-center justify-center gap-2 px-4 text-sm"
        >
          <UsersRound className="h-4 w-4" strokeWidth={2} aria-hidden />
          {groupLabel}
        </TrackedLink>
        <TrackedLink
          href={buildLocalizedPath(`/${sportCode}/court-finder`, locale)}
          eventName="landing_cta_click"
          eventPayload={{
            surface: "landing_hero_finder",
            cta: "find_court",
            sport: sportCode,
          }}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:border-slate-500 hover:bg-slate-50"
        >
          <MapPinned className="h-4 w-4" strokeWidth={2} aria-hidden />
          {courtLabel}
        </TrackedLink>
      </div>
    </div>
  );
}
