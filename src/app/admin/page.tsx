import Link from "next/link";
import { CourtSubmissionPolicyToggle } from "@/components/admin/court-submission-policy-toggle";
import {
  AdminPortalShell,
  buildAdminPortalNav,
} from "@/components/admin/admin-portal-shell";
import {
  formatCasualPlayDate,
  formatCasualPlayTimeRange,
  getThailandTodayDateString,
} from "@/lib/casual-play";
import { getAllowPublicCourtPublish } from "@/lib/court-submission-policy";
import {
  buildLocalizedPath,
  getTranslator,
  normalizeLocale,
} from "@/lib/i18n";
import { supabaseSelect } from "@/lib/supabaseRest";
import { requireAdminPageAccess } from "@/server/admin";

type SearchParams = {
  lang?: string;
};

type SearchParamsInput = Promise<SearchParams> | undefined;

type PendingCourtRow = {
  id: string;
  name: string | null;
  district: string | null;
  province: string | null;
  created_at: string;
};

type FeedbackRow = {
  id: string;
  subject: string | null;
  type: string | null;
  created_at: string;
  reporter?: {
    display_name: string | null;
    username: string | null;
  } | null;
};

type CasualPlayRow = {
  id: string;
  title: string | null;
  play_date: string;
  start_time: string | null;
  end_time: string | null;
  venue_name: string | null;
  sports: {
    code: string | null;
    name: string | null;
  } | null;
  courts: {
    id: string;
    name: string | null;
  } | null;
};

async function resolveSearchParams(
  searchParams?: SearchParamsInput,
): Promise<SearchParams | undefined> {
  if (!searchParams) return undefined;
  return searchParams;
}

function formatDateTime(value: string, locale: "th" | "en") {
  return new Date(value).toLocaleString(locale === "th" ? "th-TH" : "en-US");
}

function buildMetricCards(t: Awaited<ReturnType<typeof getTranslator>>) {
  return [
    t("admin.metrics.liveCourts"),
    t("admin.metrics.pendingCourts"),
    t("admin.metrics.managedCourts"),
    t("admin.metrics.unreadFeedback"),
    t("admin.metrics.upcomingCasualPlays"),
  ];
}

