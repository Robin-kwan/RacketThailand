import { notFound } from "next/navigation";
import Link from "next/link";
import { SPORT_META } from "@/data/sportMeta";
import {
  buildLocalizedPath,
  getTranslator,
  normalizeLocale,
} from "@/lib/i18n";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseSelect } from "@/lib/supabaseRest";
import { CourtGallery } from "@/components/court-gallery";

const DAY_LABELS: Record<string, { en: string; th: string }> = {
  sunday: { en: "Sunday", th: "วันอาทิตย์" },
  monday: { en: "Monday", th: "วันจันทร์" },
  tuesday: { en: "Tuesday", th: "วันอังคาร" },
  wednesday: { en: "Wednesday", th: "วันพุธ" },
  thursday: { en: "Thursday", th: "วันพฤหัสบดี" },
  friday: { en: "Friday", th: "วันศุกร์" },
  saturday: { en: "Saturday", th: "วันเสาร์" },
};

function getDayLabel(day: string, locale: string) {
  const lang = locale === "th" ? "th" : "en";
  return DAY_LABELS[day]?.[lang] ?? day;
}

function formatTimeValue(value: string, locale: string) {
  if (!value) return "";
  const [hours, minutes] = value.split(":").map((part) => Number(part));
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return value;
  }
  const formatter = new Intl.DateTimeFormat(
    locale === "th" ? "th-TH" : "en-US",
    { hour: "numeric", minute: "2-digit" },
  );
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return formatter.format(date);
}

function formatTimeRange(start: string, end: string, locale: string) {
  return `${formatTimeValue(start, locale)} – ${formatTimeValue(end, locale)}`;
}

type Params = {
  groupId: string;
};

type SearchParams = {
  lang?: string;
};

type ParamsInput = Promise<Params>;
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

type GroupRow = {
  id: string;
  name: string | null;
  description: string | null;
  sports: { code: string; name: string | null } | null;
  owner_id: string | null;
  updated_at: string | null;
  is_public: boolean | null;
};

type OwnerProfile = {
  id: string;
  display_name: string | null;
  username: string | null;
};

