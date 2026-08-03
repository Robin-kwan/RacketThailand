import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { BaseCard } from "@/components/base-card";
import {
  TournamentCreationForm,
  type TournamentFormInitialData,
} from "@/components/tournaments/tournament-creation-form";
import { SPORT_META } from "@/data/sportMeta";
import { buildAuthPagePath } from "@/lib/auth-redirect";
import { buildLocalizedPath, normalizeLocale } from "@/lib/i18n";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseSelect } from "@/lib/supabaseRest";

type TournamentEditRow = {
  id: string;
  owner_id: string;
  sport_id: string;
  court_id: string;
  name: string;
  description: string;
  tournament_start_at: string;
  tournament_end_at: string;
  registration_url: string | null;
  phone: string | null;
  line_id: string | null;
  tournament_organizers:
    | {
        group_id: string | null;
        organizer_name: string | null;
        phone: string | null;
        line_id: string | null;
        website_url: string | null;
        display_order: number;
      }[]
    | null;
  tournament_photos:
    { id: string; image_url: string; is_primary: boolean }[] | null;
};

function formatBangkokDate(value: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams?: Promise<{ lang?: string }>;
}): Promise<Metadata> {
  const locale = normalizeLocale((await searchParams)?.lang);
  return {
    title:
      locale === "th"
        ? "แก้ไขรายการแข่งขัน | RacketThailand"
        : "Edit tournament | RacketThailand",
    robots: { index: false, follow: true },
  };
}

export default async function EditTournamentPage({
  params,
  searchParams,
}: {
  params: Promise<{ tournamentId: string }>;
  searchParams?: Promise<{ lang?: string }>;
}) {
  const { tournamentId } = await params;
  const locale = normalizeLocale((await searchParams)?.lang);
  const th = locale === "th";
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(
      buildAuthPagePath("/login", locale, `/tournaments/${tournamentId}/edit`),
    );
  }

  const admin = getSupabaseAdminClient();
  const { data: tournamentData } = await admin
    .from("tournaments")
    .select(
      "id,owner_id,sport_id,court_id,name,description,tournament_start_at,tournament_end_at,registration_url,phone,line_id,tournament_organizers(group_id,organizer_name,phone,line_id,website_url,display_order),tournament_photos(id,image_url,is_primary)",
    )
    .eq("id", tournamentId)
    .maybeSingle();
  const tournament = tournamentData as TournamentEditRow | null;
  if (!tournament) notFound();

  const { data: profile } = await supabase
    .from("profiles")
    .select("status")
    .eq("id", user.id)
    .maybeSingle();
  if (tournament.owner_id !== user.id && profile?.status !== "admin") {
    redirect(buildLocalizedPath(`/tournaments/${tournament.id}`, locale));
  }

  const [sportsResult, courtsResult, courtSportsResult, groupsResult] =
    await Promise.all([
      supabaseSelect<{ id: string; code: string; name: string | null }>(
        "sports",
        { select: "id,code,name", order: "name.asc" },
      ),
      supabaseSelect<{ id: string; name: string; province: string | null }>(
        "courts",
        { select: "id,name,province", is_active: "eq.true", order: "name.asc" },
      ),
      supabaseSelect<{ court_id: string; sport_id: string }>("court_sports", {
        select: "court_id,sport_id",
      }),
      supabaseSelect<{ id: string; name: string; sport_id: string }>("groups", {
        select: "id,name,sport_id",
        status: "eq.published",
        order: "name.asc",
        limit: "500",
      }),
    ]);

  const sports = (sportsResult.data ?? []).map((sport) => ({
    value: sport.id,
    label: SPORT_META[sport.code]?.name[locale] ?? sport.name ?? sport.code,
  }));
  const courtSportMap = new Map<string, Set<string>>();
  for (const row of courtSportsResult.data ?? []) {
    const sportIds = courtSportMap.get(row.court_id) ?? new Set<string>();
    sportIds.add(row.sport_id);
    courtSportMap.set(row.court_id, sportIds);
  }
  const courts = (courtsResult.data ?? []).flatMap((court) =>
    Array.from(courtSportMap.get(court.id) ?? []).map((sportId) => ({
      value: court.id,
      label: [court.name, court.province].filter(Boolean).join(" · "),
      sportId,
    })),
  );
  const groups = (groupsResult.data ?? []).map((group) => ({
    value: group.id,
    label: group.name,
    sportId: group.sport_id,
  }));
  const initialData: TournamentFormInitialData = {
    id: tournament.id,
    sportId: tournament.sport_id,
    courtId: tournament.court_id,
    name: tournament.name,
    description: tournament.description,
    tournamentStartDate: formatBangkokDate(tournament.tournament_start_at),
    tournamentEndDate: formatBangkokDate(tournament.tournament_end_at),
    registrationUrl: tournament.registration_url ?? "",
    phone: tournament.phone ?? "",
    lineId: tournament.line_id ?? "",
    organizers: [...(tournament.tournament_organizers ?? [])]
      .sort((a, b) => a.display_order - b.display_order)
      .map((organizer) => ({
        source: organizer.group_id ? "group" : "manual",
        groupId: organizer.group_id ?? "",
        name: organizer.organizer_name ?? "",
        phone: organizer.phone ?? "",
        lineId: organizer.line_id ?? "",
        websiteUrl: organizer.website_url ?? "",
      })),
    existingImages: tournament.tournament_photos ?? [],
  };

  return (
    <div className="rt-page">
      <main className="mx-auto max-w-5xl px-6 pb-20 pt-10 md:px-10">
        <BaseCard
          as="section"
          className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm md:p-8"
        >
          <h1 className="text-2xl font-semibold">
            {th ? "แก้ไขรายการแข่งขัน" : "Edit tournament"}
          </h1>
          <p className="mt-2 text-sm rt-text-muted">
            {th
              ? "แก้ไขรายละเอียด วันที่ สนาม ผู้จัด และช่องทางติดต่อ"
              : "Update the details, dates, court, organizers, and contact methods."}
          </p>
          <div className="mt-8">
            <TournamentCreationForm
              sports={sports}
              courts={courts}
              groups={groups}
              locale={locale}
              initialData={initialData}
            />
          </div>
        </BaseCard>
      </main>
    </div>
  );
}