export default async function AdminPanel({
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

  const [
    allowPublicCourtPublish,
    totalCourtsRes,
    assignedCourtsRes,
    pendingCourtsRes,
    unreadFeedbackRes,
    upcomingCasualPlaysRes,
  ] = await Promise.all([
    getAllowPublicCourtPublish(),
    supabaseSelect<{ id: string }>("courts", {
      select: "id",
      limit: "1",
    }),
    supabaseSelect<{ id: string }>("courts", {
      select: "id",
      created_by: "not.is.null",
      limit: "1",
    }),
    supabaseSelect<PendingCourtRow>("courts", {
      select: "id,name,district,province,created_at",
      is_active: "eq.false",
      order: "created_at.desc",
      limit: "4",
    }),
    supabaseSelect<FeedbackRow>("feedback", {
      select:
        "id,subject,type,created_at,reporter:profiles!feedback_reporter_id_fkey(display_name,username)",
      checked: "eq.false",
      order: "created_at.desc",
      limit: "4",
    }),
    supabaseSelect<CasualPlayRow>("casual_plays", {
      select:
        "id,title,play_date,start_time,end_time,venue_name,sports(code,name),courts(id,name)",
      play_date: `gte.${today}`,
      order: "play_date.asc",
      limit: "4",
    }),
  ]);

  const metricCards = buildMetricCards(t);
  const metricValues = [
    totalCourtsRes.count ?? totalCourtsRes.data.length,
    pendingCourtsRes.count ?? pendingCourtsRes.data.length,
    assignedCourtsRes.count ?? assignedCourtsRes.data.length,
    unreadFeedbackRes.count ?? unreadFeedbackRes.data.length,
    upcomingCasualPlaysRes.count ?? upcomingCasualPlaysRes.data.length,
  ];
  const quickActions = [
    {
      href: buildLocalizedPath("/admin/courts", locale),
      title: t("admin.quickActions.addCourtTitle"),
    },
    {
      href: buildLocalizedPath("/admin/groups", locale),
      title: t("admin.quickActions.groupsTitle"),
    },
    {
      href: buildLocalizedPath("/admin/casual-plays", locale),
      title: t("admin.quickActions.casualPlaysTitle"),
    },
    {
      href: buildLocalizedPath("/admin/court-owners", locale),
      title: t("admin.quickActions.assignManagersTitle"),
    },
    {
      href: buildLocalizedPath("/admin/feedback", locale),
      title: t("admin.quickActions.feedbackTitle"),
    },
  ];

  return (
    <AdminPortalShell
      activePath="/admin"
      title={t("admin.panelTitle")}
      navItems={navItems}
      copy={{
        navigationLabel: t("admin.navigation"),
      }}
    >
      <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              {t("admin.quickActionsLabel")}
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">
              {t("admin.quickActionsHeading")}
            </h2>
          </div>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="rounded-3xl border border-slate-200 bg-slate-50 p-5 transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white"
            >
              <p className="text-lg font-semibold text-slate-900">
                {action.title}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-5">
        {metricCards.map((label, index) => (
          <div
            key={label}
            className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              {label}
            </p>
            <p className="mt-3 text-4xl font-semibold text-slate-900">
              {metricValues[index].toLocaleString(
                locale === "th" ? "th-TH" : "en-US",
              )}
            </p>
          </div>
        ))}
      </section>

      <CourtSubmissionPolicyToggle
        initialAllowPublicCourtPublish={allowPublicCourtPublish}
        copy={{
          title: t("admin.courtSubmissionPolicy.title"),
          current: t("admin.courtSubmissionPolicy.current"),
          toggleLabel: t("admin.courtSubmissionPolicy.toggleLabel"),
          directMode: t("admin.courtSubmissionPolicy.directMode"),
          requestMode: t("admin.courtSubmissionPolicy.requestMode"),
          save: t("admin.courtSubmissionPolicy.save"),
          saving: t("admin.courtSubmissionPolicy.saving"),
          saved: t("admin.courtSubmissionPolicy.saved"),
          unsaved: t("admin.courtSubmissionPolicy.unsaved"),
          error: t("admin.courtSubmissionPolicy.error"),
        }}
      />

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                {t("admin.sections.pendingCourtsLabel")}
              </p>
              <h2 className="mt-2 text-xl font-semibold text-slate-900">
                {t("admin.sections.pendingCourtsTitle")}
              </h2>
            </div>
            <Link
              href={buildLocalizedPath("/admin/courts", locale)}
              className="text-sm font-semibold text-slate-600 underline-offset-4 hover:underline"
            >
              {t("admin.open")}
            </Link>
          </div>
          <div className="mt-5 space-y-3">
            {pendingCourtsRes.data.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-600">
                {t("admin.sections.pendingCourtsEmpty")}
              </p>
            ) : (
              pendingCourtsRes.data.map((court) => (
                <div
                  key={court.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {court.name ?? t("admin.sections.courtFallback")}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {[court.district, court.province]
                          .filter(Boolean)
                          .join(" · ") || t("admin.sections.locationMissing")}
                      </p>
                    </div>
                    <Link
                      href={buildLocalizedPath(`/courts/${court.id}`, locale)}
                      className="text-xs font-semibold uppercase tracking-wide text-slate-500 underline-offset-4 hover:underline"
                    >
                      {t("admin.sections.viewItem")}
                    </Link>
                  </div>
                  <p className="mt-3 text-xs text-slate-500">
                    {t("admin.sections.submittedOn")}:{" "}
                    {formatDateTime(court.created_at, locale)}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                {t("admin.sections.feedbackLabel")}
              </p>
              <h2 className="mt-2 text-xl font-semibold text-slate-900">
                {t("admin.sections.feedbackTitle")}
              </h2>
            </div>
            <Link
              href={buildLocalizedPath("/admin/feedback", locale)}
              className="text-sm font-semibold text-slate-600 underline-offset-4 hover:underline"
            >
              {t("admin.open")}
            </Link>
          </div>
          <div className="mt-5 space-y-3">
            {unreadFeedbackRes.data.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-600">
                {t("admin.sections.feedbackEmpty")}
              </p>
            ) : (
              unreadFeedbackRes.data.map((feedback) => {
                const reporterName =
                  feedback.reporter?.display_name ??
                  feedback.reporter?.username ??
                  t("admin.feedbackTable.anonymous");
                return (
                  <div
                    key={feedback.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
                  >
                    <p className="font-semibold text-slate-900">
                      {feedback.subject?.trim() ||
                        t("admin.feedbackTable.noSubject")}
                    </p>
                    <p className="mt-2 text-sm text-slate-600">
                      {t("admin.sections.reportedBy")}: {reporterName}
                    </p>
                    {feedback.type && (
                      <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {feedback.type}
                      </p>
                    )}
                    <p className="mt-3 text-xs text-slate-500">
                      {formatDateTime(feedback.created_at, locale)}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                {t("admin.sections.casualPlaysLabel")}
              </p>
              <h2 className="mt-2 text-xl font-semibold text-slate-900">
                {t("admin.sections.casualPlaysTitle")}
              </h2>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {upcomingCasualPlaysRes.data.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-600">
                {t("admin.sections.casualPlaysEmpty")}
              </p>
            ) : (
              upcomingCasualPlaysRes.data.map((play) => (
                <Link
                  key={play.id}
                  href={buildLocalizedPath(`/casual-plays/${play.id}`, locale)}
                  className="block rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 transition hover:border-slate-300 hover:bg-white"
                >
                  <p className="font-semibold text-slate-900">
                    {play.title?.trim() || t("admin.sections.casualPlayFallback")}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {play.courts?.name ??
                      play.venue_name ??
                      t("admin.sections.venueMissing")}
                  </p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {play.sports?.name ?? play.sports?.code ?? "Racket sport"}
                  </p>
                  <p className="mt-3 text-xs text-slate-500">
                    {formatCasualPlayDate(play.play_date, locale)} ·{" "}
                    {formatCasualPlayTimeRange(
                      play.start_time,
                      play.end_time,
                      locale,
                    )}
                  </p>
                </Link>
              ))
            )}
          </div>
        </div>
      </section>
    </AdminPortalShell>
  );
}
