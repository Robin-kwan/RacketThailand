import Link from "next/link";
import Image from "next/image";
import { SPORT_META } from "@/data/sportMeta";
import { CourtRequestList } from "@/components/court-request-list";
import {
  buildLocalizedPath,
  getTranslator,
  normalizeLocale,
} from "@/lib/i18n";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseSelect } from "@/lib/supabaseRest";

type SearchParams = {
  lang?: string;
};

type SearchParamsInput =
  | SearchParams
  | Promise<SearchParams>
  | undefined;

async function resolveSearchParams(
  searchParams?: SearchParamsInput,
): Promise<SearchParams | undefined> {
  if (!searchParams) return undefined;
  if (typeof (searchParams as Promise<SearchParams>).then === "function") {
    return searchParams as Promise<SearchParams>;
  }
  return searchParams;
}

type OwnedCourtRow = {
  id: string;
  name: string | null;
  district: string | null;
  province: string | null;
  sports: { code: string } | null;
  court_photos?: { image_url: string | null; is_primary: boolean | null }[];
};

type OwnedGroupRow = {
  id: string;
  name: string | null;
  description: string | null;
  sports?: { code: string } | null;
  group_photos?: { image_url: string | null; is_primary: boolean | null }[];
};

function getSportAccent(code?: string | null) {
  if (!code) return "#0f172a";
  return SPORT_META[code]?.accent ?? "#0f172a";
}

function getSportFallbackImage(code?: string | null) {
  if (!code) return "/sports/badminton.svg";
  return SPORT_META[code]?.coverImage ?? "/sports/badminton.svg";
}

function CourtCard({
  court,
  locale,
}: {
  court: OwnedCourtRow;
  locale: string;
}) {
  const sportCode = court.sports?.code ?? null;
  const accent = getSportAccent(sportCode);
  const href = buildLocalizedPath(`/courts/${court.id}`, locale);
  const primaryPhoto =
    court.court_photos?.find((photo) => photo.is_primary)?.image_url ??
    court.court_photos?.[0]?.image_url ??
    getSportFallbackImage(sportCode);

  return (
    <Link
      href={href}
      className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white px-5 py-6 shadow-md shadow-slate-200 transition hover:-translate-y-1"
    >
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-slate-100">
        <div className="relative h-36 w-full">
          <Image
            src={primaryPhoto}
            alt={court.name ?? "Court image"}
            fill
            sizes="(max-width:768px) 100vw, 33vw"
            className="object-cover"
          />
        </div>
      </div>
      <div className="space-y-1">
        <h3 className="text-2xl font-semibold text-slate-900">
          {court.name ?? "Unnamed court"}
        </h3>
        <p className="text-sm text-slate-600">
          {[court.district, court.province].filter(Boolean).join(" · ")}
        </p>
      </div>
      <div className="flex gap-3 text-xs uppercase tracking-[0.3em] text-slate-500">
        <span
          className="inline-flex rounded-full px-3 py-1"
          style={{ backgroundColor: `${accent}15`, color: accent }}
        >
          {court.province || "TH"}
        </span>
      </div>
    </Link>
  );
}

function GroupCard({
  group,
  locale,
}: {
  group: OwnedGroupRow;
  locale: string;
}) {
  const sportCode = group.sports?.code ?? null;
  const accent = getSportAccent(sportCode);
  const href = buildLocalizedPath(`/groups/${group.id}`, locale);
  const primaryPhoto =
    group.group_photos?.find((photo) => photo.is_primary)?.image_url ??
    group.group_photos?.[0]?.image_url ??
    getSportFallbackImage(sportCode);

  return (
    <Link
      href={href}
      className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white px-5 py-6 text-sm text-slate-600 shadow-md shadow-slate-200 transition hover:-translate-y-1"
    >
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-slate-100">
        <div className="relative h-36 w-full">
          <Image
            src={primaryPhoto}
            alt={group.name ?? "Group photo"}
            fill
            sizes="(max-width:768px) 100vw, 33vw"
            className="object-cover"
          />
        </div>
      </div>
      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-slate-900">
          {group.name ?? "Community group"}
        </h3>
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
          {group.sports?.code
            ? SPORT_META[group.sports.code]?.name[locale] ??
              group.sports.code
            : "RacketThailand"}
        </p>
        {group.description && (
          <p className="text-xs text-slate-600 line-clamp-2">
            {group.description}
          </p>
        )}
      </div>
      <div className="flex gap-3 text-xs uppercase tracking-[0.3em] text-slate-500">
        <span
          className="inline-flex rounded-full px-3 py-1"
          style={{ backgroundColor: `${accent}15`, color: accent }}
        >
          {sportCode ? sportCode.toUpperCase() : "COMMUNITY"}
        </span>
      </div>
    </Link>
  );
}

