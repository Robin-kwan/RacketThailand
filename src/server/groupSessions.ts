import type { SupabaseClient } from "@supabase/supabase-js";

export async function ensureCourtGroupLinks(
  supabase: SupabaseClient,
  groupId: string,
  courtIds: string[],
) {
  const uniqueCourtIds = Array.from(
    new Set(courtIds.filter((courtId) => typeof courtId === "string" && courtId.trim())),
  ) as string[];

  if (uniqueCourtIds.length === 0) {
    return;
  }

  await supabase
    .from("court_groups")
    .upsert(
      uniqueCourtIds.map((courtId) => ({
        court_id: courtId,
        group_id: groupId,
        verification_status: "pending",
      })),
      {
        onConflict: "court_id,group_id",
        ignoreDuplicates: true,
      },
    );
}
