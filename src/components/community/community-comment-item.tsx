"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { CommunityComment } from "@/server/communityBoard";

type CommunityCommentItemProps = {
  comment: CommunityComment;
  canEdit: boolean;
  copy: {
    edit: string;
    save: string;
    cancel: string;
  };
  editedLabel?: string | null;
};

export function CommunityCommentItem({
  comment,
  canEdit,
  copy,
  editedLabel,
}: CommunityCommentItemProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(comment.body_text);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    startTransition(async () => {
      setError(null);
      const response = await fetch(`/api/community/comments/${comment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      if (!response.ok) {
        setError("Unable to update comment");
        return;
      }
      setEditing(false);
      router.refresh();
    });
  };

  return (
    <li className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-[var(--foreground)]">
      <div className="flex items-center gap-3 text-xs font-semibold text-[rgb(var(--foreground-rgb)/0.6)]">
        <div className="relative h-8 w-8 overflow-hidden rounded-full bg-[rgb(var(--foreground-rgb)/0.1)]">
          {comment.author?.avatar_url ? (
            <Image
              src={comment.author.avatar_url}
              alt={comment.author.display_name ?? "Member"}
              fill
              sizes="32px"
              className="object-cover"
            />
          ) : (
            <span className="flex h-full items-center justify-center text-sm text-[rgb(var(--foreground-rgb)/0.7)]">
              {(comment.author?.display_name?.[0] ?? "M").toUpperCase()}
            </span>
          )}
        </div>
        <span>{comment.author?.display_name ?? "Member"}</span>
        {editedLabel && (
          <span className="text-[rgb(var(--foreground-rgb)/0.6)]">
            {editedLabel}
          </span>
        )}
        {canEdit && !editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="ml-auto text-xs font-semibold text-[var(--rt-primary)] hover:text-[rgb(var(--rt-primary-border-rgb)/0.8)]"
          >
            {copy.edit}
          </button>
        )}
      </div>
      {editing ? (
        <div className="mt-2 space-y-2">
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={4}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--rt-primary)]"
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex gap-2 text-xs">
            <button
              type="button"
              disabled={pending}
              onClick={handleSave}
              className="rounded-full bg-[var(--rt-primary)] px-3 py-1 font-semibold text-[var(--rt-primary-text)] disabled:bg-slate-500 disabled:text-white disabled:border disabled:border-slate-500 disabled:cursor-not-allowed"
            >
              {copy.save}
            </button>
            <button
              type="button"
              className="rounded-full border border-slate-300 px-3 py-1 font-semibold text-[rgb(var(--foreground-rgb)/0.7)]"
              onClick={() => {
                setEditing(false);
                setBody(comment.body_text);
              }}
            >
              {copy.cancel}
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="mt-2 whitespace-pre-wrap text-[rgb(var(--foreground-rgb)/0.8)]">
            {comment.body_text}
          </p>
          <p className="mt-2 text-xs text-[rgb(var(--foreground-rgb)/0.6)]">
            {new Date(comment.created_at).toLocaleString()}
          </p>
        </>
      )}
    </li>
  );
}
