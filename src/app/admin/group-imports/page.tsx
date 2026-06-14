import {
  AdminPortalShell,
  buildAdminPortalNav,
} from "@/components/admin/admin-portal-shell";
import { AdminDraftGroupsTable } from "@/components/admin/admin-draft-groups-table";
import {
  buildLocalizedPath,
  getTranslator,
  normalizeLocale,
} from "@/lib/i18n";
import { getPlayFormatLabel } from "@/lib/play-format";
import { supabaseSelect } from "@/lib/supabaseRest";
import { requireAdminPageAccess } from "@/server/admin";

type SearchParams = {
  lang?: string;
};

type SearchParamsInput = Promise<SearchParams> | undefined;

async function resolveSearchParams(
  searchParams?: SearchParamsInput,
): Promise<SearchParams | undefined> {
  if (!searchParams) return undefined;
  return searchParams;
}

type GroupSessionRow = {
  day: string | null;
  start_time: string | null;
  end_time: string | null;
  courts?: {
    name: string | null;
    province: string | null;
  } | null;
};

type CourtLinkRow = {
  court_id: string | null;
};

type DraftGroupRow = {
  id: string;
  name: string | null;
  description: string | null;
  owner_id: string | null;
  play_format: "single" | "double" | null;
  player_amount: number | null;
  phone: string | null;
  line_id: string | null;
  website_url: string | null;
  status: string | null;
  updated_at: string | null;
  sports?: {
    code: string | null;
    name: string | null;
  } | null;
  group_photos?: { id: string }[] | null;
  group_sessions?: GroupSessionRow[] | null;
  court_groups?: CourtLinkRow[] | null;
};

type ProfileRow = {
  id: string;
  display_name: string | null;
  username: string | null;
};

function formatDate(value: string | null, locale: "th" | "en") {
  if (!value) return "-";
  return new Date(value).toLocaleDateString(locale === "th" ? "th-TH" : "en-US");
}

function formatTime(value: string | null) {
  return value?.slice(0, 5) ?? "";
}

function buildContact(
  row: Pick<DraftGroupRow, "phone" | "line_id" | "website_url">,
) {
  return [
    row.phone ? `Phone: ${row.phone}` : null,
    row.line_id ? `LINE: ${row.line_id}` : null,
    row.website_url ? "Website" : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

export default async function AdminGroupImportsPage({
  searchParams,
}: {
  searchParams?: SearchParamsInput;
}) {
  const resolved = await resolveSearchParams(searchParams);
  const locale = normalizeLocale(resolved?.lang);
  const t = await getTranslator(locale);
  await requireAdminPageAccess(locale);
  const navItems = buildAdminPortalNav(locale, t);
  const [groupsRes, profilesRes] = await Promise.all([
    supabaseSelect<DraftGroupRow>("groups", {
      select:
        "id,name,description,owner_id,play_format,player_amount,phone,line_id,website_url,status,updated_at,sports(code,name),group_photos(id),group_sessions(day,start_time,end_time,courts(name,province)),court_groups(court_id)",
      status: "eq.draft",
      order: "updated_at.desc.nullslast",
      limit: "200",
    }),
    supabaseSelect<ProfileRow>("profiles", {
      select: "id,display_name,username",
      order: "display_name.asc.nullslast",
      limit: "1000",
    }),
  ]);

  const profileNameById = new Map(
    profilesRes.data?.map((profile) => [
      profile.id,
      profile.display_name ?? profile.username ?? profile.id.slice(0, 6),
    ]) ?? [],
  );

  const dayLabels = {
    sunday: t("groups.days.sunday"),
    monday: t("groups.days.monday"),
    tuesday: t("groups.days.tuesday"),
    wednesday: t("groups.days.wednesday"),
    thursday: t("groups.days.thursday"),
    friday: t("groups.days.friday"),
    saturday: t("groups.days.saturday"),
  } as Record<string, string>;

  const rows =
    groupsRes.data
      ?.map((group) => {
      const sessions = group.group_sessions ?? [];
      const linkedCourts =
        group.court_groups?.filter((link) => Boolean(link.court_id)).length ?? 0;
      const missingCourt = sessions.length === 0 && linkedCourts === 0;
      const firstSession = sessions[0];
      const firstSessionLabel = firstSession
        ? [
            firstSession.day ? dayLabels[firstSession.day] ?? firstSession.day : null,
            `${formatTime(firstSession.start_time)}-${formatTime(firstSession.end_time)}`,
            firstSession.courts?.name ?? null,
          ]
            .filter(Boolean)
            .join(" · ")
        : null;
      const photoCount = group.group_photos?.length ?? 0;
      const contact = buildContact(group);

      return {
        id: group.id,
        title: group.name?.trim() || t("admin.management.groups.fallback"),
        subtitle:
          group.description?.trim() ||
          firstSessionLabel ||
          (group.sports?.name ?? group.sports?.code ?? undefined),
        meta: [group.sports?.name ?? group.sports?.code ?? "Sport"],
        missingCourt,
        details: [
          {
            label: t("admin.management.common.owner"),
            value: group.owner_id
              ? profileNameById.get(group.owner_id) ?? group.owner_id.slice(0, 6)
              : t("admin.management.common.unassigned"),
          },
          {
            label: t("admin.management.common.sessions"),
            value: sessions.length.toLocaleString(
              locale === "th" ? "th-TH" : "en-US",
            ),
          },
          {
            label: "Court link",
            value: missingCourt
              ? "Not linked"
              : linkedCourts > 0
                ? linkedCourts.toLocaleString(
                    locale === "th" ? "th-TH" : "en-US",
                  )
                : firstSession?.courts?.name ?? "Linked via session",
          },
          {
            label: t("groups.detail.playFormat"),
            value: getPlayFormatLabel(group.play_format, locale),
          },
          {
            label: t("admin.management.common.players"),
            value:
              typeof group.player_amount === "number"
                ? group.player_amount.toLocaleString(
                    locale === "th" ? "th-TH" : "en-US",
                  )
                : t("admin.management.common.notSet"),
          },
          {
            label: t("admin.management.common.photos"),
            value: photoCount.toLocaleString(
              locale === "th" ? "th-TH" : "en-US",
            ),
          },
          {
            label: t("admin.management.common.contact"),
            value: contact || t("admin.management.common.notSet"),
          },
          {
            label: t("admin.management.common.updated"),
            value: formatDate(group.updated_at, locale),
          },
        ],
        statusLabel: "Draft",
        viewHref: buildLocalizedPath(`/groups/${group.id}`, locale),
        editHref: buildLocalizedPath(`/groups/${group.id}/edit`, locale),
        publishEndpoint: `/api/admin/groups/${group.id}`,
        deleteEndpoint: `/api/admin/groups/${group.id}`,
      };
      })
      .sort((a, b) => {
        if (a.missingCourt === b.missingCourt) {
          return 0;
        }
        return a.missingCourt ? -1 : 1;
      }) ?? [];

  return (
    <AdminPortalShell
      activePath="/admin/group-imports"
      title="Draft Groups"
      navItems={navItems}
      copy={{
        navigationLabel: t("admin.navigation"),
      }}
    >
      <section className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-slate-900">
            Draft review queue
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Review hidden draft groups here before showing them on the website.
            Use Display when the row is ready, or Delete when it should not stay
            in the system.
          </p>
        </div>
        <AdminDraftGroupsTable rows={rows} />
      </section>
    </AdminPortalShell>
  );
}
