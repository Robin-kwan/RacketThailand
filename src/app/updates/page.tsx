import type { Metadata } from "next";
import { CheckCircle2, Sparkles, Wrench } from "lucide-react";
import { PRODUCT_UPDATES, type ProductUpdateKind } from "@/data/productUpdates";
import { normalizeLocale, type Locale } from "@/lib/i18n";
import {
  buildCanonicalUrl,
  buildLocaleAlternates,
  truncateMetaDescription,
} from "@/lib/seo";

type SearchParams = {
  lang?: string;
};

type SearchParamsInput = Promise<SearchParams> | undefined;

async function resolveSearchParams(searchParams?: SearchParamsInput) {
  return searchParams;
}

function formatReleaseDate(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-GB", {
    timeZone: "Asia/Bangkok",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

const KIND_STYLES: Record<
  ProductUpdateKind,
  { icon: typeof Sparkles; className: string }
> = {
  new: {
    icon: Sparkles,
    className: "bg-blue-50 text-blue-700",
  },
  improved: {
    icon: Wrench,
    className: "bg-amber-50 text-amber-700",
  },
  fixed: {
    icon: CheckCircle2,
    className: "bg-emerald-50 text-emerald-700",
  },
};

const KIND_ORDER: ProductUpdateKind[] = ["new", "improved", "fixed"];

export async function generateMetadata({
  searchParams,
}: {
  searchParams?: SearchParamsInput;
}): Promise<Metadata> {
  const resolvedSearch = await resolveSearchParams(searchParams);
  const locale = normalizeLocale(resolvedSearch?.lang);
  const title =
    locale === "th"
      ? "อัปเดตล่าสุด | RacketThailand"
      : "What's New | RacketThailand";
  const description = truncateMetaDescription(
    locale === "th"
      ? "ติดตามฟีเจอร์ใหม่ การปรับปรุง และสิ่งที่แก้ไขใน RacketThailand พร้อมวันที่และเวอร์ชันของแต่ละอัปเดต"
      : "See the latest RacketThailand features, improvements, and fixes with a date and version for every update.",
  );
  const canonicalPath = "/updates";
  const canonicalUrl = buildCanonicalUrl(canonicalPath, locale);

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
      languages: buildLocaleAlternates(canonicalPath),
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: "website",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default async function UpdatesPage({
  searchParams,
}: {
  searchParams?: SearchParamsInput;
}) {
  const resolvedSearch = await resolveSearchParams(searchParams);
  const locale = normalizeLocale(resolvedSearch?.lang);
  const copy =
    locale === "th"
      ? {
          title: "อัปเดตล่าสุด",
          description:
            "ดูว่ามีฟีเจอร์ใหม่ การปรับปรุง และการแก้ไขอะไรเพิ่มเข้ามาใน RacketThailand บ้าง",
          latest: "เวอร์ชันล่าสุด",
          version: "เวอร์ชัน",
          kinds: {
            new: "ฟีเจอร์ใหม่",
            improved: "ปรับปรุง",
            fixed: "แก้ไข",
          },
        }
      : {
          title: "What's New",
          description:
            "Follow the latest features, improvements, and fixes added to RacketThailand.",
          latest: "Latest version",
          version: "Version",
          kinds: {
            new: "New",
            improved: "Improved",
            fixed: "Fixed",
          },
        };

  return (
    <div className="rt-page">
      <main className="mx-auto w-full max-w-4xl px-6 pb-20 pt-12 md:px-10 md:pt-16">
        <header className="max-w-2xl">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">
            {copy.title}
          </h1>
          <p className="mt-3 text-base leading-7 text-slate-600">
            {copy.description}
          </p>
        </header>

        <div className="mt-10 space-y-8">
          {PRODUCT_UPDATES.map((update, updateIndex) => {
            const groupedItems = KIND_ORDER.map((kind) => ({
              kind,
              items: update.items.filter((item) => item.kind === kind),
            })).filter((group) => group.items.length > 0);

            return (
              <article
                key={update.version}
                className="rt-card overflow-hidden border border-slate-200 bg-white"
              >
                <div className="border-b border-slate-200 p-6 md:p-8">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                    <span className="rounded-full bg-slate-950 px-3 py-1 text-white">
                      {copy.version} {update.version}
                    </span>
                    {updateIndex === 0 ? (
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">
                        {copy.latest}
                      </span>
                    ) : null}
                    <time
                      dateTime={update.releasedAt}
                      className="ml-auto text-slate-500"
                    >
                      {formatReleaseDate(update.releasedAt, locale)}
                    </time>
                  </div>
                  <h2 className="mt-5 text-xl font-semibold tracking-tight text-slate-950 md:text-2xl">
                    {update.title[locale]}
                  </h2>
                  <p className="mt-2 text-sm leading-7 text-slate-600 md:text-base">
                    {update.summary[locale]}
                  </p>
                </div>

                <div className="divide-y divide-slate-100 px-6 md:px-8">
                  {groupedItems.map((group) => {
                    const kind = KIND_STYLES[group.kind];
                    const Icon = kind.icon;
                    return (
                      <section
                        key={`${update.version}-${group.kind}`}
                        className="flex gap-4 py-5"
                      >
                        <span
                          className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full ${kind.className}`}
                        >
                          <Icon className="size-4" aria-hidden />
                        </span>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
                            {copy.kinds[group.kind]}
                          </h3>
                          <ul className="mt-3 space-y-3">
                            {group.items.map((item, itemIndex) => (
                              <li
                                key={`${update.version}-${group.kind}-${itemIndex}`}
                                className="relative pl-4 text-sm leading-6 text-slate-700 before:absolute before:left-0 before:top-[0.65rem] before:size-1.5 before:rounded-full before:bg-slate-300"
                              >
                                {item.text[locale]}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </section>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </div>
      </main>
    </div>
  );
}
