import Link from "next/link";
import { redirect } from "next/navigation";
import { GroupCreationForm } from "@/components/groups/group-creation-form";
import type { Option } from "@/components/groups/group-form";
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
    photos: t("groups.form.photos"),
    submit: t("groups.form.submit"),
    submitting: t("groups.form.submitting"),
    success: t("groups.form.success"),
    error: t("groups.form.error"),
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <main className="mx-auto flex max-w-5xl flex-col gap-8 px-6 pb-20 pt-10 md:px-10">
        <section className="rounded-[32px] border border-slate-200 bg-white/90 p-8 shadow-2xl shadow-slate-200/70 backdrop-blur">
          <p className="text-xs uppercase tracking-[0.35em] text-slate-400">
            Community · Groups
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-900">
            {copy.title}
          </h1>
          <p className="mt-2 text-sm text-slate-600">{copy.subtitle}</p>
          {sports.length === 0 ? (
            <p className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
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
        </section>
        <section>
          <Link
            href={buildLocalizedPath("/", locale)}
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-500"
          >
            {t("landing.cardCta")}
          </Link>
        </section>
      </main>
    </div>
  );
}
