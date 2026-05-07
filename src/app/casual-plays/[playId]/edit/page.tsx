import { notFound, redirect } from "next/navigation";
import { BaseBackLink } from "@/components/base-back-link";
import { BaseCard } from "@/components/base-card";
import { CasualPlayEditForm } from "@/components/casual-plays/casual-play-edit-form";
import { EntityDeleteButton } from "@/components/entity-delete-button";
import type { Option } from "@/components/groups/group-form";
import {
  getMaxCasualPlayDateString,
  getThailandTodayDateString,
  isCasualPlayExpired,
} from "@/lib/casual-play";
import {
  buildLocalizedPath,
  getTranslator,
  normalizeLocale,
} from "@/lib/i18n";
import { SPORT_META } from "@/data/sportMeta";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseSelect } from "@/lib/supabaseRest";

type Params = { playId: string };
type ParamsInput = Promise<Params>;
type SearchParams = { lang?: string };
type SearchParamsInput = Promise<SearchParams> | undefined;

type CasualPlayEditRow = {
  id: string;
  sport_id: string;
  title: string | null;
  description: string | null;
  owner_id: string | null;
  play_date: string;
  start_time: string | null;
  end_time: string | null;
  player_amount: number | null;
  phone: string | null;
  line_id: string | null;
  allow_public_contact: boolean | null;
  court_id: string | null;
  venue_name: string | null;
  location_note: string | null;
  sports: { code: string | null } | null;
};

async function resolveParams(params: ParamsInput): Promise<Params> {
  return params;
}

async function resolveSearchParams(
  searchParams?: SearchParamsInput,
): Promise<SearchParams | undefined> {
  if (!searchParams) return undefined;
  return searchParams;
}

export default async function EditCasualPlayPage({
  params,
  searchParams,
}: {
  params: ParamsInput;
  searchParams?: SearchParamsInput;
}) {
  const resolvedParams = await resolveParams(params);
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidPattern.test(resolvedParams.playId)) {
    notFound();
  }

  const resolvedSearch = await resolveSearchParams(searchParams);
  const locale = normalizeLocale(resolvedSearch?.lang);
  const t = await getTranslator(locale);
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(buildLocalizedPath("/login", locale));
  }

  const { data: playRows } = await supabaseSelect<CasualPlayEditRow>(
    "casual_plays",
    {
      select:
        "id,sport_id,title,description,owner_id,play_date,start_time,end_time,player_amount,phone,line_id,allow_public_contact,court_id,venue_name,location_note,sports(code)",
      id: `eq.${resolvedParams.playId}`,
      limit: "1",
    },
  );
  const play = playRows?.[0];

  if (!play || isCasualPlayExpired(play.play_date)) {
    notFound();
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("status")
    .eq("id", user.id)
    .single();
  const isAdmin = profile?.status === "admin";

  if (!isAdmin && play.owner_id !== user.id) {
    redirect(buildLocalizedPath(`/casual-plays/${play.id}`, locale));
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

  const formPlay = {
    id: play.id,
    sportId: play.sport_id,
    title: play.title ?? "",
    description: play.description ?? "",
    courtId: play.court_id ?? "",
    venueName: play.venue_name ?? "",
    locationNote: play.location_note ?? "",
    playDate: play.play_date,
    startTime: play.start_time?.slice(0, 5) ?? "",
    endTime: play.end_time?.slice(0, 5) ?? "",
    playerAmount:
      typeof play.player_amount === "number"
        ? String(play.player_amount)
        : "",
    phone: play.phone ?? "",
    lineId: play.line_id ?? "",
    allowPublicContact: play.allow_public_contact === true,
  };
  const currentSportSlug = play.sports?.code ?? undefined;

  const copy = {
    title: t("casualPlays.edit.title"),
    subtitle: t("casualPlays.edit.subtitle"),
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
    submit: t("casualPlays.edit.submit"),
    submitting: t("casualPlays.edit.submitting"),
    success: t("casualPlays.edit.success"),
    error: t("casualPlays.edit.error"),
    deleteSubmit: t("casualPlays.edit.deleteSubmit"),
    deleting: t("casualPlays.edit.deleting"),
    deleteSuccess: t("casualPlays.edit.deleteSuccess"),
    deleteError: t("casualPlays.edit.deleteError"),
    deleteConfirm: t("casualPlays.edit.deleteConfirm"),
    deleteCancel: t("casualPlays.edit.deleteCancel"),
  };
  const deleteRedirectHref = buildLocalizedPath(
    currentSportSlug ? `/${currentSportSlug}/casual-plays` : "/",
    locale,
  );

  return (
    <div className="rt-page">
      <main className="mx-auto flex max-w-5xl flex-col gap-8 px-6 pb-20 pt-10 md:px-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <BaseBackLink
            href={buildLocalizedPath(`/casual-plays/${play.id}`, locale)}
          >
            {t("casualPlays.edit.back")}
          </BaseBackLink>
          <EntityDeleteButton
            endpoint={`/api/casual-plays/${play.id}`}
            redirectHref={deleteRedirectHref}
            copy={{
              submit: copy.deleteSubmit,
              deleting: copy.deleting,
              success: copy.deleteSuccess,
              error: copy.deleteError,
              confirm: copy.deleteConfirm,
              cancel: copy.deleteCancel,
            }}
          />
        </div>
        <BaseCard
          as="section"
          className="rounded-[32px] border border-slate-200 bg-white p-8"
        >
          <p className="text-xs font-semibold uppercase text-[rgb(var(--foreground-rgb)/0.55)]">
            Casual plays · Edit
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-[var(--foreground)]">
            {copy.title}
          </h1>
          <p className="mt-2 text-sm text-[rgb(var(--foreground-rgb)/0.75)]">
            {copy.subtitle}
          </p>
          <div className="mt-6">
            <CasualPlayEditForm
              play={formPlay}
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
        </BaseCard>
      </main>
    </div>
  );
}
