import { redirect } from "next/navigation";
import { GroupCreationForm } from "@/components/groups/group-creation-form";
import type { Option } from "@/components/groups/group-form";
import { BaseBackLink } from "@/components/base-back-link";
import { BaseCard } from "@/components/base-card";
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
      label: sport.name ?? sport.code,
    })) ?? [];

  const sportLabelMap = new Map(
    sportsRes.data?.map((sport) => [sport.id, sport.name ?? sport.code]) ?? [],
  );

  const courts = courtsRes.data?.reduce<Record<string, Option[]>>(
    (acc, court) => {
      if (!court.sport_id) return acc;
      const sportLabel = court.sport_id
        ? sportLabelMap.get(court.sport_id)
        : null;
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
    scheduleLabel: t("groups.form.scheduleLabel"),
    scheduleRemove: t("groups.form.scheduleRemove"),
    scheduleDay: t("groups.form.scheduleDay"),
    scheduleStart: t("groups.form.scheduleStart"),
    scheduleEnd: t("groups.form.scheduleEnd"),
    playerAmountLabel: t("groups.form.playerAmountLabel"),
    playerAmountPlaceholder: t("groups.form.playerAmountPlaceholder"),
    playerAmountHelp: t("groups.form.playerAmountHelp"),
    phoneLabel: t("groups.form.phoneLabel"),
    phonePlaceholder: t("groups.form.phonePlaceholder"),
    lineLabel: t("groups.form.lineLabel"),
    linePlaceholder: t("groups.form.linePlaceholder"),
    lineQrLabel: t("groups.form.lineQrLabel"),
    photos: t("groups.form.photos"),
    submit: t("groups.form.submit"),
    submitting: t("groups.form.submitting"),
    success: t("groups.form.success"),
    error: t("groups.form.error"),
  };
  const primarySportSlug = sportsRes.data?.[0]?.code ?? null;
  const backHref = buildLocalizedPath(
    primarySportSlug ? `/${primarySportSlug}/group-finder` : "/",
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
          <p className="text-xs font-semibold uppercase text-[rgb(var(--foreground-rgb)/0.55)]">
            Community · Groups
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
              <GroupCreationForm
                sports={sports}
                courts={courts}
                copy={copy}
                dayOptions={dayOptions}
              />
            </div>
          )}
        </BaseCard>
      </main>
    </div>
  );
}
