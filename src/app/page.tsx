import Image from "next/image";
import type { Metadata } from "next";
import { CalendarDays, MapPinned, UsersRound } from "lucide-react";
import { LANDING_SPORTS } from "@/data/sportMeta";
import { FeedbackForm } from "@/components/feedback-form";
import { TrackedLink } from "@/components/analytics/tracked-link";
import { LandingHeroFinder } from "@/components/landing/landing-hero-finder";
import {
  buildLocalizedPath,
  getTranslator,
  normalizeLocale,
} from "@/lib/i18n";
import {
  buildAbsoluteUrl,
  buildCanonicalUrl,
  buildLocaleAlternates,
} from "@/lib/seo";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type SearchParams = {
  lang?: string;
};

type SearchParamInput = Promise<SearchParams> | undefined;

const LANDING_SEO = {
  th: {
    title:
      "RacketThailand | ค้นหาสนามและกลุ่มแบดมินตัน เทนนิส พาเดล พิคเคิลบอล ปิงปอง",
    description:
      "แพลตฟอร์มสำหรับค้นหาสนาม กลุ่มผู้เล่น กิจกรรม และชุมชนกีฬาแร็กเกตในประเทศไทย ครอบคลุมแบดมินตัน เทนนิส พาเดล พิคเคิลบอล และปิงปอง",
    keywords: [
      "สนามแบดมินตัน",
      "สนามเทนนิส",
      "สนามพาเดล",
      "สนามพิคเคิลบอล",
      "สนามปิงปอง",
      "กลุ่มแบดมินตัน",
      "กลุ่มเทนนิส",
      "หาเพื่อนตีแบด",
      "หาเพื่อนตีเทนนิส",
      "คอมมูนิตี้กีฬา",
      "กีฬาแร็กเกต",
      "court finder Thailand",
      "group finder Thailand",
      "racket sports community Thailand",
    ],
  },
  en: {
    title:
      "RacketThailand | Badminton, Tennis, Padel, Pickleball & Table Tennis in Thailand",
    description:
      "A platform for finding racket sport courts, player groups, activities, and communities across Thailand, covering badminton, tennis, padel, pickleball, and table tennis.",
    keywords: [
      "badminton court Thailand",
      "tennis court Thailand",
      "padel Thailand",
      "pickleball Thailand",
      "table tennis Thailand",
      "court finder Thailand",
      "group finder Thailand",
      "sport community Thailand",
      "racket sports community Thailand",
      "badminton group Bangkok",
      "tennis group Bangkok",
      "weekly racket sports Thailand",
    ],
  },
} as const;

