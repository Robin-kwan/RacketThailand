import { redirect } from "next/navigation";
import { BaseBackLink } from "@/components/base-back-link";
import { BaseCard } from "@/components/base-card";
import { CasualPlayCreationForm } from "@/components/casual-plays/casual-play-creation-form";
import type { Option } from "@/components/groups/group-form";
import { SPORT_META } from "@/data/sportMeta";
import {
  getMaxCasualPlayDateString,
  getThailandTodayDateString,
} from "@/lib/casual-play";
import {
  buildLocalizedPath,
  getTranslator,
  normalizeLocale,
} from "@/lib/i18n";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseSelect } from "@/lib/supabaseRest";

type SearchParams = { lang?: string };
type SearchParamsInput = Promise<SearchParams> | undefined;

async function resolveSearchParams(
  searchParams?: SearchParamsInput,
): Promise<SearchParams | undefined> {
  if (!searchParams) return undefined;
  return searchParams;
}

export default async function CreateCasualPlayPage({
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
    redirect(buildLocalizedPath("/login", locale));
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
      sport_id: string | null;
    }>("courts", {
      select: "id,name,province,sport_id",
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

  const courts = courtsRes.data?.reduce<Record<string, Option[]>>(
    (acc, court) => {
      if (!court.sport_id) return acc;
      const sportLabel = sportLabelMap.get(court.sport_id);
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
      acc[court.sport_id] = acc[court.sport_id]
        ? [...acc[court.sport_id], entry]
        : [entry];
      return acc;
    },
    {},
  ) ?? {};

  const minDate = getThailandTodayDateString();
  const maxDate = getMaxCasualPlayDateString();
  const playDateHelp = t("casualPlays.form.playDateHelp");

  const copy = {
    title: t("casualPlays.createTitle"),
    subtitle: t("casualPlays.createSubtitle"),
    sport: t("casualPlays.form.sport"),
    titleLabel: t("casualPlays.form.title"),
    description: t("casualPlays.form.description"),
    court: t("casualPlays.form.court"),
    courtHelp: t("casualPlays.form.courtHelp"),
    courtEmpty: t("casualPlays.form.courtEmpty"),
    venueName: t("casualPlays.form.venueName"),
    venueNamePlaceholder: t("casualPlays.form.venueNamePlaceholder"),
    locationNote: t("casualPlays.form.locationNote"),
    locationNotePlaceholder: t("casualPlays.form.locationNotePlaceholder"),
    playDate: t("casualPlays.form.playDate"),
    playDateHelp,
    startTime: t("casualPlays.form.startTime"),
    endTime: t("casualPlays.form.endTime"),
    endTimeHelp: t("casualPlays.form.endTimeHelp"),
    clearTime: t("casualPlays.form.clearTime"),
    playerAmountLabel: t("casualPlays.form.playerAmountLabel"),
    playerAmountPlaceholder: t("casualPlays.form.playerAmountPlaceholder"),
    playerAmountHelp: t("casualPlays.form.playerAmountHelp"),
    phoneLabel: t("casualPlays.form.phoneLabel"),
    phonePlaceholder: t("casualPlays.form.phonePlaceholder"),
    lineLabel: t("casualPlays.form.lineLabel"),
    linePlaceholder: t("casualPlays.form.linePlaceholder"),
    contactVisibilityLabel: t("casualPlays.form.contactVisibilityLabel"),
    contactVisibilityHelp: t("casualPlays.form.contactVisibilityHelp"),
    allowPublicContactLabel: t("casualPlays.form.allowPublicContactLabel"),
    requestToJoinLabel: t("casualPlays.form.requestToJoinLabel"),
    submit: t("casualPlays.form.submit"),
    submitting: t("casualPlays.form.submitting"),
    success: t("casualPlays.form.success"),
    error: t("casualPlays.form.error"),
  };
  const primarySportSlug = sportsRes.data?.[0]?.code ?? null;
  const backHref = buildLocalizedPath(
    primarySportSlug ? `/${primarySportSlug}/casual-plays` : "/",
    locale,
  );

  return (
    <div className="rt-page">
      <main className="mx-auto flex max-w-5xl flex-col gap-8 px-6 pb-20 pt-10 md:px-10">
        <BaseBackLink href={backHref}>{t("casualPlays.detail.back")}</BaseBackLink>
        <BaseCard
          as="section"
          className="rounded-[32px] border border-slate-200 bg-white p-8"
        >
          <p className="text-xs font-semibold uppercase text-[rgb(var(--foreground-rgb)/0.55)]">
            Community · Casual plays
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-[var(--foreground)]">
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
              <CasualPlayCreationForm
                sports={sports}
                courts={courts}
                copy={{
                  sport: copy.sport,
                  title: copy.titleLabel,
                  description: copy.description,
                  court: copy.court,
                  courtHelp: copy.courtHelp,
                  courtEmpty: copy.courtEmpty,
                  venueName: copy.venueName,
                  venueNamePlaceholder: copy.venueNamePlaceholder,
                  locationNote: copy.locationNote,
                  locationNotePlaceholder: copy.locationNotePlaceholder,
                  playDate: copy.playDate,
                  playDateHelp: copy.playDateHelp,
                  startTime: copy.startTime,
                  endTime: copy.endTime,
                  endTimeHelp: copy.endTimeHelp,
                  clearTime: copy.clearTime,
                  playerAmountLabel: copy.playerAmountLabel,
                  playerAmountPlaceholder: copy.playerAmountPlaceholder,
                  playerAmountHelp: copy.playerAmountHelp,
                  phoneLabel: copy.phoneLabel,
                  phonePlaceholder: copy.phonePlaceholder,
                  lineLabel: copy.lineLabel,
                  linePlaceholder: copy.linePlaceholder,
                  contactVisibilityLabel: copy.contactVisibilityLabel,
                  contactVisibilityHelp: copy.contactVisibilityHelp,
                  allowPublicContactLabel: copy.allowPublicContactLabel,
                  requestToJoinLabel: copy.requestToJoinLabel,
                  submit: copy.submit,
                  submitting: copy.submitting,
                  success: copy.success,
                  error: copy.error,
                }}
                locale={locale}
                minDate={minDate}
                maxDate={maxDate}
              />
            </div>
          )}
        </BaseCard>
      </main>
    </div>
  );
}
