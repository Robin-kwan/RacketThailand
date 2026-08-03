import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowUpRight,
  CalendarDays,
  MapPin,
  Users,
} from "lucide-react";
import { BaseCard } from "@/components/base-card";
import { HeaderSubLabel } from "@/components/header-sub-label";
import { SportFinderHero } from "@/components/sport-finder-hero";
import { TournamentFinderFilters } from "@/components/tournaments/tournament-finder-filters";
import { getSportMeta } from "@/data/sportMeta";
import { buildLocalizedPath, normalizeLocale } from "@/lib/i18n";
import { buildCanonicalUrl, buildLocaleAlternates } from "@/lib/seo";
import { supabaseSelect } from "@/lib/supabaseRest";

type Tournament = {
  id: string;
  name: string;
  description: string;
  tournament_start_at: string;
  tournament_end_at: string;
  registration_url: string | null;
  tournament_photos:
    { id: string; image_url: string; is_primary: boolean }[] | null;
  courts: {
    name: string;
    address: string | null;
    district: string | null;
    province: string | null;
  } | null;
  tournament_organizers:
    { organizer_name: string | null; groups: { name: string } | null }[] | null;
};

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ sport: string }>;
  searchParams?: Promise<{ lang?: string }>;
}): Promise<Metadata> {
  const { sport } = await params;
  const locale = normalizeLocale((await searchParams)?.lang);
  const meta = getSportMeta(sport);
  if (!meta) return {};
  const path = `/${sport}/tournaments`;
  const title =
    locale === "th"
      ? `การแข่งขัน${meta.name.th}ใกล้คุณ`
      : `Local ${meta.name.en} tournaments`;
  return {
    title: `${title} | RacketThailand`,
    alternates: {
      canonical: buildCanonicalUrl(path, locale),
      languages: buildLocaleAlternates(path),
    },
  };
}

