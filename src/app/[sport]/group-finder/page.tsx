import Link from "next/link";
import { notFound } from "next/navigation";
import { GroupFinder } from "@/components/group-finder";
import { HeaderSubLabel } from "@/components/header-sub-label";
import { getSportMeta } from "@/data/sportMeta";
import {
  buildLocalizedPath,
  getTranslator,
  normalizeLocale,
} from "@/lib/i18n";
import { fetchGroupsBySport } from "@/server/groupFinder";

type Params = { sport: string };
type ParamsInput = Params | Promise<Params>;
type SearchParams = { lang?: string };
type SearchParamsInput =
  | SearchParams
  | Promise<SearchParams>
  | undefined;

async function resolveParams(params: ParamsInput): Promise<Params> {
  if (typeof (params as Promise<Params>).then === "function") {
    return params as Promise<Params>;
  }
  return params as Params;
}

async function resolveSearchParams(
  searchParams?: SearchParamsInput,
): Promise<SearchParams | undefined> {
  if (!searchParams) return undefined;
  if (typeof (searchParams as Promise<SearchParams>).then === "function") {
    return searchParams as Promise<SearchParams>;
  }
  return searchParams;
}

export default async function GroupFinderPage({
  params,
  searchParams,
}: {
  params: ParamsInput;
  searchParams?: SearchParamsInput;
}) {
  const resolvedParams = await resolveParams(params);
  const resolvedSearch = await resolveSearchParams(searchParams);
  const locale = normalizeLocale(resolvedSearch?.lang);
  const t = await getTranslator(locale);
  const meta = getSportMeta(resolvedParams.sport);
  if (!meta) {
    notFound();
  }

  const groupData = await fetchGroupsBySport(resolvedParams.sport, {
    limit: 12,
  });
  if (!groupData.sport) {
    notFound();
  }

  const dayKeys = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ] as const;
  const dayLabels = dayKeys.reduce<Record<string, string>>(
    (acc, day) => {
      acc[day] = t(`groups.days.${day}`);
      return acc;
    },
    {},
  );

  const copy = {
    title: t("groupFinder.title", { sport: meta.name[locale] }),
    subtitle: t("groupFinder.subtitle"),
    searchPlaceholder: t("groupFinder.searchPlaceholder"),
    visibilityLabel: t("groupFinder.visibilityLabel"),
    filterAll: t("groupFinder.filterAll"),
    filterPublic: t("groupFinder.filterPublic"),
    filterPrivate: t("groupFinder.filterPrivate"),
    reset: t("groupFinder.reset"),
    emptyTitle: t("groupFinder.emptyTitle"),
    emptyDescription: t("groupFinder.emptyDescription"),
    backLink: t("groupFinder.backLink"),
    sessionsLabel: t("groupFinder.sessionsLabel"),
    scheduleAnytime: t("groupFinder.scheduleAnytime"),
    privacyPublic: t("groupFinder.privacyPublic"),
    privacyPrivate: t("groupFinder.privacyPrivate"),
    lastUpdated: t("groupFinder.lastUpdated"),
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <HeaderSubLabel value={meta.name[locale]} />
      <main className="mx-auto flex max-w-5xl flex-col gap-8 px-6 pb-20 pt-10 md:px-10">
        <section className="rounded-[32px] border border-slate-200 bg-white/90 p-8 shadow-2xl shadow-slate-200/70 backdrop-blur">
          <h1 className="mt-3 text-3xl font-semibold text-slate-900">
            {copy.title}
          </h1>
          <p className="mt-2 text-sm text-slate-600">{copy.subtitle}</p>
          <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-500">
            <Link
              href={buildLocalizedPath(`/${resolvedParams.sport}`, locale)}
              className="rounded-full border border-slate-300 px-4 py-2 font-semibold text-slate-700 hover:border-slate-500"
            >
              {t("groupFinder.backToSport")}
            </Link>
            <Link
              href={buildLocalizedPath("/", locale)}
              className="rounded-full border border-slate-300 px-4 py-2 font-semibold text-slate-700 hover:border-slate-500"
            >
              {copy.backLink}
            </Link>
          </div>
        </section>
        <GroupFinder
          sportCode={resolvedParams.sport}
          locale={locale}
          accent={meta.accent}
          fallbackImage={meta.coverImage}
          copy={copy}
          dayLabels={dayLabels}
          initialGroups={groupData.groups}
          total={groupData.count}
        />
      </main>
    </div>
  );
}
