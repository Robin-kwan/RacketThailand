import type { Locale } from "@/lib/i18n";
import { buildPostgrestIlikeTerm } from "@/lib/postgrest-search";
import {
  isScheduleDay,
  weeklyRangeOverlapsDay,
} from "@/lib/schedule-normalization";
import { supabaseSelect } from "@/lib/supabaseRest";
import { fetchCourtIdsBySportId } from "@/server/courtSports";
import { fetchSportRow } from "@/server/courtFinder";
import { localizeThailandLocation } from "@/server/thailand-location";

export type GroupPhoto = {
  image_url: string | null;
  is_primary: boolean | null;
};

export type GroupSessionRecord = {
  day: string;
  start_time: string | null;
  end_time: string | null;
  courts?: {
    id: string;
    name: string | null;
    province: string | null;
    province_id?: number | null;
    latitude: number | null;
    longitude: number | null;
    district?: string | null;
    district_id?: number | null;
  } | null;
};

export type GroupCourtLinkRecord = {
  courts?: {
    id: string;
    name: string | null;
    province: string | null;
    province_id?: number | null;
    latitude: number | null;
    longitude: number | null;
    district?: string | null;
    district_id?: number | null;
  } | null;
};

export type GroupRecord = {
  id: string;
  name: string | null;
  description: string | null;
  updated_at: string | null;
  play_format?: "single" | "double" | null;
  player_amount?: number | null;
  allow_walk_in?: boolean | null;
  phone?: string | null;
  line_id?: string | null;
  group_photos?: GroupPhoto[] | null;
  group_sessions?: GroupSessionRecord[] | null;
  court_groups?: GroupCourtLinkRecord[] | null;
};

export type GroupFilterOptions = {
  search?: string;
  day?: string;
  playFormat?: string;
  allowWalkIn?: string;
  limit?: number;
  offset?: number;
};

type GroupSessionFilterRow = {
  group_id: string;
  day: string | null;
  start_time: string | null;
  end_time: string | null;
};

function buildSearchClause(query: string) {
  const term = buildPostgrestIlikeTerm(query);
  if (!term) return undefined;
  return `(name.ilike.${term},description.ilike.${term})`;
}

function buildCourtLocationSearchClause(query: string) {
  const term = buildPostgrestIlikeTerm(query);
  if (!term) return undefined;
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

async function fetchGroupIdsByCourtIds(
  courtIds: string[],
  filters: GroupFilterOptions,
) {
  if (courtIds.length === 0) {
    return [];
  }

  const params: Record<string, string> = {
    select: "group_id,day,start_time,end_time",
    court_id: `in.(${courtIds.join(",")})`,
    limit: "500",
  };

  const { data } = await supabaseSelect<GroupSessionFilterRow>(
    "group_sessions",
    params,
    { preferCount: false },
  );

  const matchingSessions = filters.day
    ? (data ?? []).filter((session) =>
        sessionOverlapsDay(session, filters.day as string),
      )
    : (data ?? []);

  return Array.from(
    new Set(matchingSessions.map((session) => session.group_id)),
  );
}

function sessionOverlapsDay(
  session: Pick<GroupSessionFilterRow, "day" | "start_time" | "end_time">,
  day: string,
) {
  if (!session.day) return false;
  if (!session.start_time || !session.end_time) {
    return session.day === day;
  }
  return weeklyRangeOverlapsDay(
    {
      day: session.day,
      startTime: session.start_time,
      endTime: session.end_time,
    },
    day,
  );
}

async function fetchGroupIdsByNormalizedDay(sportId: string, day: string) {
  if (!isScheduleDay(day)) return [];

  const { data } = await supabaseSelect<GroupSessionFilterRow>(
    "group_sessions",
    {
      select: "group_id,day,start_time,end_time,groups!inner(sport_id)",
      "groups.sport_id": `eq.${sportId}`,
      limit: "5000",
    },
    { preferCount: false },
  );

  return Array.from(
    new Set(
      (data ?? [])
        .filter((session) => sessionOverlapsDay(session, day))
        .map((session) => session.group_id),
    ),
  );
}

export async function fetchGroupsBySport(
  sportCode: string,
  filters: GroupFilterOptions = {},
  locale: Locale = "th",
) {
  const sportRow = await fetchSportRow(sportCode);
  if (!sportRow) {
    return { sport: null, groups: [], count: 0 };
  }

  const dayGroupIds = filters.day
    ? await fetchGroupIdsByNormalizedDay(sportRow.id, filters.day)
    : null;

  const params: Record<string, string> = {
    select:
      "id,name,description,updated_at,play_format,player_amount,allow_walk_in,phone,line_id,group_photos(image_url,is_primary),group_sessions(day,start_time,end_time,court_id,courts(id,name,province,province_id,latitude:lat,longitude:lng,district,district_id)),court_groups(courts(id,name,province,province_id,latitude:lat,longitude:lng,district,district_id))",
      sport_id: `eq.${sportRow.id}`,
      order: "updated_at.desc.nullslast",
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
      const groupIds = await fetchGroupIdsByCourtIds(courtIds, filters);
      if (groupIds.length > 0) {
        params.or = clause.replace(/\)$/, `,id.in.(${groupIds.join(",")}))`);
      } else {
        params.or = clause;
      }
    }
  }
  if (filters.playFormat === "single" || filters.playFormat === "double") {
    params.play_format = `eq.${filters.playFormat}`;
  }
  if (filters.allowWalkIn === "true" || filters.allowWalkIn === "false") {
    params.allow_walk_in = `eq.${filters.allowWalkIn}`;
  }
  if (dayGroupIds) {
    params.id =
      dayGroupIds.length > 0
        ? `in.(${dayGroupIds.join(",")})`
        : "eq.00000000-0000-0000-0000-000000000000";
  }

  const groupsRes = await supabaseSelect<GroupRecord>("groups", params);

  const localizedGroups = await Promise.all(
    (groupsRes.data ?? []).map(async (group) => {
      const displaySessions =
        filters.day && group.group_sessions
          ? group.group_sessions.filter((session) =>
              sessionOverlapsDay(session, filters.day as string),
            )
          : group.group_sessions;

      return {
        ...group,
        group_sessions:
          displaySessions == null
            ? displaySessions
            : await Promise.all(
                displaySessions.map(async (session) => {
                if (!session.courts) {
                  return session;
                }
                const localized = await localizeThailandLocation(
                  session.courts,
                  locale,
                );
                return {
                  ...session,
                  courts: {
                    ...session.courts,
                    district: localized.district,
                    province: localized.province,
                  },
                };
                }),
              ),
        court_groups:
          group.court_groups == null
            ? group.court_groups
            : await Promise.all(
                group.court_groups.map(async (link) => {
                if (!link.courts) {
                  return link;
                }
                const localized = await localizeThailandLocation(
                  link.courts,
                  locale,
                );
                return {
                  ...link,
                  courts: {
                    ...link.courts,
                    district: localized.district,
                    province: localized.province,
                  },
                };
                }),
              ),
      };
    }),
  );

  return {
    sport: sportRow,
    groups: localizedGroups,
    count: groupsRes.count ?? 0,
  };
}
