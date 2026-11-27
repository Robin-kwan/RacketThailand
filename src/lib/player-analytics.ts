export const PLAYER_ANALYTICS_SPORTS = [
  "badminton",
  "padel",
  "pickleball",
  "tennis",
  "tabletennis",
] as const;
export const PLAYER_ANALYTICS_ACTIONS = [
  "view",
  "request_open",
  "login_gate",
  "profile_gate",
  "request_error",
  "invite_open",
  "invite_error",
] as const;
export type PlayerAnalyticsAction = (typeof PLAYER_ANALYTICS_ACTIONS)[number];

export function playerEventName(action: PlayerAnalyticsAction, sport: string) {
  if (!PLAYER_ANALYTICS_SPORTS.some((value) => value === sport)) return null;
  return `player_${action}_${sport.replaceAll("-", "_")}`;
}

export function playerAnalyticsWindow(days: number, now = new Date()) {
  const today = new Date(now.getTime() + 7 * 3600_000)
    .toISOString()
    .slice(0, 10);
  const endDay = new Date(`${today}T00:00:00+07:00`);
  const start = new Date(endDay.getTime() - (days - 1) * 86400_000);
  return {
    start: start.toISOString(),
    end: now.toISOString(),
    startDate: new Date(start.getTime() + 7 * 3600_000)
      .toISOString()
      .slice(0, 10),
    endDate: today,
  };
}

export type OutreachRow = {
  id: string;
  senderId: string;
  recipientId: string;
  sport: string;
  status: string;
};
export function summarizeOutreach(
  rows: OutreachRow[],
  excluded: ReadonlySet<string>,
  sport = "all",
) {
  const eligible = rows.filter(
    (row) =>
      !excluded.has(row.senderId) &&
      !excluded.has(row.recipientId) &&
      (sport === "all" || row.sport === sport),
  );
  const unique = [...new Map(eligible.map((row) => [row.id, row])).values()];
  return {
    sent: unique.length,
    senders: new Set(unique.map((row) => row.senderId)).size,
    recipients: new Set(unique.map((row) => row.recipientId)).size,
    accepted: unique.filter((row) => row.status === "accepted").length,
    declined: unique.filter((row) => row.status === "declined").length,
    pending: unique.filter((row) => row.status === "pending").length,
    cancelled: unique.filter((row) => row.status === "cancelled").length,
  };
}
