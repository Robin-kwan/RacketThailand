import { notFound, redirect } from "next/navigation";
import { HeaderSportScope } from "@/components/header-sport-scope";
import { HeaderSubLabel } from "@/components/header-sub-label";
import {
  buildLocalizedPath,
  getTranslator,
  normalizeLocale,
} from "@/lib/i18n";
import { buildAuthPagePath } from "@/lib/auth-redirect";
import { SPORT_META } from "@/data/sportMeta";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { fetchCommunityPostDetail } from "@/server/communityBoard";
import { COMMUNITY_CATEGORIES } from "@/data/communityCategories";
import { CommunityPostEditForm } from "@/components/community/community-post-edit-form";
import { BaseBackLink } from "@/components/base-back-link";
import { BaseCard } from "@/components/base-card";

export const dynamic = "force-dynamic";

type Params = { sport: string; postId: string };
type ParamsInput = Promise<Params>;
type SearchParams = { lang?: string };
type SearchParamsInput = Promise<SearchParams> | undefined;

async function resolveParams(params: ParamsInput) {
  return params;
}

async function resolveSearchParams(searchParams?: SearchParamsInput) {
  if (!searchParams) return undefined;
  return searchParams;
}

export default async function EditCommunityPostPage({
  params,
  searchParams,
}: {
  params: ParamsInput;
  searchParams?: SearchParamsInput;
}) {
  const { sport, postId } = await resolveParams(params);
  const resolvedSearch = await resolveSearchParams(searchParams);
  const locale = normalizeLocale(resolvedSearch?.lang);
  const t = await getTranslator(locale);
  const sportMeta = SPORT_META[sport];
  if (!sportMeta) {
    notFound();
  }

  const post = await fetchCommunityPostDetail(postId);
  if (!post) {
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
      buildAuthPagePath("/login", locale, `/${sport}/board/${postId}/edit`),
    );
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("status")
    .eq("id", user.id)
    .single();
  const isAdmin = profile?.status === "admin";
  if (!isAdmin && post.author_id !== user.id) {
    redirect(buildLocalizedPath(`/${sport}/board/${post.id}`, locale));
  }

  const categories = COMMUNITY_CATEGORIES.map((category) => ({
    key: category.key,
    label: t(`community.categories.${category.key}`),
  }));

  const copy = {
    heading: t("community.editHeading"),
    submit: t("community.updatePost"),
    success: t("community.updateSuccess"),
    error: t("community.error"),
    titleLabel: t("community.titleLabel"),
    bodyLabel: t("community.bodyLabel"),
    bodyPlaceholder: t("community.bodyPlaceholder"),
    categoryLabel: t("community.categoryLabel"),
    deletePost: t("community.deletePost"),
    deleteConfirmTitle: t("community.deleteConfirmTitle"),
    deleteConfirmMessage: t("community.deleteConfirmMessage"),
    deleteSuccess: t("community.deleteSuccess"),
    cancel: t("community.cancel"),
  };

  return (
    <div className="rt-page">
      <HeaderSportScope sportSlug={sport} />
      <HeaderSubLabel value={sportMeta.name[locale]} />
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-6 pb-20 pt-10 md:px-10">
        <BaseBackLink href={buildLocalizedPath(`/${sport}/board`, locale)}>
          {t("community.backToBoard")}
        </BaseBackLink>
        <BaseCard
          as="section"
          className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_18px_70px_rgb(var(--foreground-rgb)/0.08)] md:p-8"
        >
          <div className="mb-6 border-b border-slate-100 pb-5">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
              {copy.heading}
            </h1>
          </div>
          <CommunityPostEditForm
            postId={post.id}
            sportCode={sport}
            categories={categories}
            copy={copy}
            initialValues={{
              title: post.title,
              body: post.body_text,
              category: post.category,
            }}
            redirectTo={buildLocalizedPath(`/${sport}/board/${post.id}`, locale)}
            deleteRedirectTo={buildLocalizedPath(`/${sport}/board`, locale)}
          />
        </BaseCard>
      </main>
    </div>
  );
}
