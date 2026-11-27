import type { GroupRecord, GroupSessionRecord } from "@/server/groupFinder";
import type { GroupCardSession } from "@/components/group-card";

const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const DAY = 86400000;
const OFFSET = 7 * 3600000;

export function isActiveDiscoveryEvent(event: { starts_at: string; ends_at: string | null }, now = new Date()) {
  return new Date(event.ends_at ?? event.starts_at).getTime() > now.getTime();
}

function nextWeeklyStart(session: GroupSessionRecord, now: Date) {
  const index = DAYS.indexOf(session.day.toLowerCase());
  if (index < 0 || !session.start_time) return Infinity;
  const local = new Date(now.getTime() + OFFSET);
  const midnight = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - OFFSET;
  const [hours, minutes] = session.start_time.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return Infinity;
  let start = midnight + ((index - local.getUTCDay() + 7) % 7) * DAY + (hours * 60 + minutes) * 60000;
  const [endHours, endMinutes] = (session.end_time ?? session.start_time).split(":").map(Number);
  let duration = (endHours * 60 + endMinutes - hours * 60 - minutes) * 60000;
  if (duration < 0) duration += DAY;
  if (start + duration <= now.getTime()) start += 7 * DAY;
  return start;
}

export function nextGroupSessionTime(group: GroupRecord, now = new Date()) {
  return Math.min(
    ...(group.group_sessions ?? []).map(session => nextWeeklyStart(session, now)),
    ...(group.group_events ?? []).filter(event => isActiveDiscoveryEvent(event, now)).map(event => new Date(event.starts_at).getTime()),
  );
}

export function isGroupDiscoverable(group: GroupRecord, now = new Date()) {
  // Existing groups without dated play remain searchable. A finished one-time group
  // returns to discovery when its organiser posts another date or regular schedule.
  return Boolean(group.group_sessions?.length) || !group.group_events?.length || group.group_events.some(event => isActiveDiscoveryEvent(event, now));
}

export function groupDiscoverySessions(group: GroupRecord, now = new Date()): GroupCardSession[] {
  const date = new Intl.DateTimeFormat("en-CA", {timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit"});
  const time = new Intl.DateTimeFormat("en-GB", {timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit", hourCycle: "h23"});
  return [
    ...(group.group_sessions ?? []).map(session => ({session, starts: nextWeeklyStart(session, now)})),
    ...(group.group_events ?? []).filter(event => isActiveDiscoveryEvent(event, now)).map(event => ({
      starts: new Date(event.starts_at).getTime(),
      session: {day: "", date: date.format(new Date(event.starts_at)), start_time: time.format(new Date(event.starts_at)), end_time: event.ends_at ? time.format(new Date(event.ends_at)) : null,
        courts: event.courts ?? (event.venue_name ? {name: event.venue_name} : null)} satisfies GroupCardSession,
    })),
  ].sort((a,b) => a.starts - b.starts).map(item => item.session);
}
