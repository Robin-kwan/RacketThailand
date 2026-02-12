import Image from "next/image";
import Link from "next/link";
import { LANDING_SPORTS } from "@/data/sportMeta";
import { FeedbackForm } from "@/components/feedback-form";
import { BaseCard } from "@/components/base-card";
import {
  buildLocalizedPath,
  getTranslator,
  normalizeLocale,
} from "@/lib/i18n";
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
      <main className="relative mx-auto mt-10 flex w-full max-w-screen-xl flex-col items-center gap-6 px-6 pb-6 text-center text-[var(--foreground)] md:px-10">
        <header className="space-y-6">
          <div className="flex flex-col items-center gap-4">
            <h1 className="text-xl font-semibold leading-tight text-[var(--foreground)] md:text-3xl">
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
                className="group overflow-hidden rounded-[40px] bg-white/5 transition hover:-translate-y-1"
              >
                <article className="relative h-48 w-full overflow-hidden rounded-[40px] md:h-60">
                  <Image
                    src={sport.coverImage}
                    alt={`${sport.name[locale]} cover`}
                    fill
                    sizes="(max-width: 768px) calc(100vw - 3rem), (max-width: 980px) calc((100vw - 5rem - 1.5rem) / 2), 438px"
                    quality={60}
                    className="object-cover"
                    priority={sport.code === "badminton"}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
                  <div className="pointer-events-none absolute inset-0 flex items-end justify-center p-6 pb-8">
                    <span className="rounded-full border border-white/30 bg-white/15 px-8 py-3 text-lg font-semibold uppercase text-white backdrop-blur">
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
