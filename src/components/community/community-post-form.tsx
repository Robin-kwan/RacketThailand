"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { BaseSelect } from "@/components/base-select";
import { showToast } from "@/components/toaster";

type CommunityPostFormProps = {
  sportCode: string;
  categories: { key: string; label: string }[];
  copy: {
    titleLabel: string;
    bodyLabel: string;
    bodyPlaceholder: string;
    categoryLabel: string;
    submit: string;
    success: string;
    error: string;
  };
  redirectTo: string;
};

export function CommunityPostForm({
  sportCode,
  categories,
  copy,
  redirectTo,
}: CommunityPostFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(categories[0]?.key ?? "event");
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    startTransition(async () => {
      const response = await fetch("/api/community/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sport: sportCode,
          title,
          category,
          body_text: body,
          redirectTo,
        }),
      });
      if (!response.ok) {
        showToast({ variant: "error", message: copy.error });
        return;
      }
      showToast({ variant: "success", message: copy.success });
      setTitle("");
      setBody("");
      router.push(redirectTo);
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <label className="text-sm font-semibold text-[var(--foreground)]">
          {copy.titleLabel}
        </label>
        <input
          type="text"
          required
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--rt-primary)]"
        />
      </div>
      <div>
        <BaseSelect
          label={copy.categoryLabel}
          name="category"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          options={categories.map((option) => ({
            value: option.key,
            label: option.label,
          }))}
          variant="light"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-semibold text-[var(--foreground)]">
          {copy.bodyLabel}
        </label>
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder={copy.bodyPlaceholder}
          rows={8}
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--rt-primary)]"
          required
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-[var(--rt-primary)] px-6 py-3 text-sm font-semibold text-[var(--rt-primary-text)] disabled:bg-slate-400 disabled:text-white disabled:border disabled:border-slate-300 disabled:cursor-not-allowed"
      >
        {copy.submit}
      </button>
    </form>
  );
}
