"use client";

import { Check, ChevronDown, MapPinned, UsersRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { TrackedLink } from "@/components/analytics/tracked-link";
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
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const selectedSport =
    sports.find((sport) => sport.code === sportCode) ?? sports[0];

  useEffect(() => {
    const closeMenuOnOutsidePress = (event: MouseEvent) => {
      if (
        menuRef.current &&
        event.target instanceof Node &&
        !menuRef.current.contains(event.target)
      ) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", closeMenuOnOutsidePress);
    return () => document.removeEventListener("mousedown", closeMenuOnOutsidePress);
  }, []);

  return (
    <div className="flex w-full flex-col gap-3 rounded-2xl border border-slate-200/90 bg-white p-3 shadow-[0_18px_45px_rgb(15_23_42/0.13)] sm:flex-row sm:items-stretch sm:gap-0 sm:p-2">
      <div ref={menuRef} className="relative min-w-0 flex-1 sm:border-r sm:border-slate-200">
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setMenuOpen(false);
          }}
          aria-expanded={menuOpen}
          aria-haspopup="listbox"
          aria-controls="landing-sport-menu"
          className="flex min-h-12 w-full items-center gap-3 rounded-xl bg-slate-50 px-3 text-left transition hover:bg-slate-100 focus-visible:bg-slate-100 sm:bg-transparent"
        >
          <span
            className="h-3 w-3 shrink-0 rounded-full ring-4 ring-white shadow-sm"
            style={{ backgroundColor: selectedSport?.color ?? "#0ca678" }}
            aria-hidden
          />
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-medium text-slate-500">
              {sportLabel}
            </span>
            <span className="block truncate text-sm font-semibold text-slate-900">
              {selectedSport?.name}
            </span>
          </span>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${
              menuOpen ? "rotate-180" : ""
            }`}
            strokeWidth={2}
            aria-hidden
          />
        </button>

        {menuOpen && (
          <div
            id="landing-sport-menu"
            role="listbox"
            aria-label={sportLabel}
            className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-30 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-[0_18px_40px_rgb(15_23_42/0.16)]"
          >
            {sports.map((sport) => {
              const isSelected = sport.code === sportCode;
              return (
                <button
                  key={sport.code}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    setSportCode(sport.code);
                    setMenuOpen(false);
                  }}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition ${
                    isSelected
                      ? "bg-emerald-50 font-semibold text-emerald-900"
                      : "font-medium text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: sport.color }}
                    aria-hidden
                  />
                  <span className="flex-1">{sport.name}</span>
                  {isSelected && (
                    <Check
                      className="h-4 w-4 text-emerald-700"
                      strokeWidth={2.3}
                      aria-hidden
                    />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid shrink-0 gap-2 sm:grid-cols-2 sm:pl-2">
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
