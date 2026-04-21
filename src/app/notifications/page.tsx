import Link from "next/link";
import type { Metadata } from "next";
import { BaseCard } from "@/components/base-card";
import {
  NotificationsPageContent,
  type NotificationsPageCopy,
} from "@/components/notifications/notifications-page-content";
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

function createCopy(t: Awaited<ReturnType<typeof getTranslator>>): NotificationsPageCopy {
  return {
    title: t("notifications.title"),
    subtitle: t("notifications.subtitle"),
    empty: t("notifications.empty"),
    markAll: t("notifications.markAll"),
    markRead: t("notifications.markRead"),
    reviewCourt: t("notifications.reviewCourt"),
    genericMessage: t("notifications.genericMessage"),
    courtGroupRequest: t("notifications.courtGroupRequest", {
      group: "{group}",
      court: "{court}",
    }),
    loading: t("notifications.loading"),
    loadMore: t("notifications.loadMore"),
    loginPrompt: t("notifications.loginPrompt"),
    fetchError: t("notifications.fetchError"),
    retry: t("notifications.retry"),
    statusUnread: t("notifications.statusUnread"),
    statusRead: t("notifications.statusRead"),
  };
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams?: SearchParamInput;
}): Promise<Metadata> {
  const resolved = await resolveSearchParams(searchParams);
  const locale = normalizeLocale(resolved?.lang);
  const canonicalPath = "/notifications";
  const canonical = buildCanonicalUrl(canonicalPath, locale);
  const alternates = buildLocaleAlternates(canonicalPath);
  const title =
    locale === "th"
      ? "การแจ้งเตือน | RacketThailand"
      : "Notifications | RacketThailand";
  const description =
    locale === "th"
      ? "ดูและจัดการการแจ้งเตือนทั้งหมดของคุณจาก RacketThailand ในหน้าเดียว"
      : "Review and manage all your RacketThailand notifications in one place.";
  return {
    title,
    description,
    robots: {
      index: false,
      follow: false,
    },
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

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams?: SearchParamInput;
}) {
  const resolved = await resolveSearchParams(searchParams);
  const locale = normalizeLocale(resolved?.lang);
  const t = await getTranslator(locale);
  const copy = createCopy(t);
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isAuthenticated = Boolean(user?.id && user.email && !user.is_anonymous);

  return (
    <div className="rt-page">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 pb-20 pt-10 md:px-10">
        {isAuthenticated ? (
          <NotificationsPageContent locale={locale} copy={copy} />
        ) : (
          <BaseCard
            as="section"
            className="rounded-[32px] border border-slate-200 bg-white p-6 text-sm text-[rgb(var(--foreground-rgb)/0.72)]"
          >
            <h1 className="text-2xl font-semibold text-[var(--foreground)]">
              {copy.title}
            </h1>
            <p className="mt-2">
              {copy.loginPrompt}{" "}
              <Link
                href={buildLocalizedPath("/login", locale)}
                className="font-semibold text-[var(--rt-primary)]"
              >
                {t("header.login")}
              </Link>
            </p>
          </BaseCard>
        )}
      </main>
    </div>
  );
}