export default async function TournamentFinderPage({
  params,
  searchParams,
}: {
  params: Promise<{ sport: string }>;
  searchParams?: Promise<{ lang?: string; q?: string; province?: string }>;
}) {
  const { sport } = await params;
  const query = searchParams ? await searchParams : undefined;
  const locale = normalizeLocale(query?.lang);
  const meta = getSportMeta(sport);
  if (!meta) notFound();
  const th = locale === "th";
  const { data: sportRows } = await supabaseSelect<{ id: string }>("sports", {
    select: "id",
    code: `eq.${sport}`,
    limit: "1",
  });
  const sportId = sportRows?.[0]?.id;
  if (!sportId) notFound();
  const filters: Record<string, string> = {
    select:
      "id,name,description,tournament_start_at,tournament_end_at,registration_url,courts(name,address,district,province),tournament_organizers(organizer_name,groups(name)),tournament_photos(id,image_url,is_primary)",
    sport_id: `eq.${sportId}`,
    status: "eq.published",
    tournament_end_at: `gte.${new Date().toISOString()}`,
    order: "tournament_start_at.asc",
    limit: "100",
  };
  const { data } = await supabaseSelect<Tournament>("tournaments", filters);
  const searchTerms = (query?.q ?? "")
    .trim()
    .toLocaleLowerCase(locale === "th" ? "th-TH" : "en")
    .split(/\s+/)
    .filter(Boolean);
  const tournaments = (data ?? []).filter((item) => {
    if (query?.province && item.courts?.province !== query.province) {
      return false;
    }
    if (searchTerms.length === 0) return true;

    const searchableText = [
      item.name,
      item.description,
      item.courts?.name,
      item.courts?.address,
      item.courts?.district,
      item.courts?.province,
      ...(item.tournament_organizers ?? []).flatMap((organizer) => [
        organizer.organizer_name,
        organizer.groups?.name,
      ]),
    ]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase(locale === "th" ? "th-TH" : "en");

    return searchTerms.every((term) => searchableText.includes(term));
  });
  const provinces = Array.from(
    new Set((data ?? []).map((item) => item.courts?.province).filter(Boolean)),
  ) as string[];
  const fmt = new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-GB", {
    dateStyle: "medium",
    timeZone: "Asia/Bangkok",
  });
  return (
    <div className="min-h-screen bg-[#f7fbf9] text-slate-900">
      <HeaderSubLabel value={meta.name[locale]} />
      <main>
        <SportFinderHero
          sportName={meta.name[locale]}
          sportAccent={meta.accent}
          imageUrl={meta.coverImage}
          title={
            th
              ? `ค้นหาการแข่งขัน${meta.name.th}`
              : `${meta.name.en} tournaments`
          }
          description={
            th
              ? "ค้นหารายการแข่งขัน วันที่แข่งขัน สนาม และผู้จัดในประเทศไทย"
              : "Discover upcoming tournaments, venues, and organizers across Thailand."
          }
        >
          <span className="inline-flex items-center rounded-lg border border-white/25 bg-white/10 px-4 py-3 text-sm font-semibold text-white backdrop-blur-sm">
            {th
              ? `พบ ${tournaments.length} รายการแข่งขัน`
              : `${tournaments.length} tournament${tournaments.length === 1 ? "" : "s"} found`}
          </span>
          <Link
            className="rt-btn-primary inline-flex items-center gap-2 px-5 py-3 text-sm"
            href={buildLocalizedPath(
              `/tournaments/create?sport=${sport}`,
              locale,
            )}
          >
            {th ? "เพิ่มการแข่งขัน" : "Add tournament"}
            <ArrowUpRight className="h-4 w-4" aria-hidden />
          </Link>
        </SportFinderHero>
        <section className="px-6 py-10 md:px-10 md:py-12">
          <div className="mx-auto w-full max-w-screen-xl">
            <TournamentFinderFilters
              locale={locale}
              initialQuery={query?.q ?? ""}
              initialProvince={query?.province ?? ""}
              provinces={provinces}
            />
            <div className="mt-8 flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold">
                {th ? "การแข่งขันที่กำลังจะมาถึง" : "Upcoming tournaments"}
              </h2>
            </div>
            <div className="mt-4 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {tournaments.map((item) => {
                const organizers =
                  item.tournament_organizers
                    ?.map((o) => o.groups?.name ?? o.organizer_name)
                    .filter(Boolean) ?? [];
                const cardImage =
                  item.tournament_photos?.find((photo) => photo.is_primary) ??
                  item.tournament_photos?.[0];
                const dateRange = fmt.formatRange(
                  new Date(item.tournament_start_at),
                  new Date(item.tournament_end_at),
                );
                return (
                  <Link
                    key={item.id}
                    href={buildLocalizedPath(`/tournaments/${item.id}`, locale)}
                  >
                    <BaseCard className="group h-full overflow-hidden rounded-xl border border-slate-200 bg-white p-0 transition duration-200 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-lg">
                      {cardImage ? (
                        <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-100">
                          <Image
                            src={cardImage.image_url}
                            alt={item.name}
                            fill
                            sizes="(min-width: 768px) 50vw, 100vw"
                            className="object-cover transition duration-300 group-hover:scale-[1.03]"
                          />
                          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/45 to-transparent" />
                          <span className="absolute bottom-3 left-3 max-w-[calc(100%-1.5rem)] truncate rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-slate-900 shadow-sm backdrop-blur">
                            {dateRange}
                          </span>
                        </div>
                      ) : (
                        <div className="relative flex aspect-[16/9] w-full items-center justify-center bg-emerald-50 text-emerald-700">
                          <CalendarDays className="h-8 w-8" aria-hidden />
                          <span className="absolute bottom-3 left-3 max-w-[calc(100%-1.5rem)] truncate rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-slate-900 shadow-sm">
                            {dateRange}
                          </span>
                        </div>
                      )}
                      <div className="p-5">
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="line-clamp-2 text-lg font-semibold leading-6">
                            {item.name}
                          </h3>
                          <ArrowUpRight
                            className="mt-0.5 h-4 w-4 shrink-0 text-slate-400 transition group-hover:text-emerald-600"
                            aria-hidden
                          />
                        </div>
                        <p className="mt-2 line-clamp-2 text-sm rt-text-muted">
                          {item.description}
                        </p>
                        <div className="mt-5 space-y-3 border-t border-slate-100 pt-4 text-sm text-slate-600">
                          <p className="flex items-start gap-2.5">
                            <MapPin
                              className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600"
                              aria-hidden
                            />
                            <span className="line-clamp-1">
                              {item.courts?.name ?? "-"}
                            </span>
                          </p>
                          <p className="flex items-start gap-2.5">
                            <Users
                              className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600"
                              aria-hidden
                            />
                            <span className="line-clamp-1">
                              {organizers.join(", ") || "-"}
                            </span>
                          </p>
                        </div>
                      </div>
                    </BaseCard>
                  </Link>
                );
              })}
              {tournaments.length === 0 && (
                <BaseCard className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center md:col-span-2 lg:col-span-3">
                  <CalendarDays
                    className="mx-auto h-8 w-8 text-slate-300"
                    aria-hidden
                  />
                  <p className="mt-3 font-semibold text-slate-700">
                    {th
                      ? "ยังไม่พบการแข่งขันที่กำลังจะมาถึง"
                      : "No upcoming tournaments found."}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {th
                      ? "ลองเปลี่ยนคำค้นหาหรือจังหวัด"
                      : "Try a different search term or province."}
                  </p>
                </BaseCard>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