export default async function DashboardPage({
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
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("status")
    .eq("id", user.id)
    .single();
  const isAdmin = profile?.status === "admin";
  const canAddCourts =
    profile?.status === "court_manager" || profile?.status === "admin";

  let requestQuery = supabase
    .from("court_groups")
    .select(
      "id,created_at,note,groups(id,name,description),courts!inner(id,name,province,created_by)",
    )
    .eq("verification_status", "pending")
    .order("created_at", { ascending: false });
  if (!isAdmin) {
    requestQuery = requestQuery.eq("courts.created_by", user.id);
  }
  const { data: requests } = await requestQuery;
  const requestCards =
    requests?.map((request) => ({
      id: request.id,
      created_at: request.created_at,
      note: request.note,
      groups: request.groups,
      courts: request.courts,
    })) ?? [];

  const [{ data: ownedCourtsData }, { data: ownedGroupsData }] =
    await Promise.all([
      supabaseSelect<OwnedCourtRow>("courts", {
        select: "id,name,district,province,sports!inner(code),court_photos(image_url,is_primary)",
        created_by: `eq.${user.id}`,
        order: "name.asc.nullslast",
      }),
      supabaseSelect<OwnedGroupRow>("groups", {
        select:
          "id,name,description,sports!inner(code),group_photos(image_url,is_primary)",
        owner_id: `eq.${user.id}`,
        order: "created_at.desc",
      }),
    ]);

  const ownedCourts = ownedCourtsData ?? [];
  const ownedGroups = ownedGroupsData ?? [];

  const copy = {
    title: t("dashboard.courtRequests.title"),
    subtitle: t("dashboard.courtRequests.subtitle"),
    empty: t("dashboard.courtRequests.empty"),
    verify: t("dashboard.courtRequests.verify"),
    reject: t("dashboard.courtRequests.reject"),
    verifying: t("dashboard.courtRequests.verifying"),
    rejecting: t("dashboard.courtRequests.rejecting"),
    rejectedNote: t("dashboard.courtRequests.rejectedNote"),
    badge: t("dashboard.courtRequests.badge"),
    submitted: t("dashboard.courtRequests.submitted"),
    addCourtCta: t("dashboard.courtRequests.addCourtCta"),
    ownedCourtsTitle: t("dashboard.ownedCourts.title"),
    ownedCourtsEmpty: t("dashboard.ownedCourts.empty"),
    ownedGroupsTitle: t("dashboard.ownedGroups.title"),
    ownedGroupsEmpty: t("dashboard.ownedGroups.empty"),
  };

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 px-6 pb-20 pt-10 md:px-10">
      <section className="grid gap-6 md:grid-cols-2">
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-900">
              {copy.ownedCourtsTitle}
            </h2>
            {canAddCourts && (
              <Link
                href={buildLocalizedPath("/dashboard/courts/new", locale)}
                className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 hover:text-slate-700"
              >
                {copy.addCourtCta}
              </Link>
            )}
          </div>
          {ownedCourts.length === 0 ? (
            <p className="mt-4 text-sm text-slate-600">
              {copy.ownedCourtsEmpty}
            </p>
          ) : (
            <div className="mt-4 grid gap-4">
              {ownedCourts.map((court) => (
                <CourtCard key={court.id} court={court} locale={locale} />
              ))}
            </div>
          )}
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-900">
              {copy.ownedGroupsTitle}
            </h2>
            <Link
              href={buildLocalizedPath("/groups/create", locale)}
              className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 hover:text-slate-700"
            >
              {t("groups.form.submit")}
            </Link>
          </div>
          {ownedGroups.length === 0 ? (
            <p className="mt-4 text-sm text-slate-600">
              {copy.ownedGroupsEmpty}
            </p>
          ) : (
            <div className="mt-4 grid gap-4">
              {ownedGroups.map((group) => (
                <GroupCard key={group.id} group={group} locale={locale} />
              ))}
            </div>
          )}
        </article>
      </section>

      {ownedCourts.length > 0 && (
        <section className="rounded-[32px] border border-slate-200 bg-white/90 p-8 shadow-2xl shadow-slate-200/70 backdrop-blur">
          <p className="text-xs uppercase tracking-[0.35em] text-slate-400">
            Dashboard · Courts
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-slate-900">
            {copy.title}
          </h2>
          <p className="mt-2 text-sm text-slate-600">{copy.subtitle}</p>
          <div className="mt-6">
            <CourtRequestList
              requests={requestCards}
              copy={copy}
              locale={locale}
            />
          </div>
        </section>
      )}
    </main>
  );
}
