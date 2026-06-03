import { redirect } from "next/navigation";
import { GroupCreationForm } from "@/components/groups/group-creation-form";
import type { Option } from "@/components/groups/group-form";
import { BaseBackLink } from "@/components/base-back-link";
import { BaseCard } from "@/components/base-card";
import { SPORT_META } from "@/data/sportMeta";
import {
  buildLocalizedPath,
  getTranslator,
  normalizeLocale,
} from "@/lib/i18n";
import { buildAuthPagePath } from "@/lib/auth-redirect";
import { buildLineQrUploaderCopy } from "@/lib/line-qr-uploader-copy";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseSelect } from "@/lib/supabaseRest";
import { fetchSportIdsByCourtIds } from "@/server/courtSports";

type SearchParams = { lang?: string; sport?: string; court?: string };
type SearchParamsInput = Promise<SearchParams> | undefined;

async function resolveSearchParams(
  searchParams?: SearchParamsInput,
): Promise<SearchParams | undefined> {
  if (!searchParams) return undefined;
  return searchParams;
}

export default async function CreateGroupPage({
  searchParams,
}: {
  searchParams?: SearchParamsInput;
}) {
  const resolved = await resolveSearchParams(searchParams);
  const locale = normalizeLocale(resolved?.lang);
  const t = await getTranslator(locale);
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const redirectParams = new URLSearchParams();
    if (resolved?.sport) {
      redirectParams.set("sport", resolved.sport);
    }
    if (resolved?.court) {
      redirectParams.set("court", resolved.court);
    }
    const redirectQuery = redirectParams.toString();
    const redirectTo = redirectQuery
      ? `/groups/create?${redirectQuery}`
      : "/groups/create";
    redirect(buildAuthPagePath("/login", locale, redirectTo));
  }

  const [sportsRes, courtsRes] = await Promise.all([
    supabaseSelect<{ id: string; name: string | null; code: string }>(
      "sports",
      { select: "id,name,code", order: "name.asc.nullslast" },
    ),
    supabaseSelect<{
      id: string;
      name: string | null;
      province: string | null;

    }>("courts", {
      select: "id,name,province",
      order: "name.asc.nullslast",
    }),
  ]);

  const sports =
    sportsRes.data?.map((sport) => ({
      value: sport.id,
      label: SPORT_META[sport.code]?.name[locale] ?? sport.name ?? sport.code,
    })) ?? [];

  const sportLabelMap = new Map(
    sportsRes.data?.map((sport) => [
      sport.id,
      SPORT_META[sport.code]?.name[locale] ?? sport.name ?? sport.code,
    ]) ?? [],
  );
  const courtSportIdsByCourtId = await fetchSportIdsByCourtIds(
    courtsRes.data?.map((court) => court.id) ?? [],
  );

  const courts = courtsRes.data?.reduce<Record<string, Option[]>>(
    (acc, court) => {
      const sportIds = Array.from(
        new Set(courtSportIdsByCourtId.get(court.id) ?? []),
      );
      sportIds.forEach((sportId) => {
        const sportLabel = sportLabelMap.get(sportId);
        const labelParts = [court.name ?? "Unnamed court"];
        if (court.province) {
          labelParts.push(court.province);
        }
        if (sportLabel) {
          labelParts.push(sportLabel);
        }
        const entry = {
          value: court.id,
          label: labelParts.join(" · "),
        };
        acc[sportId] = acc[sportId] ? [...acc[sportId], entry] : [entry];
      });
      return acc;
    },
    {},
  ) ?? {};

  const dayKeys = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ] as const;
  const dayOptions = dayKeys.map((day) => ({
    value: day,
    label: t(`groups.days.${day}`),
  }));

  const copy = {
    title: t("groups.createTitle"),
    subtitle: t("groups.createSubtitle"),
    sport: t("groups.form.sport"),
    name: t("groups.form.name"),
    description: t("groups.form.description"),
    sessionsLabel: t("groups.form.sessionsLabel"),
    sessionsAddCourt: t("groups.form.sessionsAddCourt"),
    sessionsAddSlot: t("groups.form.sessionsAddSlot"),
    sessionsRemoveCourt: t("groups.form.sessionsRemoveCourt"),
    sessionsEmpty: t("groups.form.sessionsEmpty"),
    sessionCourt: t("groups.form.sessionCourt"),
    noOptionsFound: t("forms.noOptionsFound"),
    scheduleLabel: t("groups.form.scheduleLabel"),
    scheduleOptionalEmpty: t("groups.form.scheduleOptionalEmpty"),
    scheduleRemove: t("groups.form.scheduleRemove"),
    scheduleDay: t("groups.form.scheduleDay"),
    scheduleStart: t("groups.form.scheduleStart"),
    scheduleEnd: t("groups.form.scheduleEnd"),
    playFormatLabel: t("groups.form.playFormatLabel"),
    playFormatSingle: t("groups.form.playFormatSingle"),
    playFormatDouble: t("groups.form.playFormatDouble"),
    playerAmountLabel: t("groups.form.playerAmountLabel"),
    playerAmountPlaceholder: t("groups.form.playerAmountPlaceholder"),
    playerAmountHelp: t("groups.form.playerAmountHelp"),
    allowWalkInLabel: t("groups.form.allowWalkInLabel"),
    allowWalkInHelp: t("groups.form.allowWalkInHelp"),
    phoneLabel: t("groups.form.phoneLabel"),
    phonePlaceholder: t("groups.form.phonePlaceholder"),
    lineLabel: t("groups.form.lineLabel"),
    linePlaceholder: t("groups.form.linePlaceholder"),
    lineQrLabel: t("groups.form.lineQrLabel"),
    lineQrUploader: buildLineQrUploaderCopy(t),
    photos: t("groups.form.photos"),
    submit: t("groups.form.submit"),
    submitting: t("groups.form.submitting"),
    success: t("groups.form.success"),
    error: t("groups.form.error"),
    primaryPhoto: t("groups.form.primaryPhoto"),
    makePrimaryPhoto: t("groups.form.makePrimaryPhoto"),
    photoUploadHelper: t("groups.form.photoUploadHelper"),
    photoProcessError: t("groups.form.photoProcessError"),
  };
  const requestedSport = resolved?.sport?.trim().toLowerCase();
  const sourceSport = requestedSport
    ? sportsRes.data?.find(
        (sport) =>
          sport.code.toLowerCase() === requestedSport ||
          sport.id.toLowerCase() === requestedSport,
      )
    : null;
  const defaultSportId = sourceSport?.id;
  const defaultCourtId =
    defaultSportId &&
    resolved?.court &&
    courts[defaultSportId]?.some((court) => court.value === resolved.court)
      ? resolved.court
      : undefined;
  const backHref = buildLocalizedPath(
    sourceSport ? `/${sourceSport.code}/group-finder` : "/",
    locale,
  );

  return (
    <div className="rt-page">
      <main className="mx-auto flex max-w-5xl flex-col gap-8 px-6 pb-20 pt-10 md:px-10">
        <BaseBackLink href={backHref}>{t("groups.detail.back")}</BaseBackLink>
        <BaseCard
          as="section"
          className="rounded-[32px] border border-slate-200 bg-white p-8"
        >
          <h1 className="text-xl font-semibold text-[var(--foreground)]">
            {copy.title}
          </h1>
          <p className="mt-2 text-sm text-[rgb(var(--foreground-rgb)/0.75)]">
            {copy.subtitle}
          </p>
          {sports.length === 0 ? (
            <p className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-[rgb(var(--foreground-rgb)/0.02)] p-4 text-sm text-[rgb(var(--foreground-rgb)/0.7)]">
              {t("sport.featureEmpty")}
            </p>
          ) : (
            <div className="mt-6">
              <GroupCreationForm
                sports={sports}
                courts={courts}
                copy={copy}
                dayOptions={dayOptions}
                locale={locale}
                defaultSportId={defaultSportId}
                preselectFirstSport={Boolean(defaultSportId)}
                defaultCourtId={defaultCourtId}
              />
            </div>
          )}
        </BaseCard>
      </main>
    </div>
  );
}
