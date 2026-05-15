import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import { enUS, th as thLocale } from "date-fns/locale";
import { HeaderSportScope } from "@/components/header-sport-scope";
import { HeaderSubLabel } from "@/components/header-sub-label";
import { BaseBackLink } from "@/components/base-back-link";
import { BaseCard } from "@/components/base-card";
import {
  buildLocalizedPath,
  getTranslator,
  normalizeLocale,
} from "@/lib/i18n";
import {
  buildCanonicalUrl,
  buildLocaleAlternates,
  truncateMetaDescription,
} from "@/lib/seo";
import { SPORT_META } from "@/data/sportMeta";
import {
  fetchCommunityComments,
  fetchCommunityPostDetail,
} from "@/server/communityBoard";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { LikeButton } from "@/components/community/like-button";
import { CommunityCommentForm } from "@/components/community/community-comment-form";
import { CommunityCommentItem } from "@/components/community/community-comment-item";
import Link from "next/link";

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

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: ParamsInput;
  searchParams?: SearchParamsInput;
}): Promise<Metadata> {
  const { sport, postId } = await resolveParams(params);
  const resolvedSearch = await resolveSearchParams(searchParams);
  const locale = normalizeLocale(resolvedSearch?.lang);
  const meta = SPORT_META[sport];
  if (!meta) {
    return {
      title: "Post not found | RacketThailand",
      robots: {
        index: false,
        follow: false,
      },
    };
  }
  const post = await fetchCommunityPostDetail(postId);
  if (!post || post.status !== "published") {
    return {
      title: "Post not found | RacketThailand",
      robots: {
        index: false,
        follow: false,
      },
    };
  }
  const canonicalPath = `/${sport}/board/${post.id}`;
  const canonical = buildCanonicalUrl(canonicalPath, locale);
  const alternates = buildLocaleAlternates(canonicalPath);
  const title = `${post.title} | ${meta.name[locale]} Community`;
  const description = truncateMetaDescription(post.body_text, 160);

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
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function CommunityPostPage({
  params,
  searchParams,
}: {
  params: ParamsInput;
  searchParams?: SearchParamsInput;
}) {
  const { sport, postId } = await resolveParams(params);
  const resolvedSearch = await resolveSearchParams(searchParams);
  const locale = normalizeLocale(resolvedSearch?.lang);
  if (postId === "new") {
    redirect(buildLocalizedPath(`/${sport}/board`, locale));
  }
  const t = await getTranslator(locale);
  const sportMeta = SPORT_META[sport];
  if (!sportMeta) {
    notFound();
  }
  const dateLocale = locale === "th" ? thLocale : enUS;

  const [post, comments] = await Promise.all([
    fetchCommunityPostDetail(postId),
    fetchCommunityComments(postId),
  ]);

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
  const { data: viewerProfile } = isAuthenticated && user
    ? await supabase
        .from("profiles")
        .select("status")
        .eq("id", user.id)
        .single()
    : { data: null };
  const isAdminViewer = viewerProfile?.status === "admin";
  const canEditPost = Boolean(
    isAuthenticated &&
      user?.id &&
      (post.author_id === user.id || isAdminViewer),
  );

  const { data: existingLike } = isAuthenticated && user
    ? await supabase
        .from("community_likes")
        .select("post_id")
        .eq("post_id", post.id)
        .eq("user_id", user.id)
        .maybeSingle()
    : { data: null };

  const copy = {
    back: t("community.backToBoard"),
    comments: t("community.commentsTitle"),
    commentPlaceholder: t("community.commentPlaceholder"),
    commentSubmit: t("community.commentSubmit"),
    loginPrompt: t("community.loginPrompt"),
    editPost: t("community.editPost"),
    editComment: t("community.editComment"),
    saveComment: t("community.saveComment"),
    cancel: t("community.cancel"),
    editedLabel: (time: string) =>
      t("community.editedLabel", {
        time,
      }),
  };

  const formattedComments = comments.map((comment) => ({
    comment,
    editedLabel:
      comment.updated_at && comment.updated_at !== comment.created_at
        ? copy.editedLabel(
            formatDistanceToNow(new Date(comment.updated_at), {
              addSuffix: true,
              locale: dateLocale,
            }),
          )
        : null,
  }));

  return (
    <div className="rt-page">
      <HeaderSportScope sportSlug={sport} />
      <HeaderSubLabel value={sportMeta.name[locale]} />
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 pb-20 pt-10 md:px-10">
        <BaseBackLink href={buildLocalizedPath(`/${sport}/board`, locale)}>
          {copy.back}
        </BaseBackLink>
        <BaseCard
          as="article"
          className="rounded-[32px] border border-slate-200 bg-white p-8 text-[var(--foreground)]"
        >
          <div className="flex flex-wrap items-center justify-between gap-4 text-xs uppercase text-[rgb(var(--foreground-rgb)/0.6)]">
            <span>{post.category}</span>
            <span>{new Date(post.created_at).toLocaleString()}</span>
          </div>
          <div className="mt-2 flex items-center gap-3 text-sm text-[rgb(var(--foreground-rgb)/0.7)]">
            <div className="relative h-10 w-10 overflow-hidden rounded-full bg-[rgb(var(--foreground-rgb)/0.1)]">
              {post.author?.avatar_url ? (
                <Image
                  src={post.author.avatar_url}
                  alt={post.author.display_name ?? "Member"}
                  fill
                  sizes="40px"
                  className="object-cover"
                />
              ) : (
                <span className="flex h-full items-center justify-center text-lg font-semibold text-slate-500">
                  {(post.author?.display_name?.[0] ?? "M").toUpperCase()}
                </span>
              )}
            </div>
            <span>{post.author?.display_name ?? "Member"}</span>
            {post.updated_at !== post.created_at && (
              <span className="text-[rgb(var(--foreground-rgb)/0.6)]">
                {copy.editedLabel(
                  formatDistanceToNow(new Date(post.updated_at), {
                    addSuffix: true,
                    locale: dateLocale,
                  }),
                )}
              </span>
            )}
            {canEditPost && (
              <Link
                href={buildLocalizedPath(
                  `/${sport}/board/${post.id}/edit`,
                  locale,
                )}
                className="ml-auto text-xs font-semibold text-[var(--rt-primary)] hover:text-[var(--rt-primary-border)]"
              >
                {copy.editPost}
              </Link>
            )}
          </div>
          <h1 className="mt-4 text-xl font-semibold text-[var(--foreground)]">
            {post.title}
          </h1>
          <div className="mt-6 whitespace-pre-line text-[var(--foreground)]">
            {post.body_text}
          </div>
          <div className="mt-6 flex items-center justify-between">
            <LikeButton
              postId={post.id}
              initialCount={post.likesCount}
              initiallyLiked={Boolean(existingLike)}
            />
          </div>
        </BaseCard>

        <BaseCard
          as="section"
          className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 text-[var(--foreground)]"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-[var(--foreground)]">
              {copy.comments}
            </h2>
            {!isAuthenticated && (
              <Link
                href={buildLocalizedPath("/login", locale)}
                className="text-sm font-semibold text-[var(--rt-primary)] hover:text-[var(--rt-primary-border)]"
              >
                {copy.loginPrompt}
              </Link>
            )}
          </div>
          {isAuthenticated && (
            <CommunityCommentForm
              postId={post.id}
              placeholder={copy.commentPlaceholder}
              submitLabel={copy.commentSubmit}
            />
          )}
          {formattedComments.length === 0 ? (
            <p className="text-sm text-[rgb(var(--foreground-rgb)/0.6)]">
              {t("community.noComments")}
            </p>
          ) : (
            <ul className="space-y-4">
              {formattedComments.map(({ comment, editedLabel }) => (
                <CommunityCommentItem
                  key={comment.id}
                  comment={comment}
                  canEdit={
                    isAuthenticated &&
                    Boolean(
                      user?.id &&
                        (comment.author_id === user.id || isAdminViewer),
                    )
                  }
                  copy={{
                    edit: copy.editComment,
                    save: copy.saveComment,
                    cancel: copy.cancel,
                  }}
                  editedLabel={editedLabel}
                />
              ))}
            </ul>
          )}
        </BaseCard>
      </main>
    </div>
  );
}
