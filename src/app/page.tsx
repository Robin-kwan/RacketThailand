import Link from "next/link";
import { LANDING_SPORTS } from "@/data/sportMeta";
import {
  buildLocalizedPath,
  getDictionary,
  normalizeLocale,
} from "@/i18n/dictionaries";

type SearchParams = {
  lang?: string;
};

const gradientOverlay =
  "bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.12),_rgba(2,6,23,0)_55%)]";

type SearchParamInput = SearchParams | Promise<SearchParams> | undefined;

async function resolveSearchParams(
  searchParams?: SearchParamInput,
): Promise<SearchParams | undefined> {
  if (!searchParams) return undefined;
  if (typeof (searchParams as Promise<SearchParams>).then === "function") {
    return searchParams as Promise<SearchParams>;
  }
  return searchParams;
}

export default async function Landing({
  searchParams,
}: {
  searchParams?: SearchParamInput;
}) {
  const resolvedParams = await resolveSearchParams(searchParams);
  const locale = normalizeLocale(resolvedParams?.lang);
  const dictionary = getDictionary(locale);
  const altLocale = locale === "th" ? "en" : "th";

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className={`relative overflow-hidden ${gradientOverlay}`}>
        <div className="absolute inset-0 opacity-40 blur-3xl" aria-hidden>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-gradient-to-b from-sky-500/20 to-transparent" />
        </div>

        <main className="relative mx-auto flex max-w-4xl flex-col items-center gap-12 px-6 py-20 text-center md:px-10">
          <header className="space-y-6">
            <div className="flex flex-col items-center gap-4">
              <p className="text-sm uppercase tracking-[0.4em] text-white/60">
                RacketThailand.com
              </p>
              <h1 className="text-4xl font-semibold leading-tight md:text-5xl">
                {dictionary.landing.heroTitle}
              </h1>
              <p className="text-lg text-white/80 md:text-xl">
                {dictionary.landing.heroDescription}
              </p>
            </div>
            <div className="flex justify-center gap-4 text-sm">
              <Link
                href={
                  altLocale === "th"
                    ? "/"
                    : buildLocalizedPath("/", altLocale)
                }
                className="rounded-full border border-white/40 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white hover:border-white"
              >
                {altLocale === "th" ? "ไทย" : "EN"}
              </Link>
            </div>
          </header>

          <section className="w-full space-y-6">
            <div className="space-y-2">
              <p className="text-sm uppercase tracking-[0.3em] text-white/60">
                {dictionary.landing.sportSectionTitle}
              </p>
              <p className="text-white/70">
                {dictionary.landing.sportSectionDescription}
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {LANDING_SPORTS.map((sport) => (
                <Link
                  key={sport.code}
                  href={buildLocalizedPath(`/${sport.code}`, locale)}
                  className="rounded-2xl border border-white/10 bg-slate-900/40 p-6 text-left transition hover:-translate-y-1 hover:border-white/40"
                  style={{
                    boxShadow: `0 25px 45px -40px ${sport.color}`,
                  }}
                >
                  <p className="text-xs uppercase tracking-[0.4em] text-white/60">
                    racketthailand.com
                  </p>
                  <h3 className="mt-3 text-2xl font-semibold">
                    {locale === "th" ? sport.nameTh : sport.name}
                  </h3>
                  <p className="mt-2 text-sm text-white/80">
                    {locale === "th"
                      ? sport.descriptionTh
                      : sport.descriptionEn}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold uppercase text-white/70">
                    {(locale === "th"
                      ? sport.highlightsTh
                      : sport.highlightsEn
                    ).map((item) => (
                      <span
                        key={item}
                        className="rounded-full border border-white/20 px-3 py-1"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <p className="text-sm text-white/60">
            {dictionary.landing.contactPrompt}
          </p>
        </main>
      </div>

      <footer className="mx-auto max-w-4xl px-6 py-10 text-sm text-white/45 md:px-10">
        RacketThailand · Unified Supabase stack · {new Date().getFullYear()}
      </footer>
    </div>
  );
}
