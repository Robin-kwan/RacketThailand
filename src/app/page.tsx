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

          <section className="w-full">
            <div className="grid gap-6">
              {LANDING_SPORTS.map((sport) => (
                <Link
                  key={sport.code}
                  href={buildLocalizedPath(`/${sport.code}`, locale)}
                >
                  <article className="overflow-hidden rounded-[40px] border border-slate-200 shadow-lg shadow-slate-200 transition hover:-translate-y-1 hover:border-slate-300">
                    <div className="relative h-48 w-full overflow-hidden rounded-[40px] md:h-60">
                      <Image
                        src={sport.coverImage}
                        alt={`${sport.name[locale]} cover`}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 50vw"
                        className="object-cover"
                        priority={sport.code === "badminton"}
                      />
                      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/20 to-transparent" />
                      <div className="absolute inset-0 flex items-end p-6">
                        <span className="rounded-full bg-white/20 px-6 py-2 text-base font-semibold uppercase tracking-[0.3em] text-white backdrop-blur">
                          {sport.name[locale]}
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
