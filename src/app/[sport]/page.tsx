import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  ChevronRight,
  Grid3X3,
  Plus,
  Users,
  type LucideIcon,
} from "lucide-react";
import { buildSportPagePayload } from "@/server/sportContent";
import { fetchCasualPlaysBySport } from "@/server/casualPlays";
import { SUPPORTED_SPORTS, getSportMeta } from "@/data/sportMeta";
import { HeaderSubLabel } from "@/components/header-sub-label";
import { HeaderSportScope } from "@/components/header-sport-scope";
import {
  buildLocalizedPath,
  getTranslator,
  normalizeLocale,
  type Locale,
} from "@/lib/i18n";
import { buildCanonicalUrl, buildLocaleAlternates } from "@/lib/seo";
import { getSeoKeyword } from "@/lib/seoKeywords";
import { GroupCard } from "@/components/group-card";
import { CourtCard } from "@/components/court-card";
import { CasualPlayCard } from "@/components/casual-play-card";
import { TrackedLink } from "@/components/analytics/tracked-link";
import type { SportFeatureCard } from "@/types/sports";

type Params = {
  sport: string;
};

type SearchParams = {
  lang?: string;
};

type ParamsInput = Promise<Params>;
type SearchParamInput = Promise<SearchParams> | undefined;

const STAT_ICONS: Record<string, LucideIcon> = {
  courts: Grid3X3,
  groups: Users,
};

const STAT_CARD_STYLES: Record<
  string,
  {
    cardBorder: string;
    iconWrap: string;
    valueText: string;
    marker: string;
  }
> = {
  courts: {
    cardBorder: "border-emerald-200",
    iconWrap:
      "border-emerald-200 bg-emerald-50 text-emerald-700",
    valueText: "text-emerald-700",
    marker: "bg-emerald-500",
  },
  groups: {
    cardBorder: "border-teal-200",
    iconWrap:
      "border-teal-200 bg-teal-50 text-teal-700",
    valueText: "text-teal-700",
    marker: "bg-teal-500",
  },
  default: {
    cardBorder: "border-slate-200",
    iconWrap:
      "border-slate-200 bg-slate-50 text-slate-700",
    valueText: "text-slate-700",
    marker: "bg-slate-500",
  },
};

export function generateStaticParams() {
  return SUPPORTED_SPORTS.map((sport) => ({ sport }));
}

async function resolveSearchParams(
  searchParams?: SearchParamInput,
): Promise<SearchParams | undefined> {
  if (!searchParams) return undefined;
  return searchParams;
}

async function resolveParams(params: ParamsInput): Promise<Params> {
  return params;
}

type FeatureCarouselProps = {
  title: string;
  subtitle: string;
  cards: SportFeatureCard[];
  emptyCopy: string;
  ctaHref: string;
  ctaLabel: string;
  locale: Locale;
  type: "court" | "group";
};

