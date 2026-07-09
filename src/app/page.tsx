import Image from "next/image";
import type { Metadata } from "next";
import { LANDING_SPORTS } from "@/data/sportMeta";
import { FeedbackForm } from "@/components/feedback-form";
import { BaseCard } from "@/components/base-card";
import { TrackedLink } from "@/components/analytics/tracked-link";
import {
  FeaturePerspectives,
  type FeaturePerspectivesCopy,
} from "@/components/landing/feature-perspectives";
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
  const perspectivesCopy: FeaturePerspectivesCopy = {
    title: t("landing.perspectivesTitle"),
    subtitle: t("landing.perspectivesSubtitle"),
    courtOwner: {
      title: t("landing.courtOwnerTitle"),
      description: t("landing.courtOwnerDescription"),
      steps: [
        t("landing.courtOwnerStep1"),
        t("landing.courtOwnerStep2"),
        t("landing.courtOwnerStep3"),
      ],
    },
    groupOwner: {
      title: t("landing.groupOwnerTitle"),
      description: t("landing.groupOwnerDescription"),
      steps: [
        t("landing.groupOwnerStep1"),
        t("landing.groupOwnerStep2"),
        t("landing.groupOwnerStep3"),
      ],
    },
    regularUser: {
      title: t("landing.regularUserTitle"),
      description: t("landing.regularUserDescription"),
      steps: [
        t("landing.regularUserStep1"),
        t("landing.regularUserStep2"),
        t("landing.regularUserStep3"),
      ],
    },
  };
  const isAuthenticated = Boolean(user);
  const seo = LANDING_SEO[locale];
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
      <main className="mx-auto mt-6 flex w-full max-w-screen-xl flex-col items-center gap-12 px-6 pb-10 text-center text-[var(--foreground)] md:px-10">
        <header className="relative w-full max-w-4xl overflow-hidden rounded-[38px] border border-[rgb(var(--foreground-rgb)/0.12)] bg-white px-7 py-10 shadow-[0_14px_48px_rgb(var(--foreground-rgb)/0.08)] md:px-12">
          <div className="relative flex flex-col items-center gap-5">
            <h1 className="text-xl font-semibold leading-tight tracking-tight text-[var(--foreground)]">
              {t("landing.heroTitle")}
            </h1>
            <p className="max-w-3xl text-sm text-[rgb(var(--foreground-rgb)/0.75)] md:text-lg">
              {t("landing.heroDescription")}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <TrackedLink
                href={buildLocalizedPath("/courts/new", locale)}
                eventName="landing_cta_click"
                eventPayload={{
                  surface: "landing_hero",
                  cta: "add_court",
                }}
                className="rt-btn-court inline-flex items-center justify-center px-6 py-3 text-sm"
              >
                {t("courtSubmission.submit")}
              </TrackedLink>
              <TrackedLink
                href={buildLocalizedPath("/groups/create", locale)}
                eventName="landing_cta_click"
                eventPayload={{
                  surface: "landing_hero",
                  cta: "create_group",
                }}
                className="rt-btn-group inline-flex items-center justify-center px-6 py-3 text-sm"
              >
                {t("header.createGroup")}
              </TrackedLink>
            </div>
          </div>
        </header>

        <section className="w-full max-w-[1100px]">
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
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
                className="group overflow-hidden rounded-[26px] border border-[rgb(var(--foreground-rgb)/0.12)] bg-white transition-[transform,border-color,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:border-[rgb(var(--rt-primary-border-rgb))] hover:shadow-[0_18px_50px_rgb(var(--foreground-rgb)/0.14)] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              >
                <article className="relative h-52 w-full overflow-hidden md:h-64">
                  <Image
                    src={sport.coverImage}
                    alt={`${sport.name[locale]} cover`}
                    fill
                    sizes="(max-width: 768px) calc(100vw - 3rem), (max-width: 1200px) calc((100vw - 5rem - 3rem) / 2), 340px"
                    quality={60}
                    className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.035] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                    priority={sport.code === "badminton"}
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent" />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 p-5 text-left text-white">
                    <p className="text-xl font-semibold tracking-tight">
                      {sport.name[locale]}
                    </p>
                    <p className="mt-1 text-xs uppercase text-white/75">
                      {t("landing.cardCta")}
                    </p>
                  </div>
                </article>
              </TrackedLink>
            ))}
          </div>
        </section>

        <FeaturePerspectives copy={perspectivesCopy} />

        {isAuthenticated && (
          <div className="w-full max-w-[1000px]">
            <BaseCard
              as="section"
              className="mt-2 w-full rounded-[40px] border border-[rgb(var(--rt-primary-rgb)/0.34)] bg-white/95 p-8 text-left shadow-[0_16px_60px_rgb(var(--rt-primary-rgb)/0.12)]"
            >
              <FeedbackForm copy={feedbackCopy} />
            </BaseCard>
          </div>
        )}
      </main>
    </div>
  );
}