async function resolveSearchParams(
  searchParams?: SearchParamInput,
): Promise<SearchParams | undefined> {
  if (!searchParams) return undefined;
  return searchParams;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams?: SearchParamInput;
}): Promise<Metadata> {
  const resolvedParams = await resolveSearchParams(searchParams);
  const locale = normalizeLocale(resolvedParams?.lang);
  const canonicalPath = "/";
  const canonical = buildCanonicalUrl(canonicalPath, locale);
  const alternates = buildLocaleAlternates(canonicalPath);
  const seo = LANDING_SEO[locale];
  const { title, description, keywords } = seo;
  const previewImage = buildAbsoluteUrl("/og/racketthailand-icon.png");

  return {
    title,
    description,
    keywords: [...keywords],
    alternates: {
      canonical,
      languages: alternates,
    },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "website",
      images: [
        {
          url: previewImage,
          width: 1024,
          height: 1024,
          alt: "RacketThailand logo",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [previewImage],
    },
  };
}

export default async function Landing({
  searchParams,
}: {
  searchParams?: SearchParamInput;
}) {
  const resolvedParams = await resolveSearchParams(searchParams);
  const locale = normalizeLocale(resolvedParams?.lang);
  const t = await getTranslator(locale);
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const feedbackCopy = {
    title: t("landing.feedbackTitle"),
    subtitle: t("landing.feedbackSubtitle"),
    subjectLabel: t("landing.feedbackSubjectLabel"),
    subjectPlaceholder: t("landing.feedbackSubjectPlaceholder"),
    messageLabel: t("landing.feedbackMessageLabel"),
    messagePlaceholder: t("landing.feedbackMessagePlaceholder"),
    submitLabel: t("landing.feedbackSubmit"),
    successMessage: t("landing.feedbackSuccess"),
    errorMessage: t("landing.feedbackError"),
  };
  const isAuthenticated = Boolean(user);
  const seo = LANDING_SEO[locale];
  const heroSports = LANDING_SPORTS.map((sport) => ({
    code: sport.code,
    name: sport.name[locale],
    color: sport.color,
  }));
  const discoveryItems = [
    {
      title: t("landing.discoveryGroupsTitle"),
      description: t("landing.discoveryGroupsDescription"),
      icon: UsersRound,
    },
    {
      title: t("landing.discoveryCourtsTitle"),
      description: t("landing.discoveryCourtsDescription"),
      icon: MapPinned,
    },
    {
      title: t("landing.discoveryCasualTitle"),
      description: t("landing.discoveryCasualDescription"),
      icon: CalendarDays,
    },
  ];
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "RacketThailand",
    url: buildCanonicalUrl("/", locale),
    inLanguage: locale,
    description: seo.description,
    keywords: seo.keywords.join(", "),
  };

  return (
    <div className="rt-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <main className="w-full overflow-hidden text-[var(--foreground)]">
        <section className="relative z-10 isolate min-h-[610px] border-b border-slate-200 bg-slate-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/racketthailand-tennis-hero-v1.png"
            alt="Tennis player on an outdoor court in Bangkok"
            className="absolute inset-0 h-full w-full object-cover object-[72%_center]"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.96)_0%,rgba(255,255,255,0.94)_44%,rgba(255,255,255,0.82)_65%,rgba(255,255,255,0.35)_82%,rgba(255,255,255,0)_100%)]" />
          <div className="relative mx-auto flex min-h-[610px] w-full max-w-screen-xl items-center px-6 py-16 md:px-10">
            <div className="w-full max-w-2xl">
              <p className="text-sm font-semibold text-[var(--rt-primary)]">
                {t("landing.heroKicker")}
              </p>
              <h1 className="mt-4 max-w-xl text-4xl font-semibold leading-[1.12] tracking-tight text-slate-950 md:text-5xl">
                {t("landing.heroTitle")}
              </h1>
              <div className="mt-8 max-w-2xl">
                <LandingHeroFinder
                  locale={locale}
                  sports={heroSports}
                  sportLabel={t("landing.heroSportLabel")}
                  groupLabel={t("landing.heroGroupCta")}
                  courtLabel={t("landing.heroCourtCta")}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white py-14 md:py-18">
          <div className="mx-auto w-full max-w-screen-xl px-6 md:px-10">
            <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                  {t("landing.sportsTitle")}
                </h2>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {LANDING_SPORTS.map((sport) => (
              <TrackedLink
                key={sport.code}
                href={buildLocalizedPath(`/${sport.code}`, locale)}
                eventName="landing_cta_click"
                eventPayload={{
                  surface: "landing_sports_grid",
                  cta: `open_${sport.code}`,
                  sport: sport.code,
                }}
                className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_16px_34px_rgb(15_23_42/0.12)] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              >
                <article className="relative aspect-[4/3] w-full overflow-hidden">
                  <Image
                    src={sport.coverImage}
                    alt={`${sport.name[locale]} cover`}
                    fill
                    sizes="(max-width: 640px) calc(100vw - 3rem), (max-width: 1024px) calc((100vw - 6.5rem) / 2), calc((100vw - 8rem) / 5)"
                    quality={70}
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                    priority={sport.code === "badminton"}
                  />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-black/45 px-4 py-3 text-left text-white">
                    <p className="text-lg font-semibold tracking-tight">
                      {sport.name[locale]}
                    </p>
                  </div>
                </article>
              </TrackedLink>
            ))}
            </div>
          </div>
        </section>

        <section className="border-y border-slate-200 bg-[#f7fbf9] py-14 md:py-18">
          <div className="mx-auto w-full max-w-screen-xl px-6 md:px-10">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
              {t("landing.discoveryTitle")}
            </h2>
            <div className="mt-8 grid gap-8 md:grid-cols-3 md:gap-12">
              {discoveryItems.map(({ title, description, icon: Icon }) => (
                <article key={title} className="border-l-2 border-[var(--rt-primary)] pl-5">
                  <Icon
                    className="h-5 w-5 text-[var(--rt-primary)]"
                    strokeWidth={1.9}
                    aria-hidden
                  />
                  <h3 className="mt-4 text-lg font-semibold text-slate-950">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-slate-200 bg-white py-14 md:py-18">
          <div className="mx-auto grid w-full max-w-screen-xl gap-8 px-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-end md:px-10">
            <div className="max-w-2xl border-l-2 border-[var(--rt-primary)] pl-5">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                {t("landing.contributeTitle")}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600 md:text-base">
                {t("landing.contributeDescription")}
              </p>
            </div>
            <div className="flex flex-wrap gap-3 md:justify-end">
              <TrackedLink
                href={buildLocalizedPath("/courts/new", locale)}
                eventName="landing_cta_click"
                eventPayload={{
                  surface: "landing_contribute",
                  cta: "add_court",
                }}
                className="rt-btn-court inline-flex items-center justify-center px-5 py-3 text-sm"
              >
                {t("courtSubmission.submit")}
              </TrackedLink>
              <TrackedLink
                href={buildLocalizedPath("/groups/create", locale)}
                eventName="landing_cta_click"
                eventPayload={{
                  surface: "landing_contribute",
                  cta: "create_group",
                }}
                className="rt-btn-group inline-flex items-center justify-center px-5 py-3 text-sm"
              >
                {t("header.createGroup")}
              </TrackedLink>
            </div>
          </div>
        </section>

        {isAuthenticated && (
          <section className="border-b border-slate-200 bg-[#f7fbf9] py-14 md:py-18">
            <div className="mx-auto w-full max-w-screen-xl px-6 md:px-10">
              <div className="max-w-3xl">
                <FeedbackForm copy={feedbackCopy} />
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

