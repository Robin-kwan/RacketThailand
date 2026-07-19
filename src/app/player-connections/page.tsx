import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BaseCard } from "@/components/base-card";
import { ConnectionActions } from "@/components/player-finder/connection-actions";
import { buildAuthPagePath } from "@/lib/auth-redirect";
import { buildLocalizedPath, getTranslator, normalizeLocale } from "@/lib/i18n";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const metadata: Metadata = {
  title: "Play requests | RacketThailand",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{ lang?: string }> | undefined;
type ProfilePreview = {
  id: string;
  display_name: string | null;
  username: string | null;
};
type SportPreview = { code: string; name: string | null };
type GroupPreview = { id: string; name: string | null };

function relation<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function getName(profile: ProfilePreview | null) {
  return profile?.display_name ?? profile?.username ?? "RacketThailand player";
}

export default async function PlayerConnectionsPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const resolved = searchParams ? await searchParams : undefined;
  const locale = normalizeLocale(resolved?.lang);
  const t = await getTranslator(locale);
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.is_anonymous) {
    redirect(buildAuthPagePath("/login", locale, "/player-connections"));
  }

  const adminSupabase = getSupabaseAdminClient();
  const [incomingResult, outgoingResult, invitationResult] = await Promise.all([
    adminSupabase
      .from("player_play_requests")
      .select(
        "id,message,status,created_at,sports(code,name),sender:sender_id(id,display_name,username)",
      )
      .eq("recipient_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30),
    adminSupabase
      .from("player_play_requests")
      .select(
        "id,message,status,created_at,sports(code,name),recipient:recipient_id(id,display_name,username)",
      )
      .eq("sender_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30),
    adminSupabase
      .from("player_group_invitations")
      .select(
        "id,message,status,created_at,groups(id,name),inviter:invited_by(id,display_name,username)",
      )
      .eq("recipient_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);
  const schemaReady =
    !incomingResult.error && !outgoingResult.error && !invitationResult.error;
  const incoming = incomingResult.data ?? [];
  const outgoing = outgoingResult.data ?? [];
  const invitations = invitationResult.data ?? [];
  const actionCopy = {
    accept: t("playerFinder.connections.accept"),
    decline: t("playerFinder.connections.decline"),
    cancel: t("playerFinder.connections.cancel"),
    working: t("playerFinder.connections.working"),
    updated: t("playerFinder.connections.updated"),
    genericError: t("playerFinder.genericError"),
  };

  const statusLabel = (status: string) =>
    t(`playerFinder.connections.${status}`);

  return (
    <div className="rt-page">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 pb-20 pt-10 md:px-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-950">
              {t("playerFinder.connections.title")}
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              {t("playerFinder.connections.subtitle")}
            </p>
          </div>
          <Link
            href={buildLocalizedPath("/profile/edit#sport-profile", locale)}
            className="rt-btn-primary inline-flex items-center justify-center px-4 py-2 text-sm"
          >
            {t("playerFinder.manageProfile")}
          </Link>
        </div>

        {!schemaReady ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
            {t("playerFinder.connections.schemaRequired")}
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <BaseCard as="section" className="p-6">
              <h2 className="text-lg font-semibold text-slate-950">
                {t("playerFinder.connections.incoming")}
              </h2>
              {incoming.length === 0 ? (
                <p className="mt-4 text-sm text-slate-500">
                  {t("playerFinder.connections.empty")}
                </p>
              ) : (
                <div className="mt-4 divide-y divide-slate-100">
                  {incoming.map((item) => {
                    const sender = relation(item.sender as ProfilePreview | ProfilePreview[] | null);
                    const sport = relation(item.sports as SportPreview | SportPreview[] | null);
                    return (
                      <article key={item.id} className="py-4 first:pt-0">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-sm font-semibold text-slate-900">
                              {t("playerFinder.connections.from", {
                                name: getName(sender),
                              })}
                            </h3>
                            <p className="mt-1 text-xs text-slate-500">
                              {sport?.name ?? sport?.code}
                            </p>
                          </div>
                          <span className="rt-pill px-2 py-1 text-xs">
                            {statusLabel(item.status)}
                          </span>
                        </div>
                        {item.message && (
                          <p className="mt-3 text-sm leading-6 text-slate-600">
                            {item.message}
                          </p>
                        )}
                        {item.status === "pending" && (
                          <div className="mt-4">
                            <ConnectionActions
                              endpoint={`/api/play-requests/${item.id}`}
                              mode="incoming"
                              copy={actionCopy}
                            />
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </BaseCard>

            <div className="space-y-6">
              <BaseCard as="section" className="p-6">
                <h2 className="text-lg font-semibold text-slate-950">
                  {t("playerFinder.connections.groupInvitations")}
                </h2>
                {invitations.length === 0 ? (
                  <p className="mt-4 text-sm text-slate-500">
                    {t("playerFinder.connections.empty")}
                  </p>
                ) : (
                  <div className="mt-4 divide-y divide-slate-100">
                    {invitations.map((item) => {
                      const group = relation(item.groups as GroupPreview | GroupPreview[] | null);
                      return (
                        <article key={item.id} className="py-4 first:pt-0">
                          <div className="flex items-start justify-between gap-3">
                            <h3 className="text-sm font-semibold text-slate-900">
                              {t("playerFinder.connections.groupFrom", {
                                group: group?.name ?? "RacketThailand group",
                              })}
                            </h3>
                            <span className="rt-pill px-2 py-1 text-xs">
                              {statusLabel(item.status)}
                            </span>
                          </div>
                          {item.message && (
                            <p className="mt-3 text-sm leading-6 text-slate-600">
                              {item.message}
                            </p>
                          )}
                          <div className="mt-4 flex flex-wrap gap-3">
                            {group?.id && (
                              <Link
                                href={buildLocalizedPath(`/groups/${group.id}`, locale)}
                                className="text-xs font-semibold text-blue-700"
                              >
                                {group.name}
                              </Link>
                            )}
                            {item.status === "pending" && (
                              <ConnectionActions
                                endpoint={`/api/group-invitations/${item.id}`}
                                mode="incoming"
                                copy={actionCopy}
                              />
                            )}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </BaseCard>

              <BaseCard as="section" className="p-6">
                <h2 className="text-lg font-semibold text-slate-950">
                  {t("playerFinder.connections.outgoing")}
                </h2>
                {outgoing.length === 0 ? (
                  <p className="mt-4 text-sm text-slate-500">
                    {t("playerFinder.connections.empty")}
                  </p>
                ) : (
                  <div className="mt-4 divide-y divide-slate-100">
                    {outgoing.map((item) => {
                      const recipient = relation(item.recipient as ProfilePreview | ProfilePreview[] | null);
                      return (
                        <article key={item.id} className="py-4 first:pt-0">
                          <div className="flex items-start justify-between gap-3">
                            <h3 className="text-sm font-semibold text-slate-900">
                              {t("playerFinder.connections.to", {
                                name: getName(recipient),
                              })}
                            </h3>
                            <span className="rt-pill px-2 py-1 text-xs">
                              {statusLabel(item.status)}
                            </span>
                          </div>
                          {item.message && (
                            <p className="mt-3 text-sm leading-6 text-slate-600">
                              {item.message}
                            </p>
                          )}
                          {item.status === "pending" && (
                            <div className="mt-4">
                              <ConnectionActions
                                endpoint={`/api/play-requests/${item.id}`}
                                mode="outgoing"
                                copy={actionCopy}
                              />
                            </div>
                          )}
                        </article>
                      );
                    })}
                  </div>
                )}
              </BaseCard>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