function FeatureCarousel({
  title,
  subtitle,
  cards,
  emptyCopy,
  ctaHref,
  ctaLabel,
  locale,
  type,
}: FeatureCarouselProps) {
  const hasCards = cards.length > 0;
  const dayLabels = locale === "th"
    ? {
        sunday: "อาทิตย์",
        monday: "จันทร์",
        tuesday: "อังคาร",
        wednesday: "พุธ",
        thursday: "พฤหัสบดี",
        friday: "ศุกร์",
        saturday: "เสาร์",
      }
    : {
        sunday: "Sunday",
        monday: "Monday",
        tuesday: "Tuesday",
        wednesday: "Wednesday",
        thursday: "Thursday",
        friday: "Friday",
        saturday: "Saturday",
      };

  return (
    <section className="px-6 py-12 text-[var(--foreground)] md:px-12">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold">{title}</h2>
            <p className="mt-1 text-sm text-[rgb(var(--foreground-rgb)/0.7)]">
              {subtitle}
            </p>
          </div>
          <TrackedLink
            href={ctaHref}
            eventName="sport_cta_click"
            eventPayload={{
              surface: "sport_feature_carousel",
              cta: ctaHref,
            }}
            className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--rt-primary)] hover:text-[var(--rt-primary-border)]"
          >
            {ctaLabel}
            <ChevronRight
              className="h-4 w-4"
              strokeWidth={1.8}
              aria-hidden
            />
          </TrackedLink>
        </div>
        {hasCards ? (
          <div className="-mx-6 mt-8 overflow-x-auto pb-4 md:mx-0">
            <div className="flex snap-x snap-mandatory gap-4 px-6 md:px-0">
              {cards.map((card, index) => {
                const href = card.href
                  ? buildLocalizedPath(card.href, locale)
                  : undefined;
                const cover = card.imageUrl ?? "/sports/badminton.png";
                const description =
                  card.details.length > 0 ? card.details[0] : undefined;
                const locationText = card.location || card.subtitle || "";
                return (
                  <div
                    key={`${card.title}-${index}`}
                    className="snap-start w-[320px] shrink-0 md:w-[360px]"
                  >
                    {type === "group" ? (
                      <GroupCard
                        name={card.title}
                        href={href}
                        imageUrl={cover}
                        imageAlt={card.title}
                        dayLabels={dayLabels}
                        scheduleAnytime={subtitle}
                        locale={locale}
                        sessions={card.sessions ?? []}
                        showSessions={false}
                        description={description}
                        showDescription
                        location={locationText || undefined}
                        showLocation={Boolean(locationText)}
                        imageAspectClass="aspect-[4/3]"
                        footer={
                          (card.sessions?.length ?? 0) === 0 &&
                          card.details.length > 0 ? (
                            <ul className="space-y-2 text-sm text-slate-600">
                              {card.details.map((detail, detailIndex) => (
                                <li key={`${card.title}-${detailIndex}`}>
                                  {detail}
                                </li>
                              ))}
                            </ul>
                          ) : null
                        }
                      />
                    ) : (
                      <CourtCard
                        name={card.title}
                        href={href}
                        imageUrl={cover}
                        imageAlt={card.title}
                        location={card.subtitle || card.location || undefined}
                        imageAspectClass="aspect-[4/3]"
                        showDetails={card.details.length > 0}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <p className="mt-6 text-sm text-[rgb(var(--foreground-rgb)/0.5)]">
            {emptyCopy}
          </p>
        )}
      </div>
    </section>
  );
}

type CasualPlayPreviewSectionProps = {
  title: string;
  subtitle: string;
  emptyCopy: string;
  ctaHref: string;
  ctaLabel: string;
  locale: Locale;
  sportCode: string;
  plays: Awaited<ReturnType<typeof fetchCasualPlaysBySport>>["plays"];
};

function CasualPlayPreviewSection({
  title,
  subtitle,
  emptyCopy,
  ctaHref,
  ctaLabel,
  locale,
  sportCode,
  plays,
}: CasualPlayPreviewSectionProps) {
  const hasPlays = plays.length > 0;

  return (
    <section className="px-6 py-12 text-[var(--foreground)] md:px-12">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold">{title}</h2>
            <p className="mt-1 text-sm text-[rgb(var(--foreground-rgb)/0.7)]">
              {subtitle}
            </p>
          </div>
          <TrackedLink
            href={ctaHref}
            eventName="sport_cta_click"
            eventPayload={{
              surface: "sport_casual_play_preview",
              cta: "open_casual_plays",
              sport: sportCode,
            }}
            className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--rt-primary)] hover:text-[var(--rt-primary-border)]"
          >
            {ctaLabel}
            <ChevronRight
              className="h-4 w-4"
              strokeWidth={1.8}
              aria-hidden
            />
          </TrackedLink>
        </div>
        {hasPlays ? (
          <div className="-mx-6 mt-8 overflow-x-auto pb-4 md:mx-0">
            <div className="flex snap-x snap-mandatory gap-4 px-6 md:px-0">
              {plays.map((play) => {
                const location = play.location_note ||
                  [play.courts?.district, play.courts?.province]
                    .filter(Boolean)
                    .join(", ");
                const venueName = play.venue_name || play.courts?.name;

                return (
                  <div
                    key={play.id}
                    className="snap-start w-[320px] shrink-0 md:w-[360px]"
                  >
                    <CasualPlayCard
                      title={play.title || ""}
                      href={buildLocalizedPath(
                        `/casual-plays/${play.id}`,
                        locale,
                      )}
                      description={play.description}
                      venueName={venueName}
                      location={location || null}
                      playDate={play.play_date}
                      startTime={play.start_time}
                      endTime={play.end_time}
                      playerAmount={play.player_amount}
                      locale={locale}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <p className="mt-6 text-sm text-[rgb(var(--foreground-rgb)/0.5)]">
            {emptyCopy}
          </p>
        )}
      </div>
    </section>
  );
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: ParamsInput;
  searchParams?: SearchParamInput;
}): Promise<Metadata> {
  const resolvedParams = await resolveSearchParams(searchParams);
  const locale = normalizeLocale(resolvedParams?.lang);
  const resolvedParamsValue = await resolveParams(params);
  const meta = getSportMeta(resolvedParamsValue.sport);
  if (!meta) {
    return {
      title: "Page not found | RacketThailand",
      description:
        "This sport page does not exist. Head back to the landing page to pick a different sport.",
      robots: {
        index: false,
        follow: false,
      },
    };
  }
  const keywordSnippet = getSeoKeyword(resolvedParamsValue.sport, locale, "hero");
  const discoveryLine =
    locale === "th"
      ? "ค้นหาสนามและกลุ่มทั่วไทยได้ในที่เดียว"
      : "Find active Thailand courts and groups in one portal.";
  const description = keywordSnippet
    ? `${meta.heroDescription[locale]} ${keywordSnippet} ${discoveryLine}`
    : `${meta.heroDescription[locale]} ${discoveryLine}`;
  const canonicalPath = `/${resolvedParamsValue.sport}`;
  const canonical = buildCanonicalUrl(canonicalPath, locale);
  const alternates = buildLocaleAlternates(canonicalPath);
  return {
    title: `${meta.name[locale]} | RacketThailand`,
    description,
    alternates: {
      canonical,
      languages: alternates,
    },
    openGraph: {
      title: `${meta.name[locale]} | RacketThailand`,
      description,
      url: canonical,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${meta.name[locale]} | RacketThailand`,
      description,
    },
  };
}

export default async function SportPage({
  params,
  searchParams,
}: {
  params: ParamsInput;
  searchParams?: SearchParamInput;
}) {
  const resolvedParams = await resolveSearchParams(searchParams);
  const locale = normalizeLocale(resolvedParams?.lang);
  const resolvedParamsValue = await resolveParams(params);
  const t = await getTranslator(locale);
  const sport = await buildSportPagePayload(resolvedParamsValue.sport);

  if (!sport) {
    notFound();
  }

  const casualPlayResult = await fetchCasualPlaysBySport(sport.code, {
    limit: 10,
  });

  const courtFeature = sport.features.find((feature) => feature.key === "courts");
  const groupFeature = sport.features.find((feature) => feature.key === "groups");
  const carouselEmptyCopy = t("sport.carouselEmpty");
  const viewAllLabel = t("sport.viewAll");
  const boardCta = t("community.boardCta");
  const renderStatIcon = (key: string) => {
    const Icon = STAT_ICONS[key] ?? Plus;
    return (
      <Icon
        className="h-5 w-5"
        strokeWidth={1.8}
        aria-hidden
      />
    );
  };
  const getStatStyle = (key: string) =>
    STAT_CARD_STYLES[key] ?? STAT_CARD_STYLES.default;

  return (
    <div className="min-h-screen text-[var(--foreground)]">
      <HeaderSportScope sportSlug={sport.code} />
      <HeaderSubLabel value={sport.name[locale]} />
      <section className="relative overflow-hidden border-y border-[rgb(var(--foreground-rgb)/0.1)] bg-white px-6 py-20 md:px-12">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgb(var(--rt-primary-rgb)/0.14),transparent_34%),radial-gradient(circle_at_95%_15%,rgb(var(--foreground-rgb)/0.08),transparent_42%)]"
        />
        <div className="relative mx-auto flex max-w-5xl flex-col gap-8 text-[var(--foreground)]">
          <div className="space-y-4">
            <span className="inline-flex rounded-full border border-[rgb(var(--rt-primary-rgb)/0.32)] bg-[rgb(var(--rt-primary-rgb)/0.1)] px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[rgb(var(--rt-primary-rgb))]">
              {sport.name[locale]}
            </span>
            <h1 className="text-4xl font-semibold leading-tight tracking-tight md:text-6xl">
              {sport.hero.headline[locale]}
            </h1>
            <p className="text-lg text-[rgb(var(--foreground-rgb)/0.78)] md:text-xl">
              {sport.hero.description[locale]}
            </p>
          </div>
          <div className="grid w-full max-w-3xl gap-4 sm:grid-cols-2 lg:max-w-none lg:grid-cols-[repeat(auto-fit,minmax(190px,1fr))]">
            {sport.hero.stats.map((stat) => {
              const styles = getStatStyle(stat.key);
              return (
                <div
                  key={stat.key}
                  className={`rounded-2xl border bg-white px-5 py-4 ${styles.cardBorder}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-[rgb(var(--foreground-rgb)/0.55)]">
                        {t(`sport.stats.${stat.key}`)}
                      </p>
                      <p className={`mt-2 text-4xl font-semibold leading-none tracking-tight ${styles.valueText}`}>
                        {stat.value}
                      </p>
                    </div>
                    <span className={`inline-flex h-11 w-11 items-center justify-center rounded-xl border ${styles.iconWrap}`}>
                      {renderStatIcon(stat.key)}
                    </span>
                  </div>
                  <div className={`mt-4 h-1.5 w-16 rounded-full ${styles.marker}`} />
                </div>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-4">
            <TrackedLink
              href={buildLocalizedPath(`/${sport.code}/court-finder`, locale)}
              eventName="sport_cta_click"
              eventPayload={{
                surface: "sport_hero",
                cta: "open_court_finder",
                sport: sport.code,
              }}
              className="rounded-full bg-[var(--rt-primary)] px-6 py-3 text-sm font-semibold uppercase text-[var(--rt-primary-text)]"
            >
              {t("courtFinder.cta")}
            </TrackedLink>
            <TrackedLink
              href={buildLocalizedPath(`/${sport.code}/group-finder`, locale)}
              eventName="sport_cta_click"
              eventPayload={{
                surface: "sport_hero",
                cta: "open_group_finder",
                sport: sport.code,
              }}
              className="rounded-full border border-[rgb(var(--rt-primary-rgb)/0.45)] bg-white px-6 py-3 text-sm font-semibold uppercase text-[var(--rt-primary)] hover:border-[rgb(var(--rt-primary-rgb)/0.75)]"
            >
              {t("sport.groupFinderCta")}
            </TrackedLink>
            <TrackedLink
              href={buildLocalizedPath(`/${sport.code}/casual-plays`, locale)}
              eventName="sport_cta_click"
              eventPayload={{
                surface: "sport_hero",
                cta: "open_casual_plays",
                sport: sport.code,
              }}
              className="rounded-full border border-emerald-300 bg-emerald-50 px-6 py-3 text-sm font-semibold uppercase text-emerald-800 hover:border-emerald-500"
            >
              {t("sport.casualPlaysCta")}
            </TrackedLink>
            <TrackedLink
              href={buildLocalizedPath(`/${sport.code}/board`, locale)}
              eventName="sport_cta_click"
              eventPayload={{
                surface: "sport_hero",
                cta: "open_board",
                sport: sport.code,
              }}
              className="rounded-full border border-[rgb(var(--foreground-rgb)/0.18)] bg-white px-6 py-3 text-sm font-semibold uppercase text-[rgb(var(--foreground-rgb)/0.75)] hover:border-[rgb(var(--foreground-rgb)/0.35)] hover:text-[var(--foreground)]"
            >
              {boardCta}
            </TrackedLink>
            <TrackedLink
              href={buildLocalizedPath("/courts/new", locale)}
              eventName="sport_cta_click"
              eventPayload={{
                surface: "sport_hero",
                cta: "add_court",
                sport: sport.code,
              }}
              className="rounded-full border border-[rgb(var(--foreground-rgb)/0.25)] bg-[rgb(var(--foreground-rgb)/0.04)] px-6 py-3 text-sm font-semibold uppercase text-[rgb(var(--foreground-rgb)/0.82)] hover:border-[rgb(var(--foreground-rgb)/0.38)]"
            >
              {t("courtSubmission.submit")}
            </TrackedLink>
          </div>
        </div>
      </section>
      {casualPlayResult.plays.length > 0 && (
        <CasualPlayPreviewSection
          title={t("sport.latestCasualPlaysTitle")}
          subtitle={t("sport.latestCasualPlaysSubtitle", {
            sport: sport.name[locale],
          })}
          emptyCopy={carouselEmptyCopy}
          ctaHref={buildLocalizedPath(`/${sport.code}/casual-plays`, locale)}
          ctaLabel={t("sport.casualPlaysCta")}
          locale={locale}
          sportCode={sport.code}
          plays={casualPlayResult.plays}
        />
      )}
      {courtFeature && (
        <FeatureCarousel
          title={t("sport.latestCourtsTitle")}
          subtitle={t("sport.latestCourtsSubtitle", {
            sport: sport.name[locale],
          })}
          cards={courtFeature.cards}
          emptyCopy={carouselEmptyCopy}
          ctaHref={buildLocalizedPath(`/${sport.code}/court-finder`, locale)}
          ctaLabel={viewAllLabel}
          locale={locale}
          type="court"
        />
      )}
      {groupFeature && (
        <FeatureCarousel
          title={t("sport.latestGroupsTitle")}
          subtitle={t("sport.latestGroupsSubtitle", {
            sport: sport.name[locale],
          })}
          cards={groupFeature.cards}
          emptyCopy={carouselEmptyCopy}
          ctaHref={buildLocalizedPath(`/${sport.code}/group-finder`, locale)}
          ctaLabel={viewAllLabel}
          locale={locale}
          type="group"
        />
      )}
    </div>
  );
}
