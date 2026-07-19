import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BaseCard } from "@/components/base-card";
import { GroupInviteButton } from "@/components/player-finder/group-invite-button";
import { buildAuthPagePath } from "@/lib/auth-redirect";
import { buildLocalizedPath, getTranslator, normalizeLocale } from "@/lib/i18n";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { fetchActivePlayersBySport } from "@/server/playerFinder";
import { requireGroupAccess } from "@/server/groupAccess";

export const metadata: Metadata = {
  title: "Invite players | RacketThailand",
  robots: { index: false, follow: false },
};

type Params = Promise<{ groupId: string }>;
type SearchParams = Promise<{ lang?: string }> | undefined;

export default async function GroupPlayerInvitesPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams?: SearchParams;
}) {
  const { groupId } = await params;
  const resolvedSearch = searchParams ? await searchParams : undefined;
  const locale = normalizeLocale(resolvedSearch?.lang);
  const t = await getTranslator(locale);
  const access = await requireGroupAccess(groupId);
  if (access.error === "UNAUTHORIZED") {
    redirect(buildAuthPagePath("/login", locale, `/groups/${groupId}/players`));
  }
  if (access.error === "FORBIDDEN" || !access.user) {
    redirect(buildLocalizedPath(`/groups/${groupId}`, locale));
  }

  const adminSupabase = getSupabaseAdminClient();
  const { data: group } = await adminSupabase
    .from("groups")
    .select("id,name,sport_id,sports(code,name)")
    .eq("id", groupId)
    .maybeSingle();
  if (!group) redirect(buildLocalizedPath("/dashboard", locale));
  const sportRelation = Array.isArray(group.sports) ? group.sports[0] : group.sports;
  const playerData = await fetchActivePlayersBySport(sportRelation?.code ?? "", {
    limit: 80,
  });
  const { data: pendingInvitations } = await adminSupabase
    .from("player_group_invitations")
    .select("recipient_id")
    .eq("group_id", groupId)
    .eq("status", "pending");
  const invitedIds = new Set(
    (pendingInvitations ?? []).map((item) => item.recipient_id),
  );
  const players = playerData.players.filter(
    (player) =>
      player.allowGroupInvites && player.profileId !== access.user?.id,
  );
  const inviteCopy = {
    message: t("playerFinder.groupInvite.message"),
    send: t("playerFinder.groupInvite.send"),
    sending: t("playerFinder.groupInvite.sending"),
    sent: t("playerFinder.groupInvite.sent"),
    alreadySent: t("playerFinder.groupInvite.alreadySent"),
    genericError: t("playerFinder.genericError"),
  };

  return (
    <div className="rt-page">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 pb-20 pt-10 md:px-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-950">
              {t("playerFinder.groupInvite.title")}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              {t("playerFinder.groupInvite.subtitle")}
            </p>
            <p className="mt-2 text-sm font-semibold text-blue-700">
              {group.name}
            </p>
          </div>
          <Link
            href={buildLocalizedPath(`/groups/${groupId}`, locale)}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
          >
            {t("playerFinder.groupInvite.backToGroup")}
          </Link>
        </div>

        {!playerData.schemaReady ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
            {t("playerFinder.schemaDescription")}
          </div>
        ) : players.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white px-6 py-14 text-center text-sm text-slate-600">
            {t("playerFinder.groupInvite.empty")}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {players.map((player) => (
              <BaseCard
                as="article"
                key={player.profileId}
                className="flex min-h-[15rem] flex-col p-5"
              >
                <div className="flex items-start gap-3">
                  <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100 font-semibold text-slate-600">
                    {player.avatarUrl ? (
                      <Image
                        src={player.avatarUrl}
                        alt=""
                        fill
                        sizes="48px"
                        className="object-cover"
                      />
                    ) : (
                      player.displayName.slice(0, 1).toUpperCase()
                    )}
                  </div>
                  <div>
                    <h2 className="font-semibold text-slate-950">
                      {player.displayName}
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                      {[player.area, player.skillLevel ? t(`playerFinder.skills.${player.skillLevel}`) : null]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                </div>
                {player.lookingNote && (
                  <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-600">
                    {player.lookingNote}
                  </p>
                )}
                <div className="mt-auto pt-5">
                  <GroupInviteButton
                    groupId={groupId}
                    recipientId={player.profileId}
                    alreadySent={invitedIds.has(player.profileId)}
                    copy={inviteCopy}
                  />
                </div>
              </BaseCard>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
