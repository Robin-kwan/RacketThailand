import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { HeaderSportScope } from "@/components/header-sport-scope";
import { HeaderSubLabel } from "@/components/header-sub-label";
import { BaseBackLink } from "@/components/base-back-link";
import { BaseCard } from "@/components/base-card";
import {
  buildLocalizedPath,
  getTranslator,
  normalizeLocale,
} from "@/lib/i18n";
import { buildAuthPagePath } from "@/lib/auth-redirect";
import { SPORT_META } from "@/data/sportMeta";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { fetchCommunityPostsByAuthor } from "@/server/communityBoard";
import { CommunityPostCard } from "@/components/community/community-post-card";

export const dynamic = "force-dynamic";

type Params = { sport: string };
type ParamsInput = Promise<Params>;
type SearchParams = { lang?: string };
type SearchParamsInput = Promise<SearchParams> | undefined;

async function resolveParams(params: ParamsInput): Promise<Params> {
  return params;
}

async function resolveSearchParams(searchParams?: SearchParamsInput) {
  if (!searchParams) return undefined;
  return searchParams;
}

export default async function MyCommunityPostsPage({
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
  const isAuthenticated = Boolean(
    user?.id && user.email && !user.is_anonymous,
  );

  if (!isAuthenticated || !user) {
    redirect(
      buildAuthPagePath(
        "/login",
        locale,
        `/${resolvedParams.sport}/board/mine`,
      ),
    );
  }

  const { sport, posts } = await fetchCommunityPostsByAuthor(
    resolvedParams.sport,
    user.id,
  );
  if (!sport) {
    notFound();
  }

  const copy = {
    title: t("community.myPostsTitle"),
    empty: t("community.myPostsEmpty"),
    back: t("community.backToBoard"),
    cta: t("community.newPost"),
  };

  return (
    <div className="rt-page">
      <HeaderSportScope sportSlug={sport.code} />
      <HeaderSubLabel value={sportMeta.name[locale]} />
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 pb-20 pt-10 md:px-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <BaseBackLink
              href={buildLocalizedPath(`/${sport.code}/board`, locale)}
            >
              {copy.back}
            </BaseBackLink>
            <h1 className="mt-4 text-xl font-semibold text-[var(--foreground)]">
              {copy.title}
            </h1>
          </div>
          <Link
            href={buildLocalizedPath(`/${sport.code}/board`, locale)}
            className="rounded-full bg-[var(--rt-primary)] px-5 py-2 text-sm font-semibold text-[var(--rt-primary-text)] transition hover:bg-[var(--rt-primary-border)]"
          >
            {copy.cta}
          </Link>
        </div>

        {posts.length === 0 ? (
          <BaseCard
            as="div"
            className="rounded-3xl border border-slate-200 bg-white px-6 py-16 text-center text-[rgb(var(--foreground-rgb)/0.75)]"
          >
            <p>{copy.empty}</p>
          </BaseCard>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
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
