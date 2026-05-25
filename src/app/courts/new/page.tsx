import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CourtAdminForm } from "@/components/admin/court-form";
import { BaseBackLink } from "@/components/base-back-link";
import { BaseCard } from "@/components/base-card";
import { SPORT_META } from "@/data/sportMeta";
import {
  buildLocalizedPath,
  getTranslator,
  normalizeLocale,
} from "@/lib/i18n";
import { buildCanonicalUrl, buildLocaleAlternates } from "@/lib/seo";
import { getAllowPublicCourtPublish } from "@/lib/court-submission-policy";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseSelect } from "@/lib/supabaseRest";

type SearchParams = {
  lang?: string;
  sport?: string;
};

type SearchParamsInput = Promise<SearchParams> | undefined;

async function resolveSearchParams(
  searchParams?: SearchParamsInput,
): Promise<SearchParams | undefined> {
  if (!searchParams) return undefined;
  return searchParams;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams?: SearchParamsInput;
}): Promise<Metadata> {
  const resolved = await resolveSearchParams(searchParams);
  const locale = normalizeLocale(resolved?.lang);
  const canonicalPath = "/courts/new";
  const canonical = buildCanonicalUrl(canonicalPath, locale);
  const alternates = buildLocaleAlternates(canonicalPath);
  const title =
    locale === "th"
      ? "เพิ่มสนามใหม่ | RacketThailand"
      : "Add a New Court | RacketThailand";
  const description =
    locale === "th"
      ? "เพิ่มข้อมูลสนามกีฬาแร็กเกตในไทย เพื่อให้ผู้เล่นค้นหาเจอได้ง่ายขึ้น"
      : "Submit a new Thailand racket-sport court so players can discover it faster.";

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

export default async function NewCourtPage({
  searchParams,
}: {
  searchParams?: SearchParamsInput;
}) {
  const resolved = await resolveSearchParams(searchParams);
  const locale = normalizeLocale(resolved?.lang);
  const t = await getTranslator(locale);
  const allowPublicCourtPublish = await getAllowPublicCourtPublish();
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(buildLocalizedPath("/login", locale));
  }

  const { data: sports } = await supabaseSelect<{
    id: string;
    code: string;
    name: string;
  }>("sports", {
    select: "id,code,name",
    order: "code.asc",
  });

  const sportOptions =
    sports?.map((sport) => ({
      id: sport.id,
      label: SPORT_META[sport.code]?.name[locale] ?? sport.name ?? sport.code,
    })) ?? [];
  const requestedSport = resolved?.sport?.trim().toLowerCase();
  const defaultSportId =
    requestedSport && sports
      ? sports.find(
          (sport) =>
            sport.code.toLowerCase() === requestedSport ||
            sport.id.toLowerCase() === requestedSport,
        )?.id
      : undefined;

  const copy = {
    selectSport: t("admin.selectSport"),
    name: t("admin.courtName"),
    description: t("admin.description"),
    address: t("admin.address"),
    district: t("admin.district"),
    province: t("admin.province"),
    locationDetailsTitle: t("admin.locationDetailsTitle"),
    locationDetailsHelper: t("admin.locationDetailsHelper"),
    locationDetailsEmpty: t("admin.locationDetailsEmpty"),
    locationLockedBadge: t("admin.locationLockedBadge"),
    price: t("admin.price"),
    openingHours: t("admin.openingHours"),
    phone: t("admin.phone"),
    line: t("admin.line"),
    lineQr: t("admin.lineQr"),
    website: t("admin.website"),
    placeSearch: t("admin.placeSearch"),
    placeSearchHelper: t("admin.placeSearchHelper"),
    placeSearchNoResults: t("admin.placeSearchNoResults"),
    placeAlreadyRegistered: t("admin.placeAlreadyRegistered"),
    placeExistingCourtLinkFallback: t("admin.placeExistingCourtLinkFallback"),
    photos: t("admin.photos"),
    primaryPhoto: t("admin.primaryPhoto"),
    makePrimaryPhoto: t("admin.makePrimaryPhoto"),
    submit: allowPublicCourtPublish
      ? t("courtSubmission.submit")
      : t("courtSubmission.submitRequest"),
    submitting: t("courtSubmission.submitting"),
    success: t("courtSubmission.success"),
    successPending: t("courtSubmission.successPending"),
    error: t("courtSubmission.error"),
    locationMissing: t("admin.locationMissing"),
  };

  return (
    <div className="rt-page">
      <main className="mx-auto flex max-w-5xl flex-col gap-8 px-6 pb-20 pt-10 md:px-10">
        <BaseBackLink href={buildLocalizedPath("/", locale)}>
          {t("courtSubmission.back")}
        </BaseBackLink>
        <BaseCard
          as="section"
          className="rounded-[34px] border border-[rgb(var(--foreground-rgb)/0.13)] bg-white/95 p-8 shadow-[0_24px_80px_rgb(var(--foreground-rgb)/0.08)]"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[rgb(var(--foreground-rgb)/0.52)]">
            {locale === "th" ? "ชุมชน · สนาม" : "Community · Courts"}
          </p>
          <h1 className="mt-4 text-xl font-semibold tracking-tight text-[var(--foreground)]">
            {t("courtSubmission.title")}
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-[rgb(var(--foreground-rgb)/0.72)]">
            {allowPublicCourtPublish
              ? t("courtSubmission.subtitle")
              : t("courtSubmission.subtitleRequestOnly")}
          </p>
          <div className="mt-8">
            <CourtAdminForm
              sports={sportOptions}
              defaultSportId={defaultSportId}
              submitEndpoint="/api/courts"
              analyticsSurface="public_court_form"
              copy={copy}
            />
          </div>
        </BaseCard>
      </main>
    </div>
  );
}
