import type { Locale } from "@/lib/i18n";
import { buildPostgrestIlikeTerm } from "@/lib/postgrest-search";
import {
  isScheduleDay,
  SCHEDULE_DAYS,
  timeToMinutes,
  weeklyRangeOverlapsTimeWindow,
  weeklyRangesCoverTimeWindow,
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
  startTime?: string;
  endTime?: string;
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

  const sessionsByGroup = new Map<string, GroupSessionFilterRow[]>();
  (data ?? []).forEach((session) => {
    const existing = sessionsByGroup.get(session.group_id) ?? [];
    existing.push(session);
    sessionsByGroup.set(session.group_id, existing);
  });

  return Array.from(sessionsByGroup.entries())
    .filter(([, sessions]) => sessionsMatchScheduleFilters(sessions, filters))
    .map(([groupId]) => groupId);
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

function resolveTimeWindow(filters: GroupFilterOptions) {
  const startMinute = timeToMinutes(filters.startTime);
  const endMinute = timeToMinutes(filters.endTime);
  if (startMinute === null && endMinute === null) return null;
  if (startMinute !== null && endMinute !== null) {
    if (startMinute === endMinute) {
      return { startMinute: 0, endMinute: 24 * 60 };
    }
    if (endMinute > startMinute) {
      return { startMinute, endMinute };
    }
    return { startMinute, endMinute: endMinute + 24 * 60 };
  }
  if (startMinute !== null) {
    return { startMinute, endMinute: startMinute + 1 };
  }
  return {
    startMinute: endMinute === 0 ? 24 * 60 - 1 : (endMinute as number) - 1,
    endMinute: endMinute === 0 ? 24 * 60 : (endMinute as number),
  };
}

function sessionMatchesTimeWindow(
  session: Pick<GroupSessionFilterRow, "day" | "start_time" | "end_time">,
  filters: GroupFilterOptions,
) {
  const window = resolveTimeWindow(filters);
  if (!window) return true;
  if (!session.day || !session.start_time || !session.end_time) return false;
  const days =
    filters.day && isScheduleDay(filters.day)
      ? [filters.day]
      : SCHEDULE_DAYS;
  return days.some((day) =>
    weeklyRangeOverlapsTimeWindow(
      {
        day: session.day as string,
        startTime: session.start_time,
        endTime: session.end_time,
      },
      day,
      window.startMinute,
      window.endMinute,
    ),
  );
}

function sessionsCoverTimeWindow(
  sessions: Pick<GroupSessionFilterRow, "day" | "start_time" | "end_time">[],
  filters: GroupFilterOptions,
) {
  const window = resolveTimeWindow(filters);
  if (!window) return true;
  const ranges = sessions
    .filter((session) => session.day && session.start_time && session.end_time)
    .map((session) => ({
      day: session.day as string,
      startTime: session.start_time,
      endTime: session.end_time,
    }));
  if (ranges.length === 0) return false;
  const days =
    filters.day && isScheduleDay(filters.day)
      ? [filters.day]
      : SCHEDULE_DAYS;
  return days.some((day) =>
    weeklyRangesCoverTimeWindow(
      ranges,
      day,
      window.startMinute,
      window.endMinute,
    ),
  );
}

function sessionMatchesFilters(
  session: Pick<GroupSessionFilterRow, "day" | "start_time" | "end_time">,
  filters: GroupFilterOptions,
) {
  if (
    filters.day &&
    isScheduleDay(filters.day) &&
    !sessionOverlapsDay(session, filters.day)
  ) {
    return false;
  }
  return sessionMatchesTimeWindow(session, filters);
}

function sessionsMatchScheduleFilters(
  sessions: Pick<GroupSessionFilterRow, "day" | "start_time" | "end_time">[],
  filters: GroupFilterOptions,
) {
  if (resolveTimeWindow(filters)) {
    return sessionsCoverTimeWindow(sessions, filters);
  }
  return sessions.some((session) => sessionMatchesFilters(session, filters));
}

async function fetchGroupIdsByScheduleFilters(
  sportId: string,
  filters: GroupFilterOptions,
) {
  const hasDay = filters.day && isScheduleDay(filters.day);
  const hasTime = Boolean(resolveTimeWindow(filters));
  if (!hasDay && !hasTime) return null;

  const { data } = await supabaseSelect<GroupSessionFilterRow>(
    "group_sessions",
    {
      select: "group_id,day,start_time,end_time,groups!inner(sport_id)",
      "groups.sport_id": `eq.${sportId}`,
      limit: "5000",
    },
    { preferCount: false },
  );

  const sessionsByGroup = new Map<string, GroupSessionFilterRow[]>();
  (data ?? []).forEach((session) => {
    const existing = sessionsByGroup.get(session.group_id) ?? [];
    existing.push(session);
    sessionsByGroup.set(session.group_id, existing);
  });

  return Array.from(sessionsByGroup.entries())
    .filter(([, sessions]) => sessionsMatchScheduleFilters(sessions, filters))
    .map(([groupId]) => groupId);
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

  const scheduleGroupIds = await fetchGroupIdsByScheduleFilters(
    sportRow.id,
    filters,
  );

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
  if (scheduleGroupIds) {
    params.id =
      scheduleGroupIds.length > 0
        ? `in.(${scheduleGroupIds.join(",")})`
        : "eq.00000000-0000-0000-0000-000000000000";
  }

  const groupsRes = await supabaseSelect<GroupRecord>("groups", params);

  const localizedGroups = await Promise.all(
    (groupsRes.data ?? []).map(async (group) => {
      const displaySessions =
        (filters.day || filters.startTime || filters.endTime) &&
        group.group_sessions
          ? group.group_sessions.filter((session) =>
              sessionMatchesFilters(session, filters),
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
