import Image from "next/image";
import Link from "next/link";
import { LANDING_SPORTS } from "@/data/sportMeta";
import {
  buildLocalizedPath,
  getTranslator,
  normalizeLocale,
} from "@/lib/i18n";

type SearchParams = {
  lang?: string;
};

const gradientOverlay =
  "bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.18),_rgba(255,255,255,0.95)_60%)]";

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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className={`relative overflow-hidden ${gradientOverlay}`}>
        <div className="absolute inset-0 opacity-40 blur-3xl" aria-hidden>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-gradient-to-b from-sky-500/20 to-transparent" />
        </div>

        <main className="relative mx-auto mt-10 flex max-w-4xl flex-col items-center gap-12 px-6 pb-20 text-center md:px-10">
          <header className="space-y-6">
            <div className="flex flex-col items-center gap-4">
              <p className="text-sm uppercase tracking-[0.4em] text-slate-500">
                RacketThailand.com
              </p>
              <h1 className="text-4xl font-semibold leading-tight md:text-5xl">
                {t("landing.heroTitle")}
              </h1>
              <p className="text-lg text-slate-600 md:text-xl">
                {t("landing.heroDescription")}
              </p>
            </div>
          </header>

          <section className="w-full space-y-6">
            <div className="space-y-2">
              <p className="text-sm uppercase tracking-[0.3em] text-slate-500">
                {t("landing.sportSectionTitle")}
              </p>
              <p className="text-slate-600">
                {t("landing.sportSectionDescription")}
              </p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              {LANDING_SPORTS.map((sport) => (
                <Link
                  key={sport.code}
                  href={buildLocalizedPath(`/${sport.code}`, locale)}
                >
                  <article className="flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg shadow-slate-200 transition hover:-translate-y-1 hover:border-slate-300">
                    <div className="relative h-48 w-full overflow-hidden">
                      <Image
                        src={sport.coverImage}
                        alt={`${sport.name[locale]} cover`}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-cover"
                        priority={sport.code === "badminton"}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                      <div className="absolute inset-x-0 bottom-5 flex flex-col gap-1 px-6 text-white">
                        <h3 className="text-2xl font-semibold">
                          {sport.name[locale]}
                        </h3>
                      </div>
                    </div>
                    <div className="flex flex-1 flex-col gap-4 px-6 py-6 text-left">
                      <p className="text-sm text-slate-600">
                        {sport.description[locale]}
                      </p>
                      <div className="flex flex-wrap gap-2 text-[11px] font-semibold uppercase text-slate-500">
                        {sport.highlights[locale].map((item) => (
                          <span
                            key={item}
                            className="rounded-full border border-slate-200 px-3 py-1 bg-white/60"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                      <div className="mt-auto pt-1 text-sm font-semibold text-slate-800">
                        <span className="inline-flex items-center gap-2">
                          {t("landing.cardCta")}
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
                        </span>
                      </div>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          </section>

          <p className="text-sm text-slate-600">
            {t("landing.contactPrompt")}
          </p>
        </main>
      </div>

      <footer className="mx-auto max-w-4xl px-6 py-10 text-sm text-white/45 md:px-10">
        RacketThailand · Unified Supabase stack · {new Date().getFullYear()}
      </footer>
    </div>
  );
}
