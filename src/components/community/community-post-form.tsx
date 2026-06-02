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
    composerPrompt: string;
    cancel: string;
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
  const [expanded, setExpanded] = useState(false);
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
      setExpanded(false);
      router.push(redirectTo);
    });
  };

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="flex min-h-12 w-full items-center rounded-full border border-slate-200 bg-slate-50 px-5 text-left text-sm font-medium text-slate-500 transition hover:border-slate-300 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
      >
        {copy.composerPrompt}
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-semibold text-slate-800">
          {copy.titleLabel}
        </label>
        <input
          type="text"
          required
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--rt-primary)] focus:bg-white"
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
        <label className="text-sm font-semibold text-slate-800">
          {copy.bodyLabel}
        </label>
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder={copy.bodyPlaceholder}
          rows={5}
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition focus:border-[var(--rt-primary)] focus:bg-white"
          required
        />
      </div>
      <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={() => setExpanded(false)}
          disabled={pending}
          className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {copy.cancel}
        </button>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--rt-primary)] px-6 text-sm font-semibold text-[var(--rt-primary-text)] transition hover:bg-[var(--rt-primary-soft)] disabled:cursor-not-allowed disabled:border disabled:border-slate-300 disabled:bg-slate-400 disabled:text-white"
        >
          {pending ? `${copy.submit}...` : copy.submit}
        </button>
      </div>
    </form>
  );
}
