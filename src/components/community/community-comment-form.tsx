"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { showToast } from "@/components/toaster";

type CommunityCommentFormProps = {
  postId: string;
  placeholder: string;
  submitLabel: string;
};

export function CommunityCommentForm({
  postId,
  placeholder,
  submitLabel,
}: CommunityCommentFormProps) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!body.trim()) return;
    startTransition(async () => {
      const response = await fetch(
        `/api/community/posts/${postId}/comments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body }),
        },
      );
      if (!response.ok) {
        showToast({ variant: "error", message: "Unable to post comment." });
        return;
      }
      setBody("");
      router.refresh();
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <textarea
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-slate-700 bg-slate-900/50 px-4 py-3 text-sm text-white outline-none focus:border-emerald-400"
        rows={4}
      />
      <div className="flex items-center justify-between text-sm text-slate-400">
        <button
          type="submit"
          disabled={pending || !body.trim()}
          className="rounded-full bg-emerald-400/90 px-4 py-2 font-semibold text-slate-900 disabled:bg-slate-500 disabled:text-white disabled:border disabled:border-slate-500 disabled:cursor-not-allowed"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
