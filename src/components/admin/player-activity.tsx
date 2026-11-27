import Link from "next/link";
import { buildLocalizedPath, getTranslator, type Locale } from "@/lib/i18n";
import {
  PLAYER_ANALYTICS_ACTIONS,
  PLAYER_ANALYTICS_SPORTS,
} from "@/lib/player-analytics";
import { SPORT_META } from "@/data/sportMeta";
import { fetchPlayerOutcomes } from "@/server/playerAnalytics";
import {
  fetchPlayerFunnel,
  getGoogleAnalyticsConfiguration,
  type AnalyticsRangeKey,
} from "@/server/googleAnalytics";

export async function PlayerActivity({
  locale,
  range,
  sport,
}: {
  locale: Locale;
  range: AnalyticsRangeKey;
  sport: string;
}) {
  const t = await getTranslator(locale);
  const days = Number.parseInt(range, 10);
  const configured = getGoogleAnalyticsConfiguration().reportingConfigured;
  const [outcomeResult, funnelResult] = await Promise.allSettled([
    fetchPlayerOutcomes(days, sport),
    configured ? fetchPlayerFunnel(days, sport) : Promise.resolve(null),
  ]);
  const outcomes =
    outcomeResult.status === "fulfilled" ? outcomeResult.value : null;
  const funnel =
    funnelResult.status === "fulfilled" ? funnelResult.value : null;
  const n = (value: number) =>
    value.toLocaleString(locale === "th" ? "th-TH" : "en-US");
  const outcomeKeys = [
    "sent",
    "senders",
    "recipients",
    "accepted",
    "declined",
    "pending",
    "cancelled",
  ] as const;
  return (
    <section
      id="player-activity"
      className="space-y-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
    >
      <h2 className="text-xl font-semibold text-slate-950">
        {t("playerAnalytics.title")}
      </h2>
      <p className="text-sm text-slate-600">
        {t("playerAnalytics.scope", { days })}
      </p>
      <nav
        aria-label={t("playerAnalytics.sportFilter")}
        className="flex flex-wrap gap-2"
      >
        {["all", ...PLAYER_ANALYTICS_SPORTS].map((code) => (
          <Link
            key={code}
            aria-current={code === sport ? "page" : undefined}
            href={buildLocalizedPath(
              `/admin/analytics?range=${range}&playerSport=${code}#player-activity`,
              locale,
            )}
            className={`rounded-full border px-3 py-2 text-sm font-semibold ${sport === code ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
          >
            {code === "all"
              ? t("playerAnalytics.allSports")
              : (SPORT_META[code]?.name[locale] ?? code)}
          </Link>
        ))}
      </nav>
      <div>
        <h3 className="font-semibold text-slate-900">
          {t("playerAnalytics.outcomes")}
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          {t("playerAnalytics.outcomeNote")}
        </p>
        {!outcomes ? (
          <p role="alert" className="mt-4 text-sm text-rose-700">
            {t("playerAnalytics.databaseError")}
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-600">
                  <th className="py-3 pr-3">{t("playerAnalytics.measure")}</th>
                  <th className="px-3 py-3 text-right">
                    {t("playerAnalytics.requests")}
                  </th>
                  <th className="py-3 pl-3 text-right">
                    {t("playerAnalytics.invitations")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {outcomeKeys.map((key) => (
                  <tr
                    key={key}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <th
                      scope="row"
                      className="py-3 pr-3 text-left font-medium text-slate-700"
                    >
                      {t(`playerAnalytics.${key}`)}
                    </th>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {n(outcomes.requests[key])}
                    </td>
                    <td className="py-3 pl-3 text-right tabular-nums">
                      {n(outcomes.invitations[key])}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className="border-t border-slate-200 pt-5">
        <h3 className="font-semibold text-slate-900">
          {t("playerAnalytics.browsing")}
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          {t("playerAnalytics.funnelNote")}
        </p>
        {!funnel ? (
          <p className="mt-4 text-sm text-amber-800">
            {t(
              configured
                ? "playerAnalytics.gaError"
                : "playerAnalytics.gaMissing",
            )}
          </p>
        ) : (
          <>
            {funnel.limited && (
              <p className="mt-3 text-sm text-amber-800">
                {t("playerAnalytics.limited")}
              </p>
            )}
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[420px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-600">
                    <th className="py-3 pr-3">{t("playerAnalytics.action")}</th>
                    <th className="px-3 py-3 text-right">
                      {t("playerAnalytics.people")}
                    </th>
                    <th className="py-3 pl-3 text-right">
                      {t("playerAnalytics.events")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {PLAYER_ANALYTICS_ACTIONS.map((action) => (
                    <tr
                      key={action}
                      className="border-b border-slate-100 last:border-0"
                    >
                      <th
                        scope="row"
                        className="py-3 pr-3 text-left font-medium text-slate-700"
                      >
                        {t(`playerAnalytics.actions.${action}`)}
                      </th>
                      <td className="px-3 py-3 text-right tabular-nums">
                        {n(funnel.metrics[action].users)}
                      </td>
                      <td className="py-3 pl-3 text-right tabular-nums">
                        {n(funnel.metrics[action].events)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
      <details className="border-t border-slate-200 pt-4 text-sm text-slate-600">
        <summary className="cursor-pointer font-semibold">
          {t("playerAnalytics.definitions")}
        </summary>
        <p className="mt-3 leading-6">{t("playerAnalytics.definitionNote")}</p>
        <p className="mt-2 leading-6">{t("playerAnalytics.exclusionNote")}</p>
      </details>
    </section>
  );
}
