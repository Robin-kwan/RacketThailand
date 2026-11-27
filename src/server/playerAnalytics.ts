import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { PLAYER_ANALYTICS_EXCLUDED_PROFILE_IDS } from "@/data/playerAnalyticsExclusions";
import {
  playerAnalyticsWindow,
  summarizeOutreach,
  type OutreachRow,
} from "@/lib/player-analytics";

export async function getPlayerAnalyticsExclusions() {
  const { data, error } = await getSupabaseAdminClient()
    .from("profiles")
    .select("id")
    .eq("status", "admin");
  if (error) throw new Error("PLAYER_ANALYTICS_EXCLUSIONS_FAILED");
  return new Set([
    ...PLAYER_ANALYTICS_EXCLUDED_PROFILE_IDS,
    ...(data ?? []).map((row) => row.id as string),
  ]);
}

export async function playerTrackingAllowed(profileId?: string) {
  if (!profileId) return true;
  try {
    return !(await getPlayerAnalyticsExclusions()).has(profileId);
  } catch {
    return false;
  }
}

type RecordRow = {
  id: string;
  sender_id?: string;
  invited_by?: string;
  recipient_id: string;
  status: string;
  sports?: { code: string } | { code: string }[] | null;
  groups?:
    | { sports: { code: string } | { code: string }[] | null }
    | { sports: { code: string } | { code: string }[] | null }[]
    | null;
};
const first = <T>(value: T | T[] | null | undefined): T | undefined =>
  Array.isArray(value) ? value[0] : (value ?? undefined);

async function fetchOutreach(
  kind: "request" | "invitation",
  window: ReturnType<typeof playerAnalyticsWindow>,
) {
  const client = getSupabaseAdminClient();
  const rows: OutreachRow[] = [];
  // Keyset pagination avoids Supabase's default row limit and fails explicitly if bounded out.
  let cursor: string | undefined;
  for (let page = 0; page < 100; page++) {
    let query = client
      .from(
        kind === "request"
          ? "player_play_requests"
          : "player_group_invitations",
      )
      .select(
        kind === "request"
          ? "id,sender_id,recipient_id,status,sports(code)"
          : "id,invited_by,recipient_id,status,groups(sports(code))",
      )
      .gte("created_at", window.start)
      .lte("created_at", window.end)
      .order("id")
      .limit(1000);
    if (cursor) query = query.gt("id", cursor);
    const { data, error } = await query;
    if (error) throw new Error("PLAYER_ANALYTICS_OUTREACH_FAILED");
    const batch = data as unknown as RecordRow[];
    for (const row of batch) {
      rows.push({
        id: row.id,
        senderId: (row.sender_id ?? row.invited_by)!,
        recipientId: row.recipient_id,
        status: row.status,
        sport:
          first(kind === "request" ? row.sports : first(row.groups)?.sports)
            ?.code ?? "unknown",
      });
    }
    if (batch.length < 1000) return rows;
    cursor = batch[batch.length - 1].id;
  }
  throw new Error("PLAYER_ANALYTICS_RESULT_TOO_LARGE");
}

export async function fetchPlayerOutcomes(days: number, sport: string) {
  const window = playerAnalyticsWindow(days);
  const [excluded, requests, invitations] = await Promise.all([
    getPlayerAnalyticsExclusions(),
    fetchOutreach("request", window),
    fetchOutreach("invitation", window),
  ]);
  return {
    window,
    requests: summarizeOutreach(requests, excluded, sport),
    invitations: summarizeOutreach(invitations, excluded, sport),
  };
}
