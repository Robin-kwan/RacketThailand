import { notFound, redirect } from "next/navigation";
import { HeaderSportScope } from "@/components/header-sport-scope";
import { HeaderSubLabel } from "@/components/header-sub-label";
import {
  buildLocalizedPath,
  getTranslator,
  normalizeLocale,
} from "@/lib/i18n";
import { SPORT_META } from "@/data/sportMeta";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { fetchCommunityPostDetail } from "@/server/communityBoard";
import { COMMUNITY_CATEGORIES } from "@/data/communityCategories";
import { CommunityPostEditForm } from "@/components/community/community-post-edit-form";

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
    redirect(buildLocalizedPath("/login", locale));
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
  };

  return (
    <div className="rt-page">
      <HeaderSportScope sportSlug={sport} />
      <HeaderSubLabel value={sportMeta.name[locale]} />
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 pb-20 pt-10 md:px-10">
        <h1 className="text-xl font-semibold text-white">{copy.heading}</h1>
        <div className="rounded-[32px] border border-[var(--rt-primary-border)] bg-[rgb(var(--rt-primary-soft-rgb)/0.6)] p-6 text-[var(--rt-primary-text)]">
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
          />
        </div>
      </main>
    </div>
  );
}
