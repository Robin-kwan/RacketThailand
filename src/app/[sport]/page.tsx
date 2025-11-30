import Link from "next/link";
import type { Metadata } from "next";
import { buildSportPagePayload } from "@/server/sportContent";
import { SUPPORTED_SPORTS, getSportMeta } from "@/data/sportMeta";
import type { SportFeatureGroup } from "@/types/sports";
import {
  buildLocalizedPath,
  getDictionary,
  normalizeLocale,
} from "@/i18n/dictionaries";

type Params = {
  sport: string;
};

type SearchParams = {
  lang?: string;
};

type ParamsInput = Params | Promise<Params>;
type SearchParamInput = SearchParams | Promise<SearchParams> | undefined;

export function generateStaticParams() {
  return SUPPORTED_SPORTS.map((sport) => ({ sport }));
}

async function resolveSearchParams(
  searchParams?: SearchParamInput,
): Promise<SearchParams | undefined> {
  if (!searchParams) return undefined;
  if (typeof (searchParams as Promise<SearchParams>).then === "function") {
    return searchParams as Promise<SearchParams>;
  }
  return searchParams;
}

async function resolveParams(params: ParamsInput): Promise<Params> {
  if (typeof (params as Promise<Params>).then === "function") {
    return params as Promise<Params>;
  }
  return params as Params;
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
    title: `${locale === "th" ? meta.nameTh : meta.name} | RacketThailand`,
    description:
      locale === "th" ? meta.heroDescriptionTh : meta.heroDescriptionEn,
  };
}

function featureAnchor(feature: SportFeatureGroup) {
  return feature.labelEn.toLowerCase().replace(/[^a-z0-9]+/g, "-");
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
  const dictionary = getDictionary(locale);
  const sport = await buildSportPagePayload(resolvedParamsValue.sport);
  const isThai = locale === "th";

  if (!sport) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
        <div className="max-w-md space-y-4 text-center">
          <p className="text-xs uppercase tracking-[0.4em] text-white/60">
            racketthailand.com/{resolvedParamsValue.sport}
          </p>
          <h1 className="text-3xl font-semibold">
            {dictionary.sport.emptyTitle}
          </h1>
          <p className="text-sm text-white/70">
            {dictionary.sport.emptyDescription}
          </p>
          <div className="flex justify-center">
            <Link
              href={buildLocalizedPath("/", locale)}
              className="rounded-full border border-white/40 px-6 py-3 text-sm font-semibold uppercase tracking-[0.25em] text-white hover:border-white"
            >
              {dictionary.sport.emptyCta}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <section
        className={`bg-gradient-to-br ${sport.gradient} from-30% via-70% to-100% px-6 py-20 md:px-12`}
      >
        <div className="mx-auto flex max-w-5xl flex-col gap-8">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm uppercase tracking-[0.35em] text-white/80">
                racketthailand.com/{sport.code}
              </p>
              <div className="flex gap-2">
                <Link
                  href={
                    locale === "th"
                      ? buildLocalizedPath("/", "en")
                      : buildLocalizedPath("/", "th")
                  }
                  className="rounded-full border border-white/40 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white hover:border-white"
                >
                  {locale === "th" ? "EN" : "ไทย"}
                </Link>
              </div>
            </div>
            <h1 className="text-4xl font-semibold leading-tight md:text-5xl">
              {isThai ? sport.hero.headlineTh : sport.hero.headlineEn}
            </h1>
            <p className="text-lg text-white/85 md:text-xl">
              {isThai ? sport.hero.descriptionTh : sport.hero.descriptionEn}
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
                  {dictionary.sport.stats[stat.key]}
                </p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-4">
            <Link
              href={buildLocalizedPath("/", locale)}
              className="rounded-full border border-white/70 px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white hover:border-white"
            >
              {dictionary.sport.emptyCta}
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-16 md:px-10">
        {sport.features.map((feature) => (
          <div
            key={feature.labelEn}
            id={featureAnchor(feature)}
            className="space-y-6 rounded-3xl border border-white/10 bg-slate-900/60 p-6 shadow-2xl shadow-slate-950/40 md:p-10"
          >
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-white/60">
                  {feature.table}
                </p>
                <div className="flex items-baseline gap-3">
                  <h2 className="text-2xl font-semibold md:text-3xl">
                    {isThai ? feature.labelTh : feature.labelEn}
                  </h2>
                </div>
                <p className="mt-2 text-white/80">
                  {isThai ? feature.descriptionTh : feature.descriptionEn}
                </p>
              </div>
              <Link
                href={buildLocalizedPath("/", locale)}
                className="text-sm font-semibold uppercase tracking-[0.25em] text-white/60 hover:text-white"
              >
                {dictionary.sport.emptyCta}
              </Link>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              {feature.cards.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/20 bg-slate-950/30 p-6 text-sm text-white/60 md:col-span-2">
                  {dictionary.sport.featureEmpty}
                </div>
              ) : (
                feature.cards.map((card) => (
                  <article
                    key={card.title}
                    className="rounded-2xl border border-white/10 bg-slate-950/50 p-5"
                  >
                    <div className="space-y-1">
                      <h3 className="text-xl font-semibold">{card.title}</h3>
                      <p className="text-xs uppercase tracking-[0.35em] text-white/60">
                        {card.subtitle}
                      </p>
                    </div>
                    <ul className="mt-4 space-y-3 text-sm text-white/85">
                      {card.details.map((detail) => (
                        <li key={detail} className="flex gap-3">
                          <span
                            className="mt-2 h-1.5 w-1.5 rounded-full"
                            style={{ backgroundColor: sport.accent }}
                          />
                          <p className="leading-relaxed">{detail}</p>
                        </li>
                      ))}
                    </ul>
                  </article>
                ))
              )}
            </div>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-20 text-center text-white/85 md:px-10">
        <div className="rounded-3xl border border-white/10 bg-slate-900/80 px-6 py-12 shadow-2xl shadow-slate-950/40">
          <h2 className="text-3xl font-semibold text-white">
            {isThai ? sport.closing.titleTh : sport.closing.titleEn}
          </h2>
          <p className="mt-4 text-lg">
            {isThai ? sport.closing.detailTh : sport.closing.detailEn}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            {sport.closing.actions.map((action) => (
              <Link
                key={action.href + action.labelEn}
                href={
                  action.href.startsWith("/")
                    ? buildLocalizedPath(action.href, locale)
                    : action.href
                }
                className="rounded-full border border-white/40 px-6 py-3 text-sm font-semibold uppercase tracking-[0.25em] text-white hover:border-white"
              >
                {isThai ? action.labelTh : action.labelEn}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
