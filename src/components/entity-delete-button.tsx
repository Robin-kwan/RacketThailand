"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { showToast } from "@/components/toaster";

type EntityDeleteButtonCopy = {
  submit: string;
  deleting: string;
  success: string;
  error: string;
  confirm: string;
  cancel: string;
};

type EntityDeleteButtonProps = {
  endpoint: string;
  redirectHref: string;
  copy: EntityDeleteButtonCopy;
};

export function EntityDeleteButton({
  endpoint,
  redirectHref,
  copy,
}: EntityDeleteButtonProps) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    const response = await fetch(endpoint, { method: "DELETE" });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setDeleting(false);
      setConfirmOpen(false);
      showToast({
        variant: "error",
        message: typeof data?.error === "string" ? data.error : copy.error,
      });
      return;
    }

    showToast({ variant: "success", message: copy.success });
    setConfirmOpen(false);
    window.setTimeout(() => {
      router.push(redirectHref);
      router.refresh();
    }, 900);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        disabled={deleting}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500"
      >
        <Trash2 className="h-4 w-4" aria-hidden />
        {deleting ? `${copy.deleting}...` : copy.submit}
      </button>
      <ConfirmationDialog
        open={confirmOpen}
        title={copy.submit}
        message={copy.confirm}
        confirmLabel={copy.submit}
        cancelLabel={copy.cancel}
        loading={deleting}
        onConfirm={handleDelete}
        onClose={() => setConfirmOpen(false)}
      />
    </>
  );
}
