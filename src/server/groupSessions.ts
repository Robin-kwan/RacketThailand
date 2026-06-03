import type { SupabaseClient } from "@supabase/supabase-js";

export async function ensureCourtGroupLinks(
  supabase: SupabaseClient,
  groupId: string,
  courtIds: string[],
  ownerId?: string,
) {
  const uniqueCourtIds = Array.from(
    new Set(courtIds.filter((courtId) => typeof courtId === "string" && courtId.trim())),
  ) as string[];

  if (uniqueCourtIds.length === 0) {
    return;
  }

  const { data: courts } = await supabase
    .from("courts")
    .select("id,created_by")
    .in("id", uniqueCourtIds);

  const courtOwnerMap = new Map(
    (courts ?? []).map((court) => [court.id, court.created_by]),
  );

  await supabase
    .from("court_groups")
    .upsert(
      uniqueCourtIds.map((courtId) => {
        const courtOwnerId = courtOwnerMap.get(courtId);
        const autoVerify =
          ownerId && courtOwnerId && ownerId === courtOwnerId;
        return {
          court_id: courtId,
          group_id: groupId,
          verification_status: autoVerify ? "verified" : "pending",
          verified_by: autoVerify ? ownerId : null,
          verified_at: autoVerify ? new Date().toISOString() : null,
        };
      }),
      {
        onConflict: "court_id,group_id",
        ignoreDuplicates: true,
      },
    );
}

export async function syncCourtGroupLinks(
  supabase: SupabaseClient,
  groupId: string,
  courtIds: string[],
  ownerId?: string,
) {
  const uniqueCourtIds = Array.from(
    new Set(
      courtIds
        .filter((courtId) => typeof courtId === "string" && courtId.trim())
        .map((courtId) => courtId.trim()),
    ),
  );

  if (uniqueCourtIds.length === 0) {
    await supabase.from("court_groups").delete().eq("group_id", groupId);
    return;
  }

  await supabase
    .from("court_groups")
    .delete()
    .eq("group_id", groupId)
    .not("court_id", "in", `(${uniqueCourtIds.join(",")})`);

  await ensureCourtGroupLinks(supabase, groupId, uniqueCourtIds, ownerId);
}
