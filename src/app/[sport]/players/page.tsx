import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TrackedLink } from "@/components/analytics/tracked-link";
import { BaseCard } from "@/components/base-card";
import { CasualPlayFinder } from "@/components/casual-play-finder";
import { HeaderSubLabel } from "@/components/header-sub-label";
import { SportFinderHero } from "@/components/sport-finder-hero";
import { PlayerFinderFilters } from "@/components/player-finder/player-finder-filters";
import { RequestPlayButton } from "@/components/player-finder/request-play-button";
import { getSportMeta } from "@/data/sportMeta";
import { buildAuthPagePath } from "@/lib/auth-redirect";
import { buildLocalizedPath, getTranslator, normalizeLocale } from "@/lib/i18n";
import { PLAYER_SKILL_LEVELS } from "@/lib/player-finder";
import { buildCanonicalUrl, buildLocaleAlternates } from "@/lib/seo";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { fetchCasualPlaysBySport } from "@/server/casualPlays";
import { fetchActivePlayersBySport } from "@/server/playerFinder";

type Params = Promise<{ sport: string }>;
type SearchParams =
  | Promise<{
      lang?: string;
      area?: string;
      skill?: string;
      view?: string;
    }>
  | undefined;

function cleanFilter(value?: string) {
  return typeof value === "string" ? value.trim().slice(0, 120) : "";
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Params;
  searchParams?: SearchParams;
}): Promise<Metadata> {
  const { sport } = await params;
  const resolvedSearch = searchParams ? await searchParams : undefined;
  const locale = normalizeLocale(resolvedSearch?.lang);
  const meta = getSportMeta(sport);
  if (!meta) return { title: "Player Finder | RacketThailand" };
  const path = `/${sport}/players`;
  const title =
    locale === "th"
      ? `หาเพื่อนเล่น${meta.name.th} | RacketThailand`
      : `Find people to play ${meta.name.en} with | RacketThailand`;
  const description =
    locale === "th"
      ? `ค้นหาผู้เล่น${meta.name.th}ที่พร้อมเล่นและนัดเล่นที่กำลังเปิดรับผู้เล่น`
      : `Find active ${meta.name.en} players and one-off play invitations near you.`;
  return {
    title,
    description,
    alternates: {
      canonical: buildCanonicalUrl(path, locale),
      languages: buildLocaleAlternates(path),
    },
  };
}

