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
import {
  buildAbsoluteUrl,
  buildCanonicalUrl,
  buildLocaleAlternates,
} from "@/lib/seo";
import { getSeoKeyword } from "@/lib/seoKeywords";
import { GroupCard } from "@/components/group-card";
import { CourtCard } from "@/components/court-card";
import { CasualPlayCard } from "@/components/casual-play-card";
import {
  PlayerProfileForm,
  type ExistingSportProfile,
} from "@/components/player-finder/player-profile-form";
import { TrackedLink } from "@/components/analytics/tracked-link";
import {
  PLAYER_AVAILABILITY_DAYS,
  PLAYER_PLAY_FORMATS,
  PLAYER_SKILL_LEVELS,
  PLAYER_TIME_PREFERENCES,
} from "@/lib/player-finder";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase-server";
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
  secondaryCtaHref?: string;
  secondaryCtaLabel?: string;
  secondaryCtaName?: string;
  locale: Locale;
  sportCode: string;
  type: "court" | "group";
};

function FeatureCarousel({
  title,
  subtitle,
  cards,
  emptyCopy,
  ctaHref,
  ctaLabel,
  secondaryCtaHref,
  secondaryCtaLabel,
  secondaryCtaName,
  locale,
  sportCode,
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
    <section className={`border-t border-slate-200 px-6 py-12 text-[var(--foreground)] md:px-10 md:py-14 ${
      type === "court" ? "bg-[#f7fbf9]" : "bg-white"
    }`}>
      <div className="mx-auto max-w-screen-xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {subtitle}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {secondaryCtaHref && secondaryCtaLabel && (
              <TrackedLink
                href={secondaryCtaHref}
                eventName="sport_cta_click"
                eventPayload={{
                  surface: "sport_feature_carousel",
                  cta: secondaryCtaName ?? secondaryCtaHref,
                  sport: sportCode,
                }}
                className={`inline-flex items-center justify-center px-3 py-1.5 text-xs ${
                  secondaryCtaName === "add_court"
                    ? "rt-btn-court"
                    : "rt-btn-group"
                }`}
              >
                {secondaryCtaLabel}
              </TrackedLink>
            )}
            <TrackedLink
              href={ctaHref}
              eventName="sport_cta_click"
              eventPayload={{
                surface: "sport_feature_carousel",
                cta: ctaHref,
              }}
              className="inline-flex items-center gap-2 [background-color:transparent] text-sm font-semibold text-[var(--rt-primary)] hover:text-[var(--rt-primary-border)]"
            >
              {ctaLabel}
              <ChevronRight
                className="h-4 w-4"
                strokeWidth={1.8}
                aria-hidden
              />
            </TrackedLink>
          </div>
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
                    className="snap-start w-[240px] shrink-0 self-stretch"
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
                        courtSportCode={sportCode}
                        sessions={card.sessions ?? []}
                        playFormat={card.playFormat ?? null}
                        allowWalkIn={card.allowWalkIn}
                        showSessions={false}
                        description={description}
                        showDescription
                        location={locationText || undefined}
                        showLocation={Boolean(locationText)}
                        imageAspectClass="aspect-[4/3]"
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
          <p className="mt-6 text-sm text-slate-500">
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
    <section className="border-t border-slate-200 bg-[#f7fbf9] px-6 py-12 text-[var(--foreground)] md:px-10 md:py-14">
      <div className="mx-auto max-w-screen-xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {subtitle}
            </p>
          </div>
          <TrackedLink
            href={ctaHref}
            eventName="sport_cta_click"
            eventPayload={{
              surface: "sport_casual_play_preview",
              cta: "open_play_invitations",
              sport: sportCode,
            }}
            className="inline-flex items-center gap-2 [background-color:transparent] text-sm font-semibold text-[var(--rt-primary)] hover:text-[var(--rt-primary-border)]"
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
                    className="snap-start w-[240px] shrink-0"
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
          <p className="mt-6 text-sm text-slate-500">
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
  const previewImage = buildAbsoluteUrl(meta.coverImage);
  const previewAlt = `${meta.name[locale]} RacketThailand`;
  const metadataTitle =
    locale === "th" && resolvedParamsValue.sport === "badminton"
      ? "แบดมินตัน: หาก๊วนแบดและสนามแบด | RacketThailand"
      : `${meta.name[locale]} | RacketThailand`;
  return {
    title: metadataTitle,
    description,
    alternates: {
      canonical,
      languages: alternates,
    },
    openGraph: {
      title: metadataTitle,
      description,
      url: canonical,
      type: "website",
      images: [
        {
          url: previewImage,
          width: 819,
          height: 819,
          alt: previewAlt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: metadataTitle,
      description,
      images: [previewImage],
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
  const sport = await buildSportPagePayload(resolvedParamsValue.sport, locale);

  if (!sport) {
    notFound();
  }

  const supabase = await createSupabaseServerClient();
  const [casualPlayResult, authResult] = await Promise.all([
    fetchCasualPlaysBySport(
      sport.code,
      {
        limit: 10,
      },
      locale,
    ),
    supabase.auth.getUser(),
  ]);
  const user = authResult.data.user;
  const isAuthenticated = Boolean(user && !user.is_anonymous);
  let sportProfile: ExistingSportProfile | null = null;
  let hasSportProfileError = false;

  if (isAuthenticated && user) {
    const result = await getSupabaseAdminClient()
      .from("profile_sports")
      .select(
        "profile_id,sport_id,skill_level,rating_system,rating_value,area,availability_days,time_preference,play_format,looking_note,looking_until,allow_group_invites",
      )
      .eq("profile_id", user.id)
      .eq("sport_id", sport.id)
      .maybeSingle();
    sportProfile = result.data as ExistingSportProfile | null;
    hasSportProfileError = Boolean(result.error);
  }

  const courtFeature = sport.features.find((feature) => feature.key === "courts");
  const groupFeature = sport.features.find((feature) => feature.key === "groups");
  const sportMeta = getSportMeta(sport.code);
  const heroImage = sportMeta?.coverImage ?? "/sports/badminton.png";
  const carouselEmptyCopy = t("sport.carouselEmpty");
  const viewAllLabel = t("sport.viewAll");
  const boardCta = t("community.boardCta");
  const sportProfileCopy = {
    sport: t("playerFinder.profile.sport"),
    skillLevel: t("playerFinder.profile.skillLevel"),
    ratingSystem: t("playerFinder.profile.ratingSystem"),
    ratingSystemPlaceholder: t("playerFinder.profile.ratingSystemPlaceholder"),
    ratingValue: t("playerFinder.profile.ratingValue"),
    area: t("playerFinder.profile.area"),
    areaPlaceholder: t("playerFinder.profile.areaPlaceholder"),
    availabilityDays: t("playerFinder.profile.availabilityDays"),
    timePreference: t("playerFinder.profile.timePreference"),
    playFormat: t("playerFinder.profile.playFormat"),
    lookingNote: t("playerFinder.profile.lookingNote"),
    lookingNotePlaceholder: t("playerFinder.profile.lookingNotePlaceholder"),
    looking: t("playerFinder.profile.looking"),
    lookingHelp: t("playerFinder.profile.lookingHelp"),
    allowGroupInvites: t("playerFinder.profile.allowGroupInvites"),
    save: t("playerFinder.profile.save"),
    saving: t("playerFinder.profile.saving"),
    success: t("playerFinder.profile.success"),
    schemaRequired: t("playerFinder.profile.schemaRequired"),
    genericError: t("playerFinder.genericError"),
    add: t("playerFinder.profile.add"),
    addTitle: t("playerFinder.profile.addTitle"),
    edit: t("playerFinder.profile.edit"),
    viewProfile: t("playerFinder.profile.viewProfile"),
    editTitle: t("playerFinder.profile.editTitle"),
    active: t("playerFinder.profile.active"),
    inactive: t("playerFinder.profile.inactive"),
    statusUpdated: t("playerFinder.profile.statusUpdated"),
    emptyTitle: t("playerFinder.profile.emptyTitle"),
    emptyDescription: t("playerFinder.profile.emptyDescription"),
    allSportsAdded: t("playerFinder.profile.allSportsAdded"),
    notSet: t("playerFinder.profile.notSet"),
    yes: t("playerFinder.profile.yes"),
    no: t("playerFinder.profile.no"),
    cancel: t("playerFinder.profile.cancel"),
  };
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
  return (
    <div className="min-h-screen bg-[#f7fbf9] text-[var(--foreground)]">
      <HeaderSportScope sportSlug={sport.code} />
      <HeaderSubLabel value={sport.name[locale]} />
      <section className="relative isolate overflow-hidden border-b border-slate-800 bg-[#10281e] text-white">
        <div
          aria-hidden
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-[#10281e]/35"
        />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(90deg, rgba(8, 31, 23, 0.96) 0%, rgba(8, 31, 23, 0.9) 36%, rgba(8, 31, 23, 0.5) 65%, rgba(8, 31, 23, 0.12) 100%)",
          }}
        />
        <div className="relative mx-auto flex min-h-[390px] max-w-screen-xl flex-col justify-end px-6 py-10 md:min-h-[440px] md:px-10 md:py-14">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3 text-sm font-semibold text-white/80">
              <span
                aria-hidden
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: sport.accent }}
              />
              <span>{sport.name[locale]}</span>
            </div>
            <h1 className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-white md:text-5xl">
              {sport.hero.headline[locale]}
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-white/80 md:text-base md:leading-7">
              {sport.hero.description[locale]}
            </p>
          </div>

          <div className="mt-7 flex flex-wrap gap-3">
            <TrackedLink
              href={buildLocalizedPath(`/${sport.code}/court-finder`, locale)}
              eventName="sport_cta_click"
              eventPayload={{
                surface: "sport_hero",
                cta: "open_court_finder",
                sport: sport.code,
              }}
              className="inline-flex items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-slate-100"
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
              className="inline-flex items-center justify-center rounded-full border border-white/45 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:border-white/80 hover:bg-white/20"
            >
              {t("sport.groupFinderCta")}
            </TrackedLink>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-medium text-white/80">
            <TrackedLink
              href={buildLocalizedPath(
                `/${sport.code}/players?view=invitations`,
                locale,
              )}
              eventName="sport_cta_click"
              eventPayload={{
                surface: "sport_hero",
                cta: "open_play_invitations",
                sport: sport.code,
              }}
              className="transition hover:text-white"
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
              className="transition hover:text-white"
            >
              {boardCta}
            </TrackedLink>
          </div>

          <div className="mt-8 grid w-full max-w-md grid-cols-2 divide-x divide-white/20 overflow-hidden rounded-lg border border-white/20 bg-slate-950/30 backdrop-blur-sm">
            {sport.hero.stats.map((stat) => {
              const href =
                stat.key === "courts"
                  ? buildLocalizedPath(`/${sport.code}/court-finder`, locale)
                  : buildLocalizedPath(`/${sport.code}/group-finder`, locale);

              return (
                <TrackedLink
                  key={stat.key}
                  href={href}
                  eventName="sport_cta_click"
                  eventPayload={{
                    surface: "sport_stat_card",
                    cta: `open_${stat.key}`,
                    sport: sport.code,
                  }}
                  className="group flex items-center gap-3 px-4 py-3 transition hover:bg-white/10"
                  aria-label={`${t(`sport.stats.${stat.key}`)}: ${stat.value}`}
                >
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-white">
                    {renderStatIcon(stat.key)}
                  </span>
                  <span>
                    <span className="block text-lg font-semibold leading-none text-white">
                      {stat.value}
                    </span>
                    <span className="mt-1 block text-[11px] font-semibold text-white/65">
                      {t(`sport.stats.${stat.key}`)}
                    </span>
                  </span>
                </TrackedLink>
              );
            })}
          </div>
        </div>
      </section>
      {isAuthenticated && (
        <section className="border-b border-slate-200 bg-white px-6 py-10 text-[var(--foreground)] md:px-10 md:py-12">
          <div className="mx-auto max-w-screen-xl">
            <div className="max-w-3xl">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                {t("playerFinder.profile.sportPageTitle", {
                  sport: sport.name[locale],
                })}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {t("playerFinder.profile.sportPageSubtitle")}
              </p>

              {hasSportProfileError && (
                <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  {sportProfileCopy.schemaRequired}
                </div>
              )}

              <div className="mt-6">
                <PlayerProfileForm
                  sports={[
                    {
                      id: sport.id,
                      code: sport.code,
                      label: sport.name[locale],
                    },
                  ]}
                  initialSportId={sport.id}
                  existingProfiles={sportProfile ? [sportProfile] : []}
                  skillOptions={PLAYER_SKILL_LEVELS.map((value) => ({
                    value,
                    label: t(`playerFinder.skills.${value}`),
                  }))}
                  timeOptions={PLAYER_TIME_PREFERENCES.map((value) => ({
                    value,
                    label: t(`playerFinder.times.${value}`),
                  }))}
                  formatOptions={PLAYER_PLAY_FORMATS.map((value) => ({
                    value,
                    label: t(`playerFinder.formats.${value}`),
                  }))}
                  dayOptions={PLAYER_AVAILABILITY_DAYS.map((value) => ({
                    value,
                    label: t(`groups.days.${value}`),
                  }))}
                  copy={sportProfileCopy}
                  singleSportMode
                />
              </div>
            </div>
          </div>
        </section>
      )}
      {casualPlayResult.plays.length > 0 && (
        <CasualPlayPreviewSection
          title={t("sport.latestCasualPlaysTitle")}
          subtitle={t("sport.latestCasualPlaysSubtitle", {
            sport: sport.name[locale],
          })}
          emptyCopy={carouselEmptyCopy}
          ctaHref={buildLocalizedPath(
            `/${sport.code}/players?view=invitations`,
            locale,
          )}
          ctaLabel={t("sport.casualPlaysCta")}
          locale={locale}
          sportCode={sport.code}
          plays={casualPlayResult.plays}
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
          secondaryCtaHref={buildLocalizedPath(
            `/groups/create?sport=${sport.code}`,
            locale,
          )}
          secondaryCtaLabel={t("header.createGroup")}
          secondaryCtaName="create_group"
          locale={locale}
          sportCode={sport.code}
          type="group"
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
          secondaryCtaHref={buildLocalizedPath(
            `/courts/new?sport=${sport.code}`,
            locale,
          )}
          secondaryCtaLabel={t("courtSubmission.submit")}
          secondaryCtaName="add_court"
          locale={locale}
          sportCode={sport.code}
          type="court"
        />
      )}
    </div>
  );
}
