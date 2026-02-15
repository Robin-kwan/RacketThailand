import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { LANDING_SPORTS } from "@/data/sportMeta";
import { FeedbackForm } from "@/components/feedback-form";
import { BaseCard } from "@/components/base-card";
import {
  buildLocalizedPath,
  getTranslator,
  normalizeLocale,
} from "@/lib/i18n";
import { buildCanonicalUrl, buildLocaleAlternates } from "@/lib/seo";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type SearchParams = {
  lang?: string;
};

type SearchParamInput = Promise<SearchParams> | undefined;

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
      ? "RacketThailand | สนามและก๊วนกีฬาแร็กเก็ตในไทย"
      : "RacketThailand | Racket Sports Community in Thailand";
  const description =
    locale === "th"
      ? "รวมสนามและก๊วนกีฬาแร็กเก็ตทั่วไทย ค้นหาคอร์ต กลุ่มตีประจำ และข้อมูลติดต่อได้ในที่เดียว"
      : "Find racket sport courts and weekly groups across Thailand with direct contact details in one place.";

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

  return (
    <div className="rt-page">
      <main className="relative mx-auto mt-12 flex w-full max-w-screen-xl flex-col items-center gap-8 px-6 pb-8 text-center text-[var(--foreground)] md:px-10">
        <header className="space-y-4">
          <div className="flex flex-col items-center gap-4">
            <h1 className="text-2xl font-semibold leading-tight tracking-tight text-[var(--foreground)] md:text-4xl">
              {t("landing.heroTitle")}
            </h1>
          </div>
        </header>

        <section className="w-full max-w-[900px]">
          <div className="grid gap-6 md:grid-cols-2">
            {LANDING_SPORTS.map((sport) => (
              <Link
                key={sport.code}
                href={buildLocalizedPath(`/${sport.code}`, locale)}
                className="group overflow-hidden rounded-[24px] border border-[rgb(var(--foreground-rgb)/0.12)] bg-white transition duration-200 hover:border-[rgb(var(--rt-primary-border-rgb))]"
              >
                <article className="relative h-48 w-full overflow-hidden rounded-[24px] md:h-60">
                  <Image
                    src={sport.coverImage}
                    alt={`${sport.name[locale]} cover`}
                    fill
                    sizes="(max-width: 768px) calc(100vw - 3rem), (max-width: 980px) calc((100vw - 5rem - 1.5rem) / 2), 438px"
                    quality={60}
                    className="object-cover"
                    priority={sport.code === "badminton"}
                  />
                  <div className="pointer-events-none absolute inset-0 flex items-end justify-center p-6 pb-8">
                    <span className="rounded-full border border-[rgb(var(--foreground-rgb)/0.14)] bg-white px-8 py-3 text-base font-semibold uppercase tracking-wide text-[var(--foreground)]">
                      {sport.name[locale]}
                    </span>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        </section>

        {isAuthenticated && (
          <div className="w-full max-w-[900px]">
            <BaseCard
              as="section"
              className="mt-4 w-full rounded-[40px] border border-[var(--rt-primary-border)] p-8 text-left"
            >
              <FeedbackForm copy={feedbackCopy} />
            </BaseCard>
          </div>
        )}
      </main>
    </div>
  );
}