type MemberRow = {
  role: string | null;
  profiles: {
    id: string;
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
};

type GroupPhotoRow = {
  id: string;
  image_url: string | null;
  is_primary: boolean | null;
};

type GroupSessionRow = {
  id: string;
  court_id: string;
  day: string;
  start_time: string | null;
  end_time: string | null;
  courts: {
    id: string;
    name: string | null;
    district: string | null;
    province: string | null;
  } | null;
};

export default async function GroupDetailPage({
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
    data: { user: sessionUser },
  } = await supabase.auth.getUser();

  const { data: groups } = await supabaseSelect<GroupRow>("groups", {
    select: "id,name,description,owner_id,sports(code,name),updated_at,is_public",
    id: `eq.${resolvedParams.groupId}`,
    limit: "1",
  });
  const group = groups?.[0];
  if (!group) {
    notFound();
  }

  const [{ data: owners }, { data: members }, { data: photoRows }, { data: sessionRows }] =
    await Promise.all([
      group.owner_id
        ? supabaseSelect<OwnerProfile>("profiles", {
            select: "id,display_name,username",
            id: `eq.${group.owner_id}`,
            limit: "1",
          })
        : Promise.resolve({ data: [] as OwnerProfile[] }),
      supabaseSelect<MemberRow>("group_members", {
        select: "role,profiles(id,display_name,username,avatar_url)",
        group_id: `eq.${group.id}`,
        order: "joined_at.asc",
      }),
      supabaseSelect<GroupPhotoRow>("group_photos", {
        select: "id,image_url,is_primary",
        group_id: `eq.${group.id}`,
        order: "is_primary.desc,created_at.asc",
      }),
      supabaseSelect<GroupSessionRow>("group_sessions", {
        select:
          "id,court_id,day,start_time,end_time,courts(id,name,district,province)",
        group_id: `eq.${group.id}`,
        order: "day.asc,start_time.asc",
      }),
    ]);

  const owner = owners?.[0] ?? null;
  const memberList = members ?? [];
  const sportCode = group.sports?.code;
  const accent = SPORT_META[sportCode ?? ""]?.accent ?? "#0f172a";
  const fallbackImage =
    SPORT_META[sportCode ?? ""]?.coverImage ?? "/sports/badminton.svg";
  const filteredPhotos =
    photoRows && photoRows.length > 0
      ? photoRows
          .filter(
            (photo): photo is { id: string; image_url: string; is_primary: boolean | null } =>
              Boolean(photo.image_url),
          )
          .map((photo) => ({
            id: photo.id,
            image_url: photo.image_url as string,
            is_primary: photo.is_primary,
          }))
      : [];

  const gallery =
    filteredPhotos.length > 0
      ? filteredPhotos
      : [
          {
            id: "placeholder",
            image_url: fallbackImage,
            is_primary: true,
          },
        ];

  const sessionGroups = (() => {
    const map = new Map<
      string,
      {
        court: GroupSessionRow["courts"];
        sessions: GroupSessionRow[];
      }
    >();
    (sessionRows ?? []).forEach((session) => {
      const existing = map.get(session.court_id);
      if (existing) {
        existing.sessions.push(session);
      } else {
        map.set(session.court_id, {
          court: session.courts,
          sessions: [session],
        });
      }
    });
    return Array.from(map.values());
  })();

  const copy = {
    owner: t("groups.detail.owner"),
    members: t("groups.detail.members"),
    membersEmpty: t("groups.detail.membersEmpty"),
    scheduleAny: t("groups.detail.scheduleAny"),
    edit: t("groups.detail.edit"),
    updated: t("groups.detail.updated"),
    visibility: t("groups.detail.visibility"),
    visibilityPublic: t("groups.detail.visibilityPublic"),
    visibilityPrivate: t("groups.detail.visibilityPrivate"),
    sessionsTitle: t("groups.detail.sessionsTitle"),
    sessionsEmpty: t("groups.detail.sessionsEmpty"),
  };
  const canEdit =
    sessionUser?.id && group.owner_id
      ? sessionUser.id === group.owner_id
      : false;

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 px-6 pb-20 pt-10 text-slate-900 md:px-10">
      <CourtGallery gallery={gallery} courtName={group.name} />
      <section
        className="rounded-[32px] border border-slate-200 bg-white/90 p-8 shadow-2xl shadow-slate-200/70 backdrop-blur"
        style={{
          boxShadow: `0 25px 60px ${accent}20`,
        }}
      >
        <p className="text-xs uppercase tracking-[0.35em] text-slate-400">
          Group · {group.sports?.name ?? "RacketThailand"}
        </p>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="mt-3 text-4xl font-semibold">{group.name}</h1>
          {canEdit && (
            <Link
              href={buildLocalizedPath(
                `/groups/${group.id}/edit`,
                locale,
              )}
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-500"
            >
              {copy.edit}
            </Link>
          )}
        </div>
        {group.description && (
          <p className="mt-2 text-sm text-slate-600">
            {group.description}
          </p>
        )}
        <div className="mt-6 grid gap-5 rounded-3xl border border-slate-100 bg-slate-50/60 px-6 py-5 sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
              {copy.visibility}
            </p>
            <p className="text-base font-semibold text-slate-900">
              {group.is_public ? copy.visibilityPublic : copy.visibilityPrivate}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
              {copy.owner}
            </p>
            <p className="text-base font-semibold text-slate-900">
              {owner?.display_name ?? owner?.username ?? "—"}
            </p>
          </div>
          {group.updated_at && (
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                {copy.updated}
              </p>
              <p className="text-base font-semibold text-slate-900">
                {new Date(group.updated_at).toLocaleString("en-US")}
              </p>
            </div>
          )}
          <div className="sm:col-span-2">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
              {copy.sessionsTitle}
            </p>
            {sessionGroups.length === 0 ? (
              <p className="text-base font-semibold text-slate-900">
                {copy.sessionsEmpty}
              </p>
            ) : (
              <div className="mt-3 space-y-3">
                {sessionGroups.map((entry, index) => (
                  <div
                    key={entry.court?.id ?? `session-${index}`}
                    className="rounded-2xl border border-slate-200 bg-white/60 px-4 py-3"
                  >
                    {entry.court ? (
                      <Link
                        href={buildLocalizedPath(
                          `/courts/${entry.court.id}`,
                          locale,
                        )}
                        className="text-sm font-semibold text-indigo-600 underline-offset-2 hover:underline"
                      >
                        {entry.court.name ?? "Linked court"}
                      </Link>
                    ) : (
                      <p className="text-sm font-semibold text-slate-900">
                        {t("groups.detail.court")}
                      </p>
                    )}
                    <ul className="mt-2 space-y-1 text-sm font-semibold text-slate-900">
                      {entry.sessions.map((session) => (
                        <li key={`${session.id}-${session.day}-${session.start_time}`}>
                          {getDayLabel(session.day, locale)} ·{" "}
                          {session.start_time && session.end_time
                            ? formatTimeRange(
                                session.start_time,
                                session.end_time,
                                locale,
                              )
                            : copy.scheduleAny}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-lg shadow-slate-100">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-slate-900">
            {copy.members}
          </h2>
          <span className="text-sm text-slate-500">
            {memberList.length}{" "}
            {memberList.length === 1 ? "member" : "members"}
          </span>
        </div>
        {memberList.length === 0 ? (
          <p className="mt-4 text-sm text-slate-600">
            {copy.membersEmpty}
          </p>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {memberList.map((member) => (
              <li
                key={`${member.profiles?.id}-${member.role ?? "member"}`}
                className="flex items-center gap-3 rounded-2xl border border-slate-100 px-4 py-3"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-base font-semibold text-slate-600">
                  {member.profiles?.display_name?.charAt(0)?.toUpperCase() ??
                    member.profiles?.username?.charAt(0)?.toUpperCase() ??
                    "M"}
                </div>
                <div className="flex flex-col">
                  <p className="font-semibold text-slate-900">
                    {member.profiles?.display_name ??
                      member.profiles?.username ??
                      "Member"}
                  </p>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                    {member.role ?? "member"}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
