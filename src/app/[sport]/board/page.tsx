import Link from "next/link";
import { notFound } from "next/navigation";
import { HeaderSportScope } from "@/components/header-sport-scope";
import { HeaderSubLabel } from "@/components/header-sub-label";
import { BaseCard } from "@/components/base-card";
import { COMMUNITY_CATEGORIES } from "@/data/communityCategories";
import {
  buildLocalizedPath,
  getTranslator,
  normalizeLocale,
} from "@/lib/i18n";
import { SPORT_META } from "@/data/sportMeta";
import { fetchCommunityPosts } from "@/server/communityBoard";
import { CommunityPostCard } from "@/components/community/community-post-card";
import { CommunityPostForm } from "@/components/community/community-post-form";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type Params = { sport: string };
type ParamsInput = Promise<Params>;
type SearchParams = { lang?: string; category?: string };
type SearchParamsInput = Promise<SearchParams> | undefined;

async function resolveParams(params: ParamsInput): Promise<Params> {
  return params;
}

async function resolveSearchParams(searchParams?: SearchParamsInput) {
  if (!searchParams) return undefined;
  return searchParams;
}

export default async function CommunityBoardPage({
  params,
  searchParams,
}: {
  params: ParamsInput;
  searchParams?: SearchParamsInput;
}) {
  const resolvedParams = await resolveParams(params);
  const resolvedSearch = await resolveSearchParams(searchParams);
  const locale = normalizeLocale(resolvedSearch?.lang);
  const t = await getTranslator(locale);
  const sportMeta = SPORT_META[resolvedParams.sport];
  if (!sportMeta) {
    notFound();
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [communityResult] = await Promise.all([
    fetchCommunityPosts(resolvedParams.sport),
  ]);

  const { sport, posts } = communityResult;
  if (!sport) {
    notFound();
  }
  const copy = {
    title: t("community.boardTitle", { sport: sportMeta.name[locale] }),
    subtitle: t("community.boardSubtitle"),
    cta: t("community.newPost"),
    empty: t("community.emptyState"),
    filterLabel: t("community.filterLabel"),
    filterAll: t("community.filterAll"),
    createHeading: t("community.createHeading"),
    loginPrompt: t("community.loginPrompt"),
  };
  const selectedCategory =
    resolvedSearch?.category?.toLowerCase() ?? "all";
  const filteredPosts =
    selectedCategory !== "all"
      ? posts.filter(
          (post) =>
            post.category?.toLowerCase() === selectedCategory,
        )
      : posts;
  const localizedCategories = COMMUNITY_CATEGORIES.map((category) => ({
    key: category.key,
    label: t(`community.categories.${category.key}`),
  }));
  const categoryFilters = [
    { key: "all", label: copy.filterAll },
    ...localizedCategories,
  ];
  const buildFilterHref = (categoryKey: string) => {
    const base = buildLocalizedPath(`/${sport.code}/board`, locale);
    if (categoryKey === "all") {
      return base;
    }
    const separator = base.includes("?") ? "&" : "?";
    return `${base}${separator}category=${categoryKey}`;
  };
  const formCopy = {
    titleLabel: t("community.titleLabel"),
    bodyLabel: t("community.bodyLabel"),
    bodyPlaceholder: t("community.bodyPlaceholder"),
    categoryLabel: t("community.categoryLabel"),
    submit: t("community.submit"),
    success: t("community.success"),
    error: t("community.error"),
  };
  const redirectTarget = buildLocalizedPath(`/${sport.code}/board`, locale);

  return (
    <div className="rt-page">
      <HeaderSportScope sportSlug={sport.code} />
      <HeaderSubLabel value={sportMeta.name[locale]} />
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 pb-20 pt-10 md:px-10">
        <header className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold text-[var(--foreground)]">
                {copy.title}
              </h1>
              <p className="text-sm text-[rgb(var(--foreground-rgb)/0.7)]">
                {copy.subtitle}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {user && (
                <Link
                  href={buildLocalizedPath(`/${sport.code}/board/mine`, locale)}
                  className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-[var(--foreground)] hover:border-slate-500"
                >
                  {t("community.myPostsLink")}
                </Link>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-[rgb(var(--foreground-rgb)/0.7)]">
            <span className="font-semibold">{copy.filterLabel}</span>
            <div className="flex flex-wrap gap-2">
              {categoryFilters.map((category) => {
                const isActive = category.key === selectedCategory;
                return (
                  <Link
                    key={category.key}
                    href={buildFilterHref(category.key)}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                      isActive
                        ? "border-[var(--rt-primary)] bg-[var(--rt-primary)] text-[var(--rt-primary-text)]"
                        : "border-slate-300 text-[var(--foreground)] hover:border-slate-500"
                    }`}
                  >
                    {category.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </header>
        {user ? (
          <BaseCard
            as="section"
            className="rounded-[32px] border border-slate-200 bg-white p-6"
          >
            <h2 className="text-2xl font-semibold text-[var(--foreground)]">
              {copy.createHeading}
            </h2>
            <p className="mt-1 text-sm text-[rgb(var(--foreground-rgb)/0.7)]">
              {copy.subtitle}
            </p>
            <div className="mt-4">
              <CommunityPostForm
                sportCode={sport.code}
                categories={localizedCategories}
                copy={formCopy}
                redirectTo={redirectTarget}
              />
            </div>
          </BaseCard>
        ) : (
          <BaseCard
            as="section"
            className="rounded-[32px] border border-slate-200 bg-white p-6 text-sm text-[rgb(var(--foreground-rgb)/0.7)]"
          >
            <p>
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

        {filteredPosts.length === 0 ? (
          <BaseCard
            as="div"
            className="rounded-3xl border border-slate-200 bg-white px-6 py-16 text-center text-[rgb(var(--foreground-rgb)/0.75)]"
          >
            <p>{copy.empty}</p>
          </BaseCard>
        ) : (
          <div className="space-y-4">
            {filteredPosts.map((post) => (
              <CommunityPostCard
                key={post.id}
                sportCode={sport.code}
                locale={locale}
                post={post}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
