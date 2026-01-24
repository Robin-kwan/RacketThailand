"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { BaseSelect } from "@/components/base-select";

type CommunityPostEditFormProps = {
  postId: string;
  sportCode: string;
  categories: { key: string; label: string }[];
  copy: {
    heading: string;
    submit: string;
    success: string;
    error: string;
    titleLabel: string;
    bodyLabel: string;
    bodyPlaceholder: string;
    categoryLabel: string;
  };
  initialValues: {
    title: string;
    body: string;
    category: string;
  };
  redirectTo: string;
};

export function CommunityPostEditForm({
  postId,
  sportCode,
  categories,
  copy,
  initialValues,
  redirectTo,
}: CommunityPostEditFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initialValues.title);
  const [category, setCategory] = useState(initialValues.category);
  const [body, setBody] = useState(initialValues.body);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    startTransition(async () => {
      setMessage(null);
      const response = await fetch(`/api/community/posts/${postId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sport: sportCode,
          title,
          category,
          body_text: body,
        }),
      });
      if (!response.ok) {
        setMessage(copy.error);
        return;
      }
      setMessage(copy.success);
      router.push(redirectTo);
      router.refresh();
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
      {message && (
        <p className="text-sm text-emerald-300" role="status">
          {message}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-emerald-400/90 px-6 py-3 text-sm font-semibold text-slate-900 disabled:bg-slate-500 disabled:text-white disabled:border disabled:border-slate-500 disabled:cursor-not-allowed"
      >
        {copy.submit}
      </button>
    </form>
  );
}
