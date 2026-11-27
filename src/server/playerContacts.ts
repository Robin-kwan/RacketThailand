import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { canViewPlayerContacts, CONTACT_METHODS, normalizePlayerContacts, type ContactMethod, type PlayerContacts } from "@/lib/player-contacts";

export async function fetchVisiblePlayerContacts(profileIds: string[], sportId: string, viewerId?: string) {
  const result = new Map<string, { contacts: PlayerContacts; preferred: ContactMethod | null }>();
  if (!profileIds.length) return result;
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.from("profile_sports")
    .select("profile_id,contact_methods,contact_visibility,preferred_contact")
    .eq("sport_id", sportId).in("profile_id", profileIds);
  if (error) {
    if (["42703", "PGRST204"].includes(error.code)) return result;
    throw new Error(error.message);
  }
  const accepted = new Set<string>();
  if (viewerId) {
    const { data: sent, error: sentError } = await supabase.from("player_play_requests")
      .select("recipient_id").eq("sender_id", viewerId).eq("sport_id", sportId).eq("status", "accepted").in("recipient_id", profileIds);
    const { data: received, error: receivedError } = await supabase.from("player_play_requests")
      .select("sender_id").eq("recipient_id", viewerId).eq("sport_id", sportId).eq("status", "accepted").in("sender_id", profileIds);
    if (sentError || receivedError) throw new Error(sentError?.message ?? receivedError!.message);
    sent?.forEach((row) => accepted.add(row.recipient_id));
    received?.forEach((row) => accepted.add(row.sender_id));
  }
  for (const row of data ?? []) {
    if (!canViewPlayerContacts(row.contact_visibility, row.profile_id === viewerId, accepted.has(row.profile_id))) continue;
    try {
      result.set(row.profile_id, { contacts: normalizePlayerContacts(row.contact_methods), preferred: CONTACT_METHODS.includes(row.preferred_contact) ? row.preferred_contact : null });
    } catch { /* Invalid stored links are never exposed. */ }
  }
  return result;
}
