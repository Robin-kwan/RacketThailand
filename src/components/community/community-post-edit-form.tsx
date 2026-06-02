"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { BaseSelect } from "@/components/base-select";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { showToast } from "@/components/toaster";

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
    deletePost: string;
    deleteConfirmTitle: string;
    deleteConfirmMessage: string;
    deleteSuccess: string;
    cancel: string;
  };
  initialValues: {
    title: string;
    body: string;
    category: string;
  };
  redirectTo: string;
  deleteRedirectTo: string;
};

export function CommunityPostEditForm({
  postId,
  sportCode,
  categories,
  copy,
  initialValues,
  redirectTo,
  deleteRedirectTo,
}: CommunityPostEditFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initialValues.title);
  const [category, setCategory] = useState(initialValues.category);
  const [body, setBody] = useState(initialValues.body);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [deleting, startDeleteTransition] = useTransition();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    startTransition(async () => {
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
        showToast({ variant: "error", message: copy.error });
        return;
      }
      showToast({ variant: "success", message: copy.success });
      router.push(redirectTo);
      router.refresh();
    });
  };

  const handleDelete = () => {
    startDeleteTransition(async () => {
      const response = await fetch(`/api/community/posts/${postId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        showToast({ variant: "error", message: copy.error });
        return;
      }
      showToast({ variant: "success", message: copy.deleteSuccess });
      setConfirmDeleteOpen(false);
      router.push(deleteRedirectTo);
      router.refresh();
    });
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-5">
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
          <label className="text-sm font-semibold text-slate-800">
            {copy.bodyLabel}
          </label>
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder={copy.bodyPlaceholder}
            rows={8}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition focus:border-[var(--rt-primary)] focus:bg-white"
            required
          />
        </div>
        <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => setConfirmDeleteOpen(true)}
            disabled={pending || deleting}
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-rose-200 bg-white px-5 text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {copy.deletePost}
          </button>
          <button
            type="submit"
            disabled={pending || deleting}
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-slate-900 px-6 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {pending ? `${copy.submit}...` : copy.submit}
          </button>
        </div>
      </form>
      <ConfirmationDialog
        open={confirmDeleteOpen}
        title={copy.deleteConfirmTitle}
        message={copy.deleteConfirmMessage}
        confirmLabel={copy.deletePost}
        cancelLabel={copy.cancel}
        loading={deleting}
        onConfirm={handleDelete}
        onClose={() => setConfirmDeleteOpen(false)}
      />
    </>
  );
}
