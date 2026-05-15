import {
  AdminPortalShell,
  buildAdminPortalNav,
} from "@/components/admin/admin-portal-shell";
import {
  AdminResourceTable,
  type AdminResourceRow,
} from "@/components/admin/admin-resource-table";
import {
  formatCasualPlayDate,
  formatCasualPlayTimeRange,
  getThailandTodayDateString,
} from "@/lib/casual-play";
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

type CasualPlayManagementRow = {
  id: string;
  title: string | null;
  description: string | null;
  owner_id: string | null;
  play_date: string;
  start_time: string | null;
  end_time: string | null;
  play_format: "single" | "double" | null;
  player_amount: number | null;
  phone: string | null;
  line_id: string | null;
  venue_name: string | null;
  location_note: string | null;
  sports?: {
    code: string | null;
    name: string | null;
  } | null;
  courts?: {
    name: string | null;
    district: string | null;
    province: string | null;
  } | null;
};

type ProfileRow = {
  id: string;
  display_name: string | null;
  username: string | null;
};

async function resolveSearchParams(
  searchParams?: SearchParamsInput,
): Promise<SearchParams | undefined> {
  if (!searchParams) return undefined;
  return searchParams;
}

function buildContact(
  row: Pick<CasualPlayManagementRow, "phone" | "line_id">,
) {
  return [
    row.phone ? `Phone: ${row.phone}` : null,
    row.line_id ? `LINE: ${row.line_id}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

export default async function AdminCasualPlaysPage({
  searchParams,
}: {
  searchParams?: SearchParamsInput;
}) {
  const resolved = await resolveSearchParams(searchParams);
  const locale = normalizeLocale(resolved?.lang);
  const t = await getTranslator(locale);
  await requireAdminPageAccess(locale);
  const navItems = buildAdminPortalNav(locale, t);
  const today = getThailandTodayDateString();

  const [playsRes, profilesRes] = await Promise.all([
    supabaseSelect<CasualPlayManagementRow>("casual_plays", {
      select:
        "id,title,description,owner_id,play_date,start_time,end_time,play_format,player_amount,phone,line_id,venue_name,location_note,sports(code,name),courts(name,district,province)",
      play_date: `gte.${today}`,
      order: "play_date.asc,start_time.asc",
      limit: "100",
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

  const tableRows: AdminResourceRow[] =
    playsRes.data?.map((play) => {
      const venue =
        play.courts?.name ??
        play.venue_name ??
        t("admin.sections.venueMissing");
      const venueLocation = [play.courts?.district, play.courts?.province]
        .filter(Boolean)
        .join(" · ");
      const contact = buildContact(play);
      const formattedDate = formatCasualPlayDate(play.play_date, locale);
      const formattedTime = formatCasualPlayTimeRange(
        play.start_time,
        play.end_time,
        locale,
      );

      return {
        id: play.id,
        title: play.title?.trim() || t("admin.sections.casualPlayFallback"),
        subtitle: play.description?.trim() || play.location_note || venue,
        meta: [play.sports?.name ?? play.sports?.code ?? "Sport"],
        details: [
          {
            label: t("admin.management.common.owner"),
            value: play.owner_id
              ? profileNameById.get(play.owner_id) ?? play.owner_id.slice(0, 6)
              : t("admin.management.common.unassigned"),
          },
          {
            label: t("admin.management.common.venue"),
            value: venueLocation ? `${venue} · ${venueLocation}` : venue,
          },
          {
            label: t("admin.management.common.date"),
            value: formattedDate,
          },
          {
            label: t("admin.management.common.time"),
            value: formattedTime,
          },
          {
            label: t("casualPlays.detail.playFormat"),
            value: getPlayFormatLabel(play.play_format, locale),
          },
          {
            label: t("admin.management.common.players"),
            value:
              typeof play.player_amount === "number"
                ? play.player_amount.toLocaleString(
                    locale === "th" ? "th-TH" : "en-US",
                  )
                : t("admin.management.common.notSet"),
          },
          {
            label: t("admin.management.common.contact"),
            value: contact || t("admin.management.common.notSet"),
          },
        ],
        statusLabel:
          play.play_date === today
            ? t("admin.management.casualPlays.statusToday")
            : t("admin.management.casualPlays.statusUpcoming"),
        statusTone: play.play_date === today ? "yellow" : "green",
        viewHref: buildLocalizedPath(`/casual-plays/${play.id}`, locale),
        editHref: buildLocalizedPath(`/casual-plays/${play.id}/edit`, locale),
        deleteEndpoint: `/api/admin/casual-plays/${play.id}`,
      };
    }) ?? [];

  return (
    <AdminPortalShell
      activePath="/admin/casual-plays"
      title={t("admin.management.casualPlays.title")}
      navItems={navItems}
      copy={{
        navigationLabel: t("admin.navigation"),
      }}
    >
      <section className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-slate-900">
            {t("admin.management.casualPlays.listTitle")}
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            {t("admin.management.casualPlays.listSubtitle")}
          </p>
        </div>
        <AdminResourceTable
          rows={tableRows}
          copy={{
            searchLabel: t("admin.management.table.search"),
            searchPlaceholder: t(
              "admin.management.casualPlays.searchPlaceholder",
            ),
            resultsLabel: t("admin.management.casualPlays.resultsLabel"),
            headers: {
              item: t("admin.management.table.item"),
              details: t("admin.management.table.details"),
              status: t("admin.management.table.status"),
              actions: t("admin.management.table.actions"),
            },
            view: t("admin.management.table.view"),
            edit: t("admin.management.table.edit"),
            delete: t("admin.management.table.delete"),
            deleting: t("admin.management.table.deleting"),
            cancel: t("admin.management.table.cancel"),
            confirmDelete: t("admin.management.casualPlays.confirmDelete"),
            deleted: t("admin.management.casualPlays.deleted"),
            empty: t("admin.management.casualPlays.empty"),
            error: t("admin.management.casualPlays.error"),
            noDetails: t("admin.management.table.noDetails"),
          }}
        />
      </section>
    </AdminPortalShell>
  );
}
