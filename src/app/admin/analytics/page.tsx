import Link from "next/link";
import { Suspense } from "react";
import { PlayerActivity } from "@/components/admin/player-activity";
import { PLAYER_ANALYTICS_SPORTS } from "@/lib/player-analytics";
import { Activity, Eye, Gauge, Radio, UserPlus, Users } from "lucide-react";
import {
  AdminPortalShell,
  buildAdminPortalNav,
} from "@/components/admin/admin-portal-shell";
import {
  buildLocalizedPath,
  getTranslator,
  normalizeLocale,
  type Locale,
} from "@/lib/i18n";
import { requireAdminPageAccess } from "@/server/admin";
import {
  ANALYTICS_RANGE_KEYS,
  fetchGoogleAnalyticsDashboard,
  getGoogleAnalyticsConfiguration,
  resolveAnalyticsRange,
  type GoogleAnalyticsDashboardData,
} from "@/server/googleAnalytics";

type SearchParams = {
  lang?: string;
  range?: string;
  playerSport?: string;
};

type SearchParamsInput = Promise<SearchParams> | undefined;

function formatNumber(value: number, locale: Locale) {
  return value.toLocaleString(locale === "th" ? "th-TH" : "en-US");
}

function formatPercent(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "th" ? "th-TH" : "en-US", {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatAnalyticsDate(value: string, locale: Locale) {
  if (!/^\d{8}$/.test(value)) return value;
  const date = new Date(
    Date.UTC(
      Number(value.slice(0, 4)),
      Number(value.slice(4, 6)) - 1,
      Number(value.slice(6, 8)),
    ),
  );
  return new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatUpdatedAt(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  }).format(new Date(value));
}

function MetricCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Users;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-600">{label}</p>
        <span className="flex size-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
          <Icon className="size-4" aria-hidden />
        </span>
      </div>
      <p className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
        {value}
      </p>
    </div>
  );
}

