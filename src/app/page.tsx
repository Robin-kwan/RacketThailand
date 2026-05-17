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
import { buildCanonicalUrl, buildLocaleAlternates } from "@/lib/seo";
import { getThailandTodayDateString } from "@/lib/casual-play";
import { supabaseSelect } from "@/lib/supabaseRest";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type SearchParams = {
  lang?: string;
};

type SearchParamInput = Promise<SearchParams> | undefined;

type TrustMetric = {
  count: number;
  label: string;
};

async function fetchPlatformTrustSnapshot() {
  const today = getThailandTodayDateString();
  try {
    const [courtsRes, groupsRes, casualPlaysRes, postsRes] = await Promise.all([
      supabaseSelect<{ id: string }>("courts", {
        select: "id",
        is_active: "eq.true",
        limit: "1",
      }),
      supabaseSelect<{ id: string }>("groups", {
        select: "id",
        limit: "1",
      }),
      supabaseSelect<{ id: string }>("casual_plays", {
        select: "id",
        play_date: `gte.${today}`,
        limit: "1",
      }),
      supabaseSelect<{ id: string }>("community_posts", {
        select: "id",
        status: "eq.published",
        limit: "1",
      }),
    ]);

    return {
      courts: courtsRes.count ?? 0,
      groups: groupsRes.count ?? 0,
      casualPlays: casualPlaysRes.count ?? 0,
      boardPosts: postsRes.count ?? 0,
    };
  } catch (error) {
    console.error("Failed to load landing trust snapshot", error);
    return {
      courts: 0,
      groups: 0,
      casualPlays: 0,
      boardPosts: 0,
    };
  }
}

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
  const title =
    locale === "th"
      ? "RacketThailand | สนามและกลุ่มกีฬาแร็กเกตทั่วไทย"
      : "RacketThailand | Racket Sports Community in Thailand";
  const description =
    locale === "th"
      ? "ค้นหาสนามและกลุ่มกีฬาแร็กเกตทั่วไทย พร้อมข้อมูลติดต่อและตารางเล่นได้ในที่เดียว"
      : "Discover Thailand racket-sport courts and weekly groups with direct contacts in one place.";

  return {
    title,
    description,
    alternates: {
      canonical,
      languages: alternates,
    },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
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
  const trustSnapshot = await fetchPlatformTrustSnapshot();
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
  const trustMetrics: TrustMetric[] = [
    {
      count: trustSnapshot.courts,
      label: locale === "th" ? "สนามที่เปิดอยู่" : "Live courts",
    },
    {
      count: trustSnapshot.groups,
      label: locale === "th" ? "กลุ่มที่เปิดรับสมาชิก" : "Active groups",
    },
    {
      count: trustSnapshot.casualPlays,
      label: locale === "th" ? "นัดหาเพื่อนตี" : "Casual plays",
    },
    {
      count: trustSnapshot.boardPosts,
      label: locale === "th" ? "โพสต์คอมมูนิตี้" : "Community posts",
    },
  ];
  const trustHeadline =
    locale === "th"
      ? "ตัวเลขจริงจากรายการที่เผยแพร่อยู่ตอนนี้"
      : "Live proof from the public listings already online";
  const trustBody =
    locale === "th"
      ? "ทุกพอร์ทัลแสดงข้อมูลติดต่อ ตารางเล่น หรืออัปเดตล่าสุดเพื่อช่วยให้ผู้เล่นตัดสินใจได้เร็วขึ้น"
      : "Each portal surfaces direct contacts, weekly schedules, and recent public updates so visitors can judge credibility faster.";
  const verificationBody =
    locale === "th"
      ? "สนามและกลุ่มที่แสดงจะเน้นรายละเอียดที่อัปเดตและคำขอยืนยันสนามเพื่อเพิ่มความน่าเชื่อถือก่อนติดต่อ"
      : "Listings emphasize fresh details and court-verification workflows so visitors know what to trust before they reach out.";
  return (
    <div className="rt-page">
      <main className="mx-auto mt-6 flex w-full max-w-screen-xl flex-col items-center gap-12 px-6 pb-10 text-center text-[var(--foreground)] md:px-10">
        <header className="relative w-full max-w-4xl overflow-hidden rounded-[38px] border border-emerald-100/85 bg-[linear-gradient(165deg,#ffffff_0%,#f6fcf9_68%,#eef8f4_100%)] px-7 py-10 shadow-[0_14px_48px_rgb(var(--foreground-rgb)/0.08)] md:px-12">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 -top-16 h-36 bg-[radial-gradient(circle,rgb(var(--rt-primary-rgb)/0.1)_0%,transparent_72%)]"
          />
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
                className="rounded-full bg-[var(--rt-primary)] px-6 py-3 text-sm font-semibold uppercase tracking-wide text-[var(--rt-primary-text)] transition hover:bg-[var(--rt-primary-soft)]"
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
                className="rounded-full border border-[rgb(var(--foreground-rgb)/0.18)] bg-white px-6 py-3 text-sm font-semibold uppercase tracking-wide text-[rgb(var(--foreground-rgb)/0.8)] transition hover:border-[rgb(var(--foreground-rgb)/0.38)]"
              >
                {t("header.createGroup")}
              </TrackedLink>
            </div>
            <div className="grid w-full gap-3 pt-2 sm:grid-cols-2 xl:grid-cols-4">
              {trustMetrics.map((metric) => (
                <div
                  key={metric.label}
                  className="rounded-2xl border border-[rgb(var(--rt-primary-rgb)/0.14)] bg-white/90 px-4 py-4 text-left shadow-[0_14px_36px_rgb(var(--foreground-rgb)/0.06)]"
                >
                  <p className="text-xl font-semibold text-[var(--rt-primary)]">
                    {metric.count.toLocaleString(locale === "th" ? "th-TH" : "en-US")}
                  </p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-[rgb(var(--foreground-rgb)/0.55)]">
                    {metric.label}
                  </p>
                </div>
              ))}
            </div>
            <div className="max-w-3xl rounded-3xl border border-[rgb(var(--rt-primary-rgb)/0.16)] bg-[rgb(var(--rt-primary-rgb)/0.06)] px-5 py-4 text-left">
              <p className="text-sm font-semibold text-[var(--foreground)]">
                {trustHeadline}
              </p>
              <p className="mt-1 text-sm text-[rgb(var(--foreground-rgb)/0.74)]">
                {trustBody}
              </p>
              <p className="mt-2 text-sm text-[rgb(var(--foreground-rgb)/0.68)]">
                {verificationBody}
              </p>
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
                className="group overflow-hidden rounded-[26px] border border-[rgb(var(--foreground-rgb)/0.12)] bg-white transition duration-300 hover:-translate-y-1 hover:border-[rgb(var(--rt-primary-border-rgb))] hover:shadow-[0_18px_50px_rgb(var(--foreground-rgb)/0.14)]"
              >
                <article className="relative h-52 w-full overflow-hidden md:h-64">
                  <Image
                    src={sport.coverImage}
                    alt={`${sport.name[locale]} cover`}
                    fill
                    sizes="(max-width: 768px) calc(100vw - 3rem), (max-width: 1200px) calc((100vw - 5rem - 3rem) / 2), 340px"
                    quality={60}
                    className="object-cover"
                    priority={sport.code === "badminton"}
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent" />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 p-5 text-left text-white">
                    <p className="text-xl font-semibold tracking-tight">
                      {sport.name[locale]}
                    </p>
                    <p className="mt-2 text-xs text-white/85">
                      {locale === "th"
                        ? "ข้อมูลติดต่อและรายการที่อัปเดตล่าสุด"
                        : "Direct contacts and fresh public listings"}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-[0.22em] text-white/75">
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