export default async function PlayerFinderPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams?: SearchParams;
}) {
  const { sport } = await params;
  const resolvedSearch = searchParams ? await searchParams : undefined;
  const locale = normalizeLocale(resolvedSearch?.lang);
  const t = await getTranslator(locale);
  const meta = getSportMeta(sport);
  if (!meta) notFound();

  const view =
    resolvedSearch?.view === "invitations" ? "invitations" : "players";
  const area = cleanFilter(resolvedSearch?.area);
  const skill = PLAYER_SKILL_LEVELS.includes(
    resolvedSearch?.skill as (typeof PLAYER_SKILL_LEVELS)[number],
  )
    ? (resolvedSearch?.skill ?? "")
    : "";
  const [playerData, playData] = await Promise.all([
    view === "players"
      ? fetchActivePlayersBySport(sport, {
          area: area || undefined,
          skillLevel: skill || undefined,
        })
      : Promise.resolve(null),
    view === "invitations"
      ? fetchCasualPlaysBySport(sport, { limit: 12 }, locale)
      : Promise.resolve(null),
  ]);
  const activeSport = playerData?.sport ?? playData?.sport;
  if (!activeSport) notFound();

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: ownSportProfile } = user
    ? await supabase
        .from("profile_sports")
        .select("profile_id")
        .eq("profile_id", user.id)
        .eq("sport_id", activeSport.id)
        .maybeSingle()
    : { data: null };
  const profileHref = buildLocalizedPath(
    `/profile/edit?sport=${encodeURIComponent(sport)}#sport-profile`,
    locale,
  );
  const finderPath = `/${sport}/players`;
  const playerViewHref = buildLocalizedPath(finderPath, locale);
  const invitationsViewHref = buildLocalizedPath(
    `${finderPath}?view=invitations`,
    locale,
  );
  const requestCopy = {
    requestToPlay: t("playerFinder.requestToPlay"),
    requestMessage: t("playerFinder.requestMessage"),
    sendRequest: t("playerFinder.sendRequest"),
    sending: t("playerFinder.sending"),
    requestSent: t("playerFinder.requestSent"),
    signInToRequest: t("playerFinder.signInToRequest"),
    profileRequired: t("playerFinder.profileRequired"),
    cancel: t("playerFinder.cancel"),
    genericError: t("playerFinder.genericError"),
  };
  const casualPlayCopy = {
    searchPlaceholder: t("casualPlays.searchPlaceholder"),
    reset: t("casualPlays.reset"),
    emptyTitle: t("casualPlays.emptyTitle"),
    emptyDescription: t("casualPlays.emptyDescription"),
    dateLabel: t("casualPlays.dateLabel"),
    nearbyButton: t("casualPlays.nearbyButton"),
    nearbyFinding: t("casualPlays.nearbyFinding"),
    nearbyClear: t("casualPlays.nearbyClear"),
    nearbyUnsupported: t("casualPlays.nearbyUnsupported"),
    nearbyDenied: t("casualPlays.nearbyDenied"),
    nearbyActive: t("casualPlays.nearbyActive"),
    distanceLabel: t("casualPlays.distanceLabel"),
    mapHeading: t("casualPlays.mapHeading"),
    nearbyListTitle: t("casualPlays.nearbyListTitle"),
    openMaps: t("casualPlays.openMaps"),
    createCta: t("header.createCasualPlay"),
  };

  return (
    <div className="rt-page">
      <HeaderSubLabel value={meta.name[locale]} />
      <main>
        <SportFinderHero
          sportName={meta.name[locale]}
          sportAccent={meta.accent}
          imageUrl={meta.coverImage}
          title={
            view === "invitations"
              ? t("casualPlays.title", { sport: meta.name[locale] })
              : t("playerFinder.title", { sport: meta.name[locale] })
          }
          description={
            view === "invitations"
              ? t("casualPlays.subtitle")
              : t("playerFinder.subtitle")
          }
        >
          {view === "players" && playerData ? (
            <span className="inline-flex items-center rounded-lg border border-white/25 bg-white/10 px-4 py-3 text-sm font-semibold text-white backdrop-blur-sm">
              {t("playerFinder.activeCount", {
                count: playerData.players.length,
              })}
            </span>
          ) : null}
          <Link
            href={buildLocalizedPath("/player-connections", locale)}
            className="inline-flex items-center justify-center rounded-lg border border-white/30 bg-white/10 px-4 py-3 text-sm font-semibold text-white backdrop-blur-sm hover:bg-white/20"
          >
            {t("playerFinder.viewRequests")}
          </Link>
          {view === "players" ? (
            <Link
              href={profileHref}
              className="rt-btn-primary inline-flex items-center justify-center px-5 py-3 text-sm"
            >
              {t("playerFinder.manageProfile")}
            </Link>
          ) : (
            <TrackedLink
              href={buildLocalizedPath(
                `/casual-plays/create?sport=${encodeURIComponent(sport)}`,
                locale,
              )}
              eventName="sport_cta_click"
              eventPayload={{
                surface: "play_finder_header",
                cta: "create_casual_play",
                sport,
              }}
              className="rt-btn-primary inline-flex items-center justify-center px-5 py-3 text-sm"
            >
              {t("header.createCasualPlay")}
            </TrackedLink>
          )}
        </SportFinderHero>
        <section className="border-b border-slate-200 bg-white px-6 py-5 md:px-10">
          <div className="mx-auto w-full max-w-screen-xl">
            <nav
              aria-label={t("playerFinder.viewLabel")}
              className="flex w-full max-w-lg rounded-lg border border-slate-200 bg-slate-50 p-1"
            >
              <Link
                href={playerViewHref}
                aria-current={view === "players" ? "page" : undefined}
                className={`flex min-h-11 flex-1 items-center justify-center rounded-md px-4 py-2 text-center text-sm font-semibold transition-colors ${
                  view === "players"
                    ? "bg-white text-slate-950 shadow-sm"
                    : "text-slate-600 hover:text-slate-950"
                }`}
              >
                {t("playerFinder.playerView")}
              </Link>
              <Link
                href={invitationsViewHref}
                aria-current={view === "invitations" ? "page" : undefined}
                className={`flex min-h-11 flex-1 items-center justify-center rounded-md px-4 py-2 text-center text-sm font-semibold transition-colors ${
                  view === "invitations"
                    ? "bg-white text-slate-950 shadow-sm"
                    : "text-slate-600 hover:text-slate-950"
                }`}
              >
                {t("playerFinder.invitationsView")}
              </Link>
            </nav>
          </div>
        </section>

        {view === "invitations" && playData ? (
          <section className="px-6 py-8 md:px-10 md:py-10">
            <div className="mx-auto w-full max-w-screen-xl">
              <CasualPlayFinder
                sportCode={sport}
                locale={locale}
                copy={casualPlayCopy}
                initialPlays={playData.plays}
              />
            </div>
          </section>
        ) : playerData ? (
          <section className="px-6 py-8 md:px-10 md:py-10">
            <div className="mx-auto w-full max-w-screen-xl">
              <PlayerFinderFilters
                locale={locale}
                area={area}
                skill={skill}
                clearHref={buildLocalizedPath(finderPath, locale)}
                skillOptions={[
                  { value: "", label: t("playerFinder.allSkills") },
                  ...PLAYER_SKILL_LEVELS.map((value) => ({
                    value,
                    label: t(`playerFinder.skills.${value}`),
                  })),
                ]}
                copy={{
                  area: t("playerFinder.areaFilter"),
                  areaPlaceholder: t("playerFinder.areaPlaceholder"),
                  skill: t("playerFinder.skillFilter"),
                  apply: t("playerFinder.applyFilters"),
                  clear: t("playerFinder.clearFilters"),
                }}
              />

              {!playerData.schemaReady ? (
                <div className="mt-8 rounded-lg border border-amber-200 bg-amber-50 px-6 py-10 text-center">
                  <h2 className="text-lg font-semibold text-amber-950">
                    {t("playerFinder.schemaTitle")}
                  </h2>
                  <p className="mt-2 text-sm text-amber-800">
                    {t("playerFinder.schemaDescription")}
                  </p>
                </div>
              ) : playerData.players.length === 0 ? (
                <div className="mt-8 rounded-lg border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
                  <h2 className="text-xl font-semibold text-slate-950">
                    {t("playerFinder.emptyTitle")}
                  </h2>
                  <p className="mt-2 text-sm text-slate-600">
                    {t("playerFinder.emptyDescription")}
                  </p>
                  <Link
                    href={profileHref}
                    className="rt-btn-primary mt-5 inline-flex items-center justify-center px-5 py-2.5 text-sm"
                  >
                    {t("playerFinder.manageProfile")}
                  </Link>
                </div>
              ) : (
                <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {playerData.players.map((player) => {
                    const availability = [
                      ...player.availabilityDays.map((day) =>
                        t(`groups.days.${day}`),
                      ),
                      player.timePreference
                        ? t(`playerFinder.times.${player.timePreference}`)
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" · ");
                    return (
                      <BaseCard
                        as="article"
                        key={player.profileId}
                        className="flex min-h-[20rem] flex-col p-5"
                      >
                        <div className="flex items-start gap-3">
                          <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100 text-lg font-semibold text-slate-600">
                            {player.avatarUrl ? (
                              <Image
                                src={player.avatarUrl}
                                alt=""
                                fill
                                sizes="56px"
                                className="object-cover"
                              />
                            ) : (
                              player.displayName.slice(0, 1).toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h2 className="truncate text-base font-semibold text-slate-950">
                              {player.displayName}
                            </h2>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {player.skillLevel && (
                                <span className="rt-pill px-2.5 py-1 text-xs">
                                  {t(
                                    `playerFinder.skills.${player.skillLevel}`,
                                  )}
                                </span>
                              )}
                              {player.ratingSystem &&
                                player.ratingValue !== null && (
                                  <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                                    {t("playerFinder.rating", {
                                      system: player.ratingSystem,
                                      value: player.ratingValue,
                                    })}
                                  </span>
                                )}
                            </div>
                          </div>
                        </div>

                        <dl className="mt-5 space-y-3 text-sm">
                          {player.area && (
                            <div>
                              <dt className="text-xs font-semibold text-slate-500">
                                {t("playerFinder.profile.area")}
                              </dt>
                              <dd className="mt-1 font-medium text-slate-800">
                                {player.area}
                              </dd>
                            </div>
                          )}
                          {availability && (
                            <div>
                              <dt className="text-xs font-semibold text-slate-500">
                                {t("playerFinder.availability")}
                              </dt>
                              <dd className="mt-1 leading-6 text-slate-700">
                                {availability}
                              </dd>
                            </div>
                          )}
                        </dl>
                        {player.lookingNote && (
                          <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-600">
                            {player.lookingNote}
                          </p>
                        )}

                        {player.profileId !== user?.id && (
                          <div className="mt-auto pt-5">
                            <RequestPlayButton
                              recipientId={player.profileId}
                              sportId={player.sportId}
                              loginHref={buildAuthPagePath(
                                "/login",
                                locale,
                                finderPath,
                              )}
                              profileHref={profileHref}
                              isAuthenticated={Boolean(
                                user && !user.is_anonymous,
                              )}
                              hasOwnProfile={Boolean(ownSportProfile)}
                              copy={requestCopy}
                            />
                          </div>
                        )}
                      </BaseCard>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}
