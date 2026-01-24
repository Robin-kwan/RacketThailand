"use client";

import { useState, useTransition } from "react";

type LikeButtonProps = {
  postId: string;
  initialCount: number;
  initiallyLiked: boolean;
};

export function LikeButton({
  postId,
  initialCount,
  initiallyLiked,
}: LikeButtonProps) {
  const [liked, setLiked] = useState(initiallyLiked);
  const [count, setCount] = useState(initialCount);
  const [pending, startTransition] = useTransition();

  const toggleLike = () => {
    startTransition(async () => {
      const response = await fetch(`/api/community/posts/${postId}/like`, {
        method: "POST",
      });
      if (!response.ok) {
        return;
      }
      const data = await response.json();
      setLiked(data.liked);
      setCount(data.count);
    });
  };

  return (
    <button
      type="button"
      onClick={toggleLike}
      disabled={pending}
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
        liked
          ? "border-red-400 bg-red-500/20 text-red-600"
          : "border-slate-300 text-[var(--foreground)] hover:border-slate-500"
      } disabled:border-slate-300 disabled:bg-transparent disabled:text-slate-400 disabled:cursor-not-allowed`}
    >
      <span aria-hidden className={liked ? "text-red-500" : ""}>
        {liked ? "♥" : "♡"}
      </span>
      {count} {count === 1 ? "Like" : "Likes"}
    </button>
  );
}
