import Link from "next/link";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import { enUS, th as thLocale } from "date-fns/locale";
import type { Locale } from "@/lib/i18n";
import type { CommunityPost } from "@/server/communityBoard";
import { buildLocalizedPath } from "@/lib/i18n";

type CommunityPostCardProps = {
  sportCode: string;
  locale: Locale;
  post: CommunityPost;
};

export function CommunityPostCard({
  sportCode,
  locale,
  post,
}: CommunityPostCardProps) {
  const href = buildLocalizedPath(`/${sportCode}/board/${post.id}`, locale);
  const dateLocale = locale === "th" ? thLocale : enUS;
  return (
    <Link
      href={href}
      className="block rounded-3xl border border-slate-200 bg-white px-6 py-5 text-[var(--foreground)] transition hover:border-slate-400"
    >
      <div className="flex items-center gap-3 text-xs text-[rgb(var(--foreground-rgb)/0.6)]">
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
            <span className="flex h-full items-center justify-center text-sm font-semibold text-[rgb(var(--foreground-rgb)/0.7)]">
              {(post.author?.display_name?.[0] ?? "M").toUpperCase()}
            </span>
          )}
        </div>
        <div>
          <p className="font-semibold text-[var(--foreground)]">
            {post.author?.display_name ?? "Member"}
          </p>
          <p className="text-xs text-[rgb(var(--foreground-rgb)/0.6)]">
            {formatDistanceToNow(new Date(post.created_at), {
              addSuffix: true,
              locale: dateLocale,
            })}
          </p>
        </div>
      </div>
      <div className="mt-3">
        <h2 className="text-xl font-semibold text-[var(--foreground)]">
          {post.title}
        </h2>
        <p className="mt-2 line-clamp-3 text-sm text-[rgb(var(--foreground-rgb)/0.75)]">
          {post.body_text}
        </p>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-[rgb(var(--foreground-rgb)/0.65)]">
        <span>
          {post.likesCount} {post.likesCount === 1 ? "like" : "likes"}
        </span>
        <span>
          {post.commentsCount}{" "}
          {post.commentsCount === 1 ? "comment" : "comments"}
        </span>
      </div>
    </Link>
  );
}