function DailyTrafficChart({
  data,
  locale,
}: {
  data: GoogleAnalyticsDashboardData["trend"];
  locale: Locale;
}) {
  const maxViews = Math.max(...data.map((row) => row.views), 1);

  if (data.length === 0) return null;

  return (
    <div className="overflow-x-auto pb-2">
      <div
        className="flex h-64 min-w-[640px] items-end gap-1.5 border-b border-slate-200 px-1"
        role="img"
        aria-label="Daily Google Analytics page views"
      >
        {data.map((row, index) => {
          const height = Math.max((row.views / maxViews) * 100, 2);
          const showLabel =
            index === 0 ||
            index === data.length - 1 ||
            index % Math.max(Math.ceil(data.length / 6), 1) === 0;
          return (
            <div
              key={row.date}
              className="group relative flex h-full min-w-1 flex-1 items-end"
              title={`${formatAnalyticsDate(row.date, locale)} · ${formatNumber(row.views, locale)} views · ${formatNumber(row.activeUsers, locale)} users`}
            >
              <div
                className="w-full rounded-t-sm bg-emerald-500 transition-colors group-hover:bg-emerald-600"
                style={{ height: `${height}%` }}
              />
              {showLabel ? (
                <span className="absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] text-slate-500">
                  {formatAnalyticsDate(row.date, locale)}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
      <div className="h-7" aria-hidden />
    </div>
  );
}

function RankedRows({
  rows,
  valueKey,
  labelKey,
  locale,
}: {
  rows: Record<string, string | number>[];
  valueKey: string;
  labelKey: string;
  locale: Locale;
}) {
  const max = Math.max(...rows.map((row) => Number(row[valueKey] ?? 0)), 1);

  return (
    <div className="space-y-4">
      {rows.map((row, index) => {
        const value = Number(row[valueKey] ?? 0);
        const label = String(row[labelKey] ?? "");
        return (
          <div key={`${label}-${index}`}>
            <div className="flex items-start justify-between gap-4 text-sm">
              <span className="min-w-0 break-all font-medium text-slate-800">
                {label}
              </span>
              <span className="shrink-0 font-semibold tabular-nums text-slate-950">
                {formatNumber(value, locale)}
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-emerald-500"
                style={{ width: `${Math.max((value / max) * 100, 2)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams?: SearchParamsInput;
}) {
  const resolved = searchParams ? await searchParams : undefined;
  const locale = normalizeLocale(resolved?.lang);
  const range = resolveAnalyticsRange(resolved?.range);
  const playerSport = PLAYER_ANALYTICS_SPORTS.some(
    (code) => code === resolved?.playerSport,
  )
    ? resolved!.playerSport!
    : "all";
  const t = await getTranslator(locale);
  await requireAdminPageAccess(locale);

  const configuration = getGoogleAnalyticsConfiguration();
  let dashboard: GoogleAnalyticsDashboardData | null = null;
  let loadError = false;

  if (configuration.reportingConfigured) {
    try {
      dashboard = await fetchGoogleAnalyticsDashboard(range);
    } catch (error) {
      loadError = true;
      console.error(
        "Unable to load Google Analytics admin dashboard:",
        error instanceof Error ? error.message : "Unknown error",
      );
    }
  }

  const navItems = buildAdminPortalNav(locale, t);
  const showSetup =
    !configuration.trackingConfigured || !configuration.reportingConfigured;
  const missingVariables = [
    ...(configuration.trackingConfigured
      ? []
      : ["NEXT_PUBLIC_GOOGLE_ANALYTICS_ID"]),
    ...configuration.missingReportingVariables,
  ];
  const countrySessions =
    dashboard?.countries.reduce((sum, row) => sum + row.sessions, 0) ?? 0;
  const thailandSessions =
    dashboard?.countries.find((row) => row.countryCode === "TH")?.sessions ?? 0;
  const thailandShare =
    countrySessions > 0 ? thailandSessions / countrySessions : 0;
  const nonThailandSessions = Math.max(countrySessions - thailandSessions, 0);

  return (
    <AdminPortalShell
      activePath="/admin/analytics"
      title={t("admin.analytics.title")}
      navItems={navItems}
      copy={{ navigationLabel: t("admin.navigation") }}
    >
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-2xl">
            <p className="text-sm leading-6 text-slate-600">
              {t("admin.analytics.subtitle")}
            </p>
            {dashboard ? (
              <p className="mt-2 text-xs text-slate-500">
                {t("admin.analytics.updated")}:{" "}
                {formatUpdatedAt(dashboard.generatedAt, locale)}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {ANALYTICS_RANGE_KEYS.map((rangeKey) => (
              <Link
                key={rangeKey}
                href={buildLocalizedPath(
                  `/admin/analytics?range=${rangeKey}&playerSport=${playerSport}`,
                  locale,
                )}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  range === rangeKey
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                {t(`admin.analytics.ranges.${rangeKey}`)}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <Suspense
        fallback={
          <p className="p-5 text-sm text-slate-500">
            {t("playerAnalytics.loading")}
          </p>
        }
      >
        <PlayerActivity locale={locale} range={range} sport={playerSport} />
      </Suspense>

      {showSetup ? (
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-amber-950">
            {t("admin.analytics.setupTitle")}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-amber-900/80">
            {t("admin.analytics.setupSubtitle")}
          </p>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-amber-200 bg-white/75 p-4 text-sm font-semibold text-slate-800">
              {configuration.trackingConfigured
                ? t("admin.analytics.trackingReady")
                : t("admin.analytics.trackingMissing")}
            </div>
            <div className="rounded-lg border border-amber-200 bg-white/75 p-4 text-sm font-semibold text-slate-800">
              {configuration.reportingConfigured
                ? t("admin.analytics.reportingReady")
                : t("admin.analytics.reportingMissing")}
            </div>
          </div>
          <ol className="mt-5 list-decimal space-y-2 pl-5 text-sm leading-6 text-amber-950">
            <li>{t("admin.analytics.setupSteps.property")}</li>
            <li>{t("admin.analytics.setupSteps.serviceAccount")}</li>
            <li>{t("admin.analytics.setupSteps.vercel")}</li>
          </ol>
          {missingVariables.length > 0 ? (
            <div className="mt-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-800">
                {t("admin.analytics.missingVariables")}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {missingVariables.map((name) => (
                  <code
                    key={name}
                    className="rounded-md border border-amber-200 bg-white px-2.5 py-1.5 text-xs text-slate-800"
                  >
                    {name}
                  </code>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {loadError ? (
        <section className="rounded-lg border border-rose-200 bg-rose-50 p-6">
          <h2 className="font-semibold text-rose-950">
            {t("admin.analytics.errorTitle")}
          </h2>
          <p className="mt-2 text-sm leading-6 text-rose-800">
            {t("admin.analytics.errorBody")}
          </p>
        </section>
      ) : null}

      {dashboard ? (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            <MetricCard
              label={t("admin.analytics.metrics.activeUsers")}
              value={formatNumber(dashboard.summary.activeUsers, locale)}
              icon={Users}
            />
            <MetricCard
              label={t("admin.analytics.metrics.newUsers")}
              value={formatNumber(dashboard.summary.newUsers, locale)}
              icon={UserPlus}
            />
            <MetricCard
              label={t("admin.analytics.metrics.sessions")}
              value={formatNumber(dashboard.summary.sessions, locale)}
              icon={Activity}
            />
            <MetricCard
              label={t("admin.analytics.metrics.views")}
              value={formatNumber(dashboard.summary.views, locale)}
              icon={Eye}
            />
            <MetricCard
              label={t("admin.analytics.metrics.engagementRate")}
              value={formatPercent(dashboard.summary.engagementRate, locale)}
              icon={Gauge}
            />
            <MetricCard
              label={t("admin.analytics.metrics.realtimeUsers")}
              value={formatNumber(
                dashboard.summary.realtimeActiveUsers,
                locale,
              )}
              icon={Radio}
            />
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-950">
              {t("admin.analytics.trendTitle")}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {t("admin.analytics.trendSubtitle")}
            </p>
            <div className="mt-6">
              {dashboard.trend.length > 0 ? (
                <DailyTrafficChart data={dashboard.trend} locale={locale} />
              ) : (
                <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
                  {t("admin.analytics.empty")}
                </p>
              )}
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-950">
                {t("admin.analytics.topPagesTitle")}
              </h2>
              <div className="mt-5">
                <RankedRows
                  rows={dashboard.topPages}
                  valueKey="views"
                  labelKey="path"
                  locale={locale}
                />
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-950">
                {t("admin.analytics.channelsTitle")}
              </h2>
              <div className="mt-5">
                <RankedRows
                  rows={dashboard.channels}
                  valueKey="sessions"
                  labelKey="channel"
                  locale={locale}
                />
              </div>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-950">
                {t("admin.analytics.countriesTitle")}
              </h2>
              <div className="mt-5">
                <RankedRows
                  rows={dashboard.countries.slice(0, 10)}
                  valueKey="sessions"
                  labelKey="country"
                  locale={locale}
                />
              </div>
            </div>
            <div className="space-y-4">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5">
                <p className="text-sm font-semibold text-emerald-800">
                  {t("admin.analytics.thailandShare")}
                </p>
                <p className="mt-3 text-3xl font-semibold text-emerald-950">
                  {formatPercent(thailandShare, locale)}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold text-slate-600">
                  {t("admin.analytics.nonThailandSessions")}
                </p>
                <p className="mt-3 text-3xl font-semibold text-slate-950">
                  {formatNumber(nonThailandSessions, locale)}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-950">
              {t("admin.analytics.authTrafficTitle")}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {t("admin.analytics.authTrafficSubtitle")}
            </p>
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-3 font-semibold">
                      {t("admin.analytics.path")}
                    </th>
                    <th className="px-3 py-3 text-right font-semibold">
                      {t("admin.analytics.views")}
                    </th>
                    <th className="px-3 py-3 text-right font-semibold">
                      {t("admin.analytics.users")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dashboard.authPages.length > 0 ? (
                    dashboard.authPages.map((row) => (
                      <tr key={row.path}>
                        <td className="break-all px-3 py-3 font-medium text-slate-800">
                          {row.path}
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums text-slate-700">
                          {formatNumber(row.views, locale)}
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums text-slate-700">
                          {formatNumber(row.activeUsers, locale)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-3 py-8 text-center text-slate-500"
                      >
                        {t("admin.analytics.empty")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}
    </AdminPortalShell>
  );
}
