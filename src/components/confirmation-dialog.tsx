"use client";

import { useEffect, useId } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, X } from "lucide-react";

type ConfirmationDialogProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export function ConfirmationDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  loading = false,
  onConfirm,
  onClose,
}: ConfirmationDialogProps) {
  const titleId = useId();
  const messageId = useId();

  useEffect(() => {
    if (!open || loading) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [loading, onClose, open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center bg-slate-950/45 px-4 py-8 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (!loading && event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={messageId}
        className="rt-notification-modal relative w-full max-w-md rounded-[28px] border border-white/80 bg-white px-6 pb-6 pt-7 text-slate-900 shadow-[0_24px_80px_rgb(15_23_42/0.28)]"
      >
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          aria-label={cancelLabel}
        >
          <X className="h-4 w-4" strokeWidth={2} aria-hidden />
        </button>
        <div className="flex gap-4 pr-8">
          <div className="flex h-12 w-12 flex-none items-center justify-center rounded-full bg-rose-50 text-rose-600 ring-8 ring-rose-100">
            <AlertTriangle className="h-6 w-6" strokeWidth={2} aria-hidden />
          </div>
          <div>
            <h2 id={titleId} className="text-lg font-semibold text-slate-950">
              {title}
            </h2>
            <p
              id={messageId}
              className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600"
            >
              {message}
            </p>
          </div>
        </div>
        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-rose-600 px-5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-rose-300"
          >
            {loading ? `${confirmLabel}...` : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
