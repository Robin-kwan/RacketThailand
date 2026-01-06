import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { GroupEditForm } from "@/components/groups/group-edit-form";
import type { Option } from "@/components/groups/group-form";
import {
  buildLocalizedPath,
  getTranslator,
  normalizeLocale,
} from "@/lib/i18n";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseSelect } from "@/lib/supabaseRest";
import { HeaderSubLabel } from "@/components/header-sub-label";
import { HeaderSportScope } from "@/components/header-sport-scope";
import { ensureGroupLineQrUrl } from "@/server/lineQr";

type Params = { groupId: string };
type ParamsInput = Promise<Params>;
type SearchParams = { lang?: string };
type SearchParamsInput = Promise<SearchParams> | undefined;

async function resolveParams(params: ParamsInput): Promise<Params> {
  return params;
}

async function resolveSearchParams(
  searchParams?: SearchParamsInput,
): Promise<SearchParams | undefined> {
  if (!searchParams) return undefined;
  return searchParams;
}

export default async function EditGroupPage({
  params,
  searchParams,
}: {
  params: ParamsInput;
  searchParams?: SearchParamsInput;
}) {
  const resolvedParams = await resolveParams(params);
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("status")
    .eq("id", user.id)
    .single();
  const isAdmin = profile?.status === "admin";

  const { data: groupRows } = await supabaseSelect<{
    id: string;
    sport_id: string;
    name: string | null;
    description: string | null;
    owner_id: string | null;
    player_amount: number | null;
    phone: string | null;
    line_id: string | null;
    line_qr_url: string | null;
  }>("groups", {
    select:
      "id,sport_id,name,description,owner_id,player_amount,phone,line_id,line_qr_url",
    id: `eq.${resolvedParams.groupId}`,
    limit: "1",
  });
  const group = groupRows?.[0];
  if (!group) {
    notFound();
  }
  const resolvedLineQrUrl = await ensureGroupLineQrUrl(
    group.id,
    group.line_qr_url,
  );

  if (!isAdmin && group.owner_id !== user.id) {
    redirect(buildLocalizedPath(`/groups/${group.id}`, locale));
  }

  const { data: sports } = await supabaseSelect<{
    id: string;
    code: string;
    name: string | null;
  }>("sports", {
    select: "id,code,name",
    order: "name.asc.nullslast",
  });

  const { data: courts } = await supabaseSelect<{
    id: string;
    name: string | null;
    province: string | null;
    sport_id: string | null;
  }>("courts", {
    select: "id,name,province,sport_id",
    order: "name.asc.nullslast",
  });

  const { data: sessionRows } = await supabaseSelect<{
    id: string;
    court_id: string;
    day: string;
    start_time: string | null;
    end_time: string | null;
  }>("group_sessions", {
    select: "id,court_id,day,start_time,end_time",
    group_id: `eq.${group.id}`,
    order: "day.asc,start_time.asc",
  });

  const { data: photoRows } = await supabaseSelect<{
    id: string;
    image_url: string | null;
    is_primary: boolean | null;
  }>("group_photos", {
    select: "id,image_url,is_primary",
    group_id: `eq.${group.id}`,
    order: "is_primary.desc,created_at.asc",
  });

  const sportOptions =
    sports?.map((sport) => ({
      value: sport.id,
      label: sport.name ?? sport.code,
    })) ?? [];

  const courtOptions =
    courts?.reduce<Record<string, Option[]>>((acc, court) => {
      if (!court.sport_id) return acc;
      const entry = {
        value: court.id,
        label: court.province
          ? `${court.name ?? "Court"} (${court.province})`
          : court.name ?? "Court",
      };
      acc[court.sport_id] = acc[court.sport_id]
        ? [...acc[court.sport_id], entry]
        : [entry];
      return acc;
    }, {}) ?? {};

  const groupedSessions =
    sessionRows?.reduce((acc, session) => {
      const key = session.court_id;
      const slot = {
        id: session.id,
        day: session.day,
        start: session.start_time ?? "",
        end: session.end_time ?? "",
      };
      const existing = acc.get(key);
      if (existing) {
        existing.slots.push(slot);
      } else {
        acc.set(key, {
          id: key,
          courtId: session.court_id,
          slots: [slot],
        });
      }
      return acc;
    }, new Map<string, { id: string; courtId: string; slots: { id: string; day: string; start: string; end: string }[] }>()) ??
    new Map();

  const groupedArray = Array.from(groupedSessions.values());
  const sportCourtOptions = courtOptions[group.sport_id] ?? [];
  const fallbackCourtId = sportCourtOptions[0]?.value ?? "";
  const sanitizedSessions =
    groupedArray.length > 0
      ? groupedArray.map((block) => {
          const isValid = sportCourtOptions.some(
            (court) => court.value === block.courtId,
          );
          return {
            ...block,
            courtId: isValid ? block.courtId : fallbackCourtId,
          };
        })
      : [];

  const currentSport =
    sports?.find((sport) => sport.id === group.sport_id) ?? null;
  const currentSportSlug = currentSport?.code ?? undefined;
  const currentSportLabel =
    currentSport?.name ?? currentSport?.code ?? undefined;

  const formGroup = {
    id: group.id,
    sportId: group.sport_id,
    name: group.name ?? "",
    description: group.description ?? "",
    sessions: sanitizedSessions,
    playerAmount:
      typeof group.player_amount === "number"
        ? String(group.player_amount)
        : "",
    phone: group.phone ?? "",
    lineId: group.line_id ?? "",
    lineQrUrl: resolvedLineQrUrl ?? null,
  };

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
    submit: t("groups.edit.submit"),
    submitting: t("groups.edit.submitting"),
    success: t("groups.edit.success"),
    error: t("groups.edit.error"),
  };

  return (
    <>
      <HeaderSportScope sportSlug={currentSportSlug} />
      <HeaderSubLabel value={currentSportLabel} />
      <main className="mx-auto flex max-w-5xl flex-col gap-8 px-6 pb-20 pt-10 md:px-10">
      <div>
        <Link
          href={buildLocalizedPath(`/groups/${group.id}`, locale)}
          className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-500"
        >
          ← {t("courtPage.back")}
        </Link>
      </div>
      <section className="rounded-[32px] border border-slate-200 bg-white/90 p-8 shadow-2xl shadow-slate-200/70 backdrop-blur">
        <p className="text-xs font-semibold uppercase text-slate-400">
          Groups · Edit
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-900">
          {t("groups.edit.title")}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          {t("groups.edit.subtitle")}
        </p>
            <div className="mt-6">
              <GroupEditForm
                group={formGroup}
                sports={sportOptions}
                courts={courtOptions}
                dayOptions={dayOptions}
                existingPhotos={photoRows ?? []}
                copy={copy}
              />
            </div>
      </section>
    </main>
    </>
  );
}
