import Link from "next/link";
import type { Metadata } from "next";
import { buildSportPagePayload } from "@/server/sportContent";
import { SUPPORTED_SPORTS, getSportMeta } from "@/data/sportMeta";
import { HeaderSubLabel } from "@/components/header-sub-label";
import { HeaderSportScope } from "@/components/header-sport-scope";
import {
  buildLocalizedPath,
  getTranslator,
  normalizeLocale,
} from "@/lib/i18n";

type Params = {
  sport: string;
};

type SearchParams = {
  lang?: string;
};

type ParamsInput = Promise<Params>;
type SearchParamInput = Promise<SearchParams> | undefined;

export function generateStaticParams() {
  return SUPPORTED_SPORTS.map((sport) => ({ sport }));
}

async function resolveSearchParams(
  searchParams?: SearchParamInput,
): Promise<SearchParams | undefined> {
  if (!searchParams) return undefined;
  return searchParams;
}

async function resolveParams(params: ParamsInput): Promise<Params> {
  return params;
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: ParamsInput;
  searchParams?: SearchParamInput;
}): Promise<Metadata> {
  const resolvedParams = await resolveSearchParams(searchParams);
  const locale = normalizeLocale(resolvedParams?.lang);
  const resolvedParamsValue = await resolveParams(params);
  const meta = getSportMeta(resolvedParamsValue.sport);
  if (!meta) {
    return {
      title: "Sport not found | RacketThailand",
    };
  }
  return {
    title: `${meta.name[locale]} | RacketThailand`,
    description: meta.heroDescription[locale],
  };
}

export default async function SportPage({
  params,
  searchParams,
}: {
  params: ParamsInput;
  searchParams?: SearchParamInput;
}) {
  const resolvedParams = await resolveSearchParams(searchParams);
  const locale = normalizeLocale(resolvedParams?.lang);
  const resolvedParamsValue = await resolveParams(params);
  const t = await getTranslator(locale);
  const sport = await buildSportPagePayload(resolvedParamsValue.sport);

  if (!sport) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6 text-slate-900">
        <div className="max-w-md space-y-4 text-center">
          <h1 className="text-3xl font-semibold">
            {t("sport.emptyTitle")}
          </h1>
          <p className="text-sm text-slate-600">
            {t("sport.emptyDescription")}
          </p>
          <div className="flex justify-center">
            <Link
              href={buildLocalizedPath("/", locale)}
              className="rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold uppercase tracking-[0.25em] text-slate-800 hover:border-slate-500"
            >
              {t("sport.emptyCta")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <HeaderSportScope sportSlug={sport.code} />
      <HeaderSubLabel value={sport.name[locale]} />
      <section
        className={`bg-gradient-to-br ${sport.gradient} from-30% via-70% to-100% px-6 py-20 md:px-12`}
      >
        <div className="mx-auto flex max-w-5xl flex-col gap-8 text-white">
            <div className="space-y-4">
              <h1 className="text-4xl font-semibold leading-tight md:text-5xl">
                {sport.hero.headline[locale]}
              </h1>
            <p className="text-lg text-white/85 md:text-xl">
              {sport.hero.description[locale]}
            </p>
          </div>
          <div className="flex flex-wrap gap-6 text-white/80">
            {sport.hero.stats.map((stat) => (
              <div
                key={stat.key}
                className="min-w-[140px] rounded-2xl bg-white/10 px-5 py-4 backdrop-blur"
              >
                <p className="text-3xl font-semibold text-white">
                  {stat.value}
                </p>
                <p className="text-xs uppercase tracking-[0.3em]">
                  {t(`sport.stats.${stat.key}`)}
                </p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-4">
            <Link
              href={buildLocalizedPath(`/${sport.code}/court-finder`, locale)}
              className="rounded-full bg-white px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate-900 shadow-lg shadow-slate-900/20"
            >
              {t("courtFinder.cta")}
            </Link>
            <Link
              href={buildLocalizedPath(`/${sport.code}/group-finder`, locale)}
              className="rounded-full border border-white/70 px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white hover:border-white"
            >
              {t("sport.groupFinderCta")}
            </Link>
          </div>
        </div>
      </section>
      <section className="bg-white px-6 py-12 text-slate-900 md:px-12">
        <div className="mx-auto flex max-w-5xl flex-col gap-8">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">
              {t("sport.useNowTitle")}
            </p>
            <p className="text-sm text-slate-600">
              {t("sport.useNowDescription")}
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {[
              {
                title: t("sport.useNowCourtsTitle", {
                  sport: sport.name[locale],
                }),
                body: t("sport.useNowCourtsBody"),
                href: buildLocalizedPath(`/${sport.code}/court-finder`, locale),
                cta: t("courtFinder.cta"),
              },
              {
                title: t("sport.useNowGroupsTitle", {
                  sport: sport.name[locale],
                }),
                body: t("sport.useNowGroupsBody"),
                href: buildLocalizedPath(`/${sport.code}/group-finder`, locale),
                cta: t("sport.groupFinderCta"),
              },
            ].map((feature) => (
              <article
                key={feature.title}
                className="rounded-3xl border border-slate-200 bg-slate-50/80 p-6 shadow-sm shadow-slate-200"
              >
                <h2 className="text-xl font-semibold text-slate-900">
                  {feature.title}
                </h2>
                <p className="mt-2 text-sm text-slate-600">{feature.body}</p>
                <Link
                  href={feature.href}
                  className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-900 underline-offset-4 hover:underline"
                >
                  {feature.cta}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    className="h-4 w-4"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
