import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { buildSportPagePayload } from "@/server/sportContent";
import { SUPPORTED_SPORTS, getSportMeta } from "@/data/sportMeta";
import { HeaderSubLabel } from "@/components/header-sub-label";
import { HeaderSportScope } from "@/components/header-sport-scope";
import {
  buildLocalizedPath,
  getTranslator,
  normalizeLocale,
  type Locale,
} from "@/lib/i18n";
import type { SportFeatureCard } from "@/types/sports";

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

type FeatureCarouselProps = {
  title: string;
  subtitle: string;
  cards: SportFeatureCard[];
  emptyCopy: string;
  ctaHref: string;
  ctaLabel: string;
  locale: Locale;
};

function FeatureCarousel({
  title,
  subtitle,
  cards,
  emptyCopy,
  ctaHref,
  ctaLabel,
  locale,
}: FeatureCarouselProps) {
  const hasCards = cards.length > 0;

  return (
    <section className="px-6 py-12 text-[var(--foreground)] md:px-12">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold">{title}</h2>
            <p className="mt-1 text-sm text-[rgb(var(--foreground-rgb)/0.7)]">
              {subtitle}
            </p>
          </div>
          <Link
            href={ctaHref}
            className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--rt-primary)] hover:text-[var(--rt-primary-border)]"
          >
            {ctaLabel}
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
        </div>
        {hasCards ? (
          <div className="-mx-6 mt-8 overflow-x-auto pb-4 md:mx-0">
            <div className="flex snap-x snap-mandatory gap-4 px-6 md:px-0">
              {cards.map((card, index) => {
                const href = card.href
                  ? buildLocalizedPath(card.href, locale)
                  : undefined;
                const content = (
                  <div className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white px-5 py-6 text-slate-900 transition hover:-translate-y-1">
                    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-slate-100">
                      <div className="relative h-36 w-full">
                        <Image
                          src={card.imageUrl ?? "/sports/badminton.svg"}
                          alt={card.title}
                          fill
                          sizes="(max-width:768px) 80vw, 30vw"
                          className="object-cover"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-2xl font-semibold text-slate-900">
                        {card.title}
                      </h3>
                      {card.subtitle && (
                        <p className="text-sm text-slate-600">
                          {card.subtitle}
                        </p>
                      )}
                    </div>
                    {card.details.length > 0 && (
                      <ul className="space-y-2 text-sm text-slate-600">
                        {card.details.map((detail, detailIndex) => (
                          <li key={`${card.title}-${detailIndex}`}>
                            {detail}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
                return href ? (
                  <Link
                    key={`${card.title}-${index}`}
                    href={href}
                    className="snap-start w-[320px] shrink-0 md:w-[360px]"
                  >
                    {content}
                  </Link>
                ) : (
                  <div
                    key={`${card.title}-${index}`}
                    className="snap-start w-[320px] shrink-0 md:w-[360px]"
                  >
                    {content}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <p className="mt-6 text-sm text-[rgb(var(--foreground-rgb)/0.5)]">
            {emptyCopy}
          </p>
        )}
      </div>
    </section>
  );
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
      title: "Page not found | RacketThailand",
      description:
        "This sport page does not exist. Head back to the landing page to pick a different sport.",
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
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-6 text-[var(--foreground)]">
        <div className="max-w-md space-y-4 text-center">
          <h1 className="text-3xl font-semibold">Page not found</h1>
          <div className="flex justify-center">
            <Link
              href={buildLocalizedPath("/", locale)}
              className="rounded-full border border-[rgb(var(--foreground-rgb)/0.3)] px-6 py-3 text-sm font-semibold uppercase text-[var(--foreground)] hover:border-[rgb(var(--foreground-rgb)/0.6)]"
            >
              Back to landing
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const courtFeature = sport.features.find((feature) => feature.key === "courts");
  const groupFeature = sport.features.find((feature) => feature.key === "groups");
  const carouselEmptyCopy = t("sport.carouselEmpty");
  const viewAllLabel = t("sport.viewAll");
  const boardCta = t("community.boardCta");

  return (
    <div className="min-h-screen text-[var(--foreground)]">
      <HeaderSportScope sportSlug={sport.code} />
      <HeaderSubLabel value={sport.name[locale]} />
      <section className="bg-gradient-to-br from-[rgb(var(--rt-primary-rgb)/0.7)] via-[rgb(var(--rt-primary-rgb)/0.5)] to-[rgb(var(--rt-primary-rgb)/0.25)] px-6 py-20 md:px-12">
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
                <p className="text-xs font-semibold uppercase">
                  {t(`sport.stats.${stat.key}`)}
                </p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-4">
            <Link
              href={buildLocalizedPath(`/${sport.code}/court-finder`, locale)}
              className="rounded-full bg-white px-6 py-3 text-sm font-semibold uppercase text-slate-900"
            >
              {t("courtFinder.cta")}
            </Link>
            <Link
              href={buildLocalizedPath(`/${sport.code}/group-finder`, locale)}
              className="rounded-full border border-white/70 px-6 py-3 text-sm font-semibold uppercase text-white hover:border-white"
            >
              {t("sport.groupFinderCta")}
            </Link>
            <Link
              href={buildLocalizedPath(`/${sport.code}/board`, locale)}
              className="rounded-full border border-white/30 px-6 py-3 text-sm font-semibold uppercase text-white/80 hover:text-white"
            >
              {boardCta}
            </Link>
          </div>
        </div>
      </section>
      {courtFeature && (
        <FeatureCarousel
          title={t("sport.latestCourtsTitle")}
          subtitle={t("sport.latestCourtsSubtitle", {
            sport: sport.name[locale],
          })}
          cards={courtFeature.cards}
          emptyCopy={carouselEmptyCopy}
          ctaHref={buildLocalizedPath(`/${sport.code}/court-finder`, locale)}
          ctaLabel={viewAllLabel}
          locale={locale}
        />
      )}
      {groupFeature && (
        <FeatureCarousel
          title={t("sport.latestGroupsTitle")}
          subtitle={t("sport.latestGroupsSubtitle", {
            sport: sport.name[locale],
          })}
          cards={groupFeature.cards}
          emptyCopy={carouselEmptyCopy}
          ctaHref={buildLocalizedPath(`/${sport.code}/group-finder`, locale)}
          ctaLabel={viewAllLabel}
          locale={locale}
        />
      )}
    </div>
  );
}
