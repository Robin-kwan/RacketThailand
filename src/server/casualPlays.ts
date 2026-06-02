import type { Locale } from "@/lib/i18n";
import {
  getMaxCasualPlayDateString,
  getThailandTodayDateString,
} from "@/lib/casual-play";
import { supabaseSelect } from "@/lib/supabaseRest";
import { fetchCourtIdsBySportId } from "@/server/courtSports";
import { fetchSportRow } from "@/server/courtFinder";
import { localizeThailandLocation } from "@/server/thailand-location";

export type CasualPlayRecord = {
  id: string;
  title: string | null;
  description: string | null;
  play_date: string;
  start_time: string | null;
  end_time: string | null;
  updated_at: string | null;
  play_format?: "single" | "double" | null;
  player_amount?: number | null;
  accepted_count?: number | null;
  phone?: string | null;
  line_id?: string | null;
  court_id: string | null;
  venue_name?: string | null;
  location_note?: string | null;
  courts?: {
    id: string;
    name: string | null;
    province: string | null;
    province_id?: number | null;
    district: string | null;
    district_id?: number | null;
    latitude: number | null;
    longitude: number | null;
  } | null;
};

export type CasualPlayFilterOptions = {
  search?: string;
  playDate?: string;
  limit?: number;
  offset?: number;
};

function buildSearchClause(query: string) {
  const sanitized = query.replace(/[%*]/g, "").trim();
  if (!sanitized) return undefined;
  const term = `*${sanitized}*`;
  return `(title.ilike.${term},description.ilike.${term},venue_name.ilike.${term},location_note.ilike.${term})`;
}

function buildCourtLocationSearchClause(query: string) {
  const sanitized = query.replace(/[%*]/g, "").trim();
  if (!sanitized) return undefined;
  const term = `*${sanitized}*`;
  return `(name.ilike.${term},address.ilike.${term},district.ilike.${term},province.ilike.${term})`;
}

async function fetchCourtIdsByLocationSearch(
  sportId: string,
  query: string,
) {
  const locationClause = buildCourtLocationSearchClause(query);
  if (!locationClause) {
    return [];
  }
  const sportCourtIds = await fetchCourtIdsBySportId(sportId);
  if (sportCourtIds.length === 0) {
    return [];
  }

  const { data } = await supabaseSelect<{ id: string }>(
    "courts",
    {
      select: "id",
      id: `in.(${sportCourtIds.join(",")})`,
      is_active: "eq.true",
      or: locationClause,
      limit: "100",
    },
    { preferCount: false },
  );

  return data?.map((court) => court.id) ?? [];
}

type AcceptedJoinRequestRow = {
  play_id: string;
};

function hasMaxPlayers(play: CasualPlayRecord) {
  return (
    typeof play.player_amount === "number" &&
    Number.isFinite(play.player_amount) &&
    play.player_amount > 0
  );
}

async function attachAcceptedCounts(plays: CasualPlayRecord[]) {
  const playIds = plays.filter(hasMaxPlayers).map((play) => play.id);
  if (playIds.length === 0) {
    return plays;
  }

  const acceptedRequests = await supabaseSelect<AcceptedJoinRequestRow>(
    "casual_play_join_requests",
    {
      select: "play_id",
      play_id: `in.(${playIds.join(",")})`,
      status: "eq.accepted",
    },
    { preferCount: false },
  ).catch(() => ({ data: [] as AcceptedJoinRequestRow[] }));

  const acceptedCountByPlayId = new Map<string, number>();
  acceptedRequests.data.forEach((request) => {
    acceptedCountByPlayId.set(
      request.play_id,
      (acceptedCountByPlayId.get(request.play_id) ?? 0) + 1,
    );
  });

  return plays.map((play) =>
    hasMaxPlayers(play)
      ? {
          ...play,
          accepted_count: acceptedCountByPlayId.get(play.id) ?? 0,
        }
      : play,
  );
}

export async function fetchCasualPlaysBySport(
  sportCode: string,
  filters: CasualPlayFilterOptions = {},
  locale: Locale = "th",
) {
  const sportRow = await fetchSportRow(sportCode);
  if (!sportRow) {
    return { sport: null, plays: [], count: 0 };
  }

  const today = getThailandTodayDateString();
  const maxDate = getMaxCasualPlayDateString();
  if (
    filters.playDate &&
    (filters.playDate < today || filters.playDate > maxDate)
  ) {
    return { sport: sportRow, plays: [], count: 0 };
  }

  const params: Record<string, string> = {
    select:
      "id,title,description,play_date,start_time,end_time,updated_at,play_format,player_amount,phone,line_id,court_id,venue_name,location_note,courts(id,name,province,province_id,district,district_id,latitude:lat,longitude:lng)",
    sport_id: `eq.${sportRow.id}`,
    ...(filters.playDate
      ? { play_date: `eq.${filters.playDate}` }
      : { and: `(play_date.gte.${today},play_date.lte.${maxDate})` }),
    order: "play_date.asc,start_time.asc,updated_at.desc.nullslast",
  };

  if (filters.limit) {
    params.limit = String(filters.limit);
  }
  if (filters.offset) {
    params.offset = String(filters.offset);
  }
  if (filters.search) {
    const clause = buildSearchClause(filters.search);
    if (clause) {
      const courtIds = await fetchCourtIdsByLocationSearch(
        sportRow.id,
        filters.search,
      );
      if (courtIds.length > 0) {
        params.or = clause.replace(
          /\)$/,
          `,court_id.in.(${courtIds.join(",")}))`,
        );
      } else {
        params.or = clause;
      }
    }
  }
  const playsRes = await supabaseSelect<CasualPlayRecord>("casual_plays", params);
  const localizedPlays = await Promise.all(
    (playsRes.data ?? []).map(async (play) => {
      if (!play.courts) {
        return play;
      }
      const localized = await localizeThailandLocation(play.courts, locale);
      return {
        ...play,
        courts: {
          ...play.courts,
          district: localized.district,
          province: localized.province,
        },
      };
    }),
  );
  const plays = await attachAcceptedCounts(localizedPlays);

  return {
    sport: sportRow,
    plays,
    count: playsRes.count ?? 0,
  };
}
