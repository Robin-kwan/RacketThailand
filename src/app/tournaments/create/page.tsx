import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BaseCard } from "@/components/base-card";
import { TournamentCreationForm } from "@/components/tournaments/tournament-creation-form";
import { SPORT_META } from "@/data/sportMeta";
import { buildAuthPagePath } from "@/lib/auth-redirect";
import { normalizeLocale } from "@/lib/i18n";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseSelect } from "@/lib/supabaseRest";

export async function generateMetadata({
  searchParams,
}: {
  searchParams?: Promise<{ lang?: string }>;
}): Promise<Metadata> {
  const locale = normalizeLocale((await searchParams)?.lang);
  return {
    title:
      locale === "th"
        ? "สร้างรายการแข่งขัน | RacketThailand"
        : "Create tournament | RacketThailand",
    robots: { index: false, follow: true },
  };
}

export default async function CreateTournamentPage({
  searchParams,
}: {
  searchParams?: Promise<{ lang?: string; sport?: string }>;
}) {
  const query = searchParams ? await searchParams : undefined;
  const locale = normalizeLocale(query?.lang);
  const th = locale === "th";
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    redirect(
      buildAuthPagePath(
        "/login",
        locale,
        `/tournaments/create${query?.sport ? `?sport=${query.sport}` : ""}`,
      ),
    );

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
  const initialSportId = sportsResult.data?.find(
    (sport) => sport.code === query?.sport,
  )?.id;

  return (
    <div className="rt-page">
      <main className="mx-auto max-w-5xl px-6 pb-20 pt-10 md:px-10">
        <BaseCard
          as="section"
          className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm md:p-8"
        >
          <h1 className="text-2xl font-semibold">
            {th ? "สร้างรายการแข่งขัน" : "Create tournament"}
          </h1>
          <p className="mt-2 text-sm rt-text-muted">
            {th
              ? "เชื่อมการแข่งขันกับสนามและผู้จัดหลายราย"
              : "Connect the tournament to its court and multiple organizers."}
          </p>
          <div className="mt-8">
            <TournamentCreationForm
              sports={sports}
              courts={courts}
              groups={groups}
              locale={locale}
              initialSportId={initialSportId}
            />
          </div>
        </BaseCard>
      </main>
    </div>
  );
}
