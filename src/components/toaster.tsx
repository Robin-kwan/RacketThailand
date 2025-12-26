"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type ToastVariant = "success" | "error" | "info";

type Toast = {
  id: number;
  variant: ToastVariant;
  message: string;
};

type ToastEventDetail = {
  variant: ToastVariant;
  message: string;
};

const TOAST_EVENT = "rt-toast" as const;

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    let counter = 0;
    const handleToast = (event: Event) => {
      const detail = (event as CustomEvent<ToastEventDetail>).detail;
      if (!detail) return;
      counter += 1;
      const id = counter;
      setToasts((current) => [
        ...current,
        { id, variant: detail.variant, message: detail.message },
      ]);
      setTimeout(() => {
        setToasts((current) => current.filter((toast) => toast.id !== id));
      }, 5000);
    };
    window.addEventListener(TOAST_EVENT, handleToast);
    return () => {
      window.removeEventListener(TOAST_EVENT, handleToast);
    };
  }, []);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="pointer-events-none fixed top-6 right-6 z-[9999] flex w-full max-w-sm flex-col gap-3">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto rounded-2xl border px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 ${
            toast.variant === "success"
              ? "border-emerald-500 bg-emerald-600"
              : toast.variant === "error"
                ? "border-rose-500 bg-rose-600"
                : "border-slate-400 bg-slate-600"
          }`}
        >
          <div className="flex items-start gap-3">
            <p className="flex-1">{toast.message}</p>
            <button
              type="button"
              onClick={() =>
                setToasts((current) =>
                  current.filter((entry) => entry.id !== toast.id),
                )
              }
              className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-xs font-bold text-white transition hover:bg-white/40"
              aria-label="Dismiss notification"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>,
    document.body,
  );
}

export function showToast(detail: ToastEventDetail) {
  if (typeof window === "undefined") return;
  const event = new CustomEvent<ToastEventDetail>(TOAST_EVENT, {
    detail,
  });
  window.dispatchEvent(event);
}
