import Image from "next/image";
import Link from "next/link";
import { LANDING_SPORTS } from "@/data/sportMeta";
import { FeedbackForm } from "@/components/feedback-form";
import {
  buildLocalizedPath,
  getTranslator,
  normalizeLocale,
} from "@/lib/i18n";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type SearchParams = {
  lang?: string;
};

const gradientOverlay = "bg-[#020617]";

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
    <div className="min-h-screen bg-[#020617] text-slate-100">
      <div className={`relative overflow-hidden ${gradientOverlay}`}>

        <main className="relative mx-auto mt-10 flex w-full max-w-screen-xl flex-col items-center gap-12 px-6 pb-20 text-center md:px-10">
          <header className="space-y-6 text-slate-100">
            <div className="flex flex-col items-center gap-4">
              <h1 className="text-4xl font-semibold leading-tight text-white md:text-5xl">
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
                >
                  <article className="overflow-hidden rounded-[40px] border border-slate-800 bg-slate-900/40 shadow-xl shadow-black/50 transition hover:-translate-y-1 hover:border-slate-600">
                    <div className="relative h-48 w-full overflow-hidden rounded-[40px] md:h-60">
                      <Image
                        src={sport.coverImage}
                        alt={`${sport.name[locale]} cover`}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 50vw"
                        className="object-cover"
                        priority={sport.code === "badminton"}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
                      <div className="pointer-events-none absolute inset-0 flex items-end justify-center p-6 pb-8">
                        <span className="rounded-full border border-white/30 bg-white/15 px-8 py-3 text-lg font-semibold uppercase text-white shadow-2xl shadow-black/40 backdrop-blur">
                          {sport.name[locale]}
                        </span>
                      </div>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          </section>

          {isAuthenticated && (
            <>
              <div
                aria-hidden
                className="h-px w-full bg-gradient-to-r from-transparent via-slate-800 to-transparent"
              />
              <section className="w-full rounded-[40px] border border-slate-800 bg-slate-900/80 p-8 shadow-2xl shadow-black/50 backdrop-blur">
                <FeedbackForm copy={feedbackCopy} />
              </section>
            </>
          )}
        </main>
      </div>

      <footer className="mx-auto w-full max-w-screen-xl px-6 py-10 text-sm text-slate-400 md:px-10">
        RacketThailand · Unified Supabase stack · © {new Date().getFullYear()}
      </footer>
    </div>
  );
}
