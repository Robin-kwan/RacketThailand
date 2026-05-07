"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

type ToastVariant = "success" | "error" | "info";

type NotificationModal = {
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
  const [notification, setNotification] = useState<NotificationModal | null>(
    null,
  );

  useEffect(() => {
    let counter = 0;
    const handleToast = (event: Event) => {
      const detail = (event as CustomEvent<ToastEventDetail>).detail;
      if (!detail) return;
      counter += 1;
      const id = counter;
      setNotification({ id, variant: detail.variant, message: detail.message });
    };
    window.addEventListener(TOAST_EVENT, handleToast);
    return () => {
      window.removeEventListener(TOAST_EVENT, handleToast);
    };
  }, []);

  useEffect(() => {
    if (!notification || notification.variant === "error") return;
    const timer = window.setTimeout(() => {
      setNotification((current) =>
        current?.id === notification.id ? null : current,
      );
    }, notification.variant === "success" ? 2800 : 4000);
    return () => window.clearTimeout(timer);
  }, [notification]);

  useEffect(() => {
    if (!notification) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setNotification(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [notification]);

  if (typeof document === "undefined") return null;
  if (!notification) return null;

  const variantCopy = {
    success: {
      title: "Success",
      accent: "text-emerald-600",
      ring: "bg-emerald-50 ring-emerald-100",
      button:
        "bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:outline-emerald-600",
    },
    error: {
      title: "Error",
      accent: "text-rose-600",
      ring: "bg-rose-50 ring-rose-100",
      button:
        "bg-rose-600 text-white hover:bg-rose-700 focus-visible:outline-rose-600",
    },
    info: {
      title: "Notice",
      accent: "text-slate-600",
      ring: "bg-slate-50 ring-slate-100",
      button:
        "bg-slate-700 text-white hover:bg-slate-800 focus-visible:outline-slate-700",
    },
  }[notification.variant];

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/45 px-4 py-8 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          setNotification(null);
        }
      }}
    >
      <div
        key={notification.id}
        role="dialog"
        aria-modal="true"
        aria-labelledby="notification-modal-title"
        aria-describedby="notification-modal-message"
        className="rt-notification-modal relative w-full max-w-sm rounded-[28px] border border-white/80 bg-white px-6 pb-6 pt-7 text-center text-slate-900 shadow-[0_24px_80px_rgb(15_23_42/0.28)]"
      >
        <button
          type="button"
          onClick={() => setNotification(null)}
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-800"
          aria-label="Dismiss notification"
        >
          <X
            className="h-4 w-4"
            strokeWidth={2}
            aria-hidden
          />
        </button>
        <div
          className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full ring-8 ${variantCopy.ring}`}
        >
          <NotificationIcon
            variant={notification.variant}
            className={`h-14 w-14 ${variantCopy.accent}`}
          />
        </div>
        <h2
          id="notification-modal-title"
          className="mt-6 text-xl font-semibold text-slate-950"
        >
          {variantCopy.title}
        </h2>
        <p
          id="notification-modal-message"
          className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-600"
        >
          {notification.message}
        </p>
        <button
          type="button"
          onClick={() => setNotification(null)}
          className={`mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-full px-5 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${variantCopy.button}`}
        >
          OK
        </button>
      </div>
    </div>,
    document.body,
  );
}

function NotificationIcon({
  variant,
  className,
}: {
  variant: ToastVariant;
  className: string;
}) {
  if (variant === "success") {
    return (
      <svg
        viewBox="0 0 64 64"
        className={className}
        fill="none"
        aria-hidden
      >
        <circle
          className="rt-notification-circle"
          cx="32"
          cy="32"
          r="25"
          stroke="currentColor"
          strokeWidth="5"
        />
        <path
          className="rt-notification-check"
          d="M20 33.5 28.2 41 45 24"
          stroke="currentColor"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (variant === "error") {
    return (
      <svg
        viewBox="0 0 64 64"
        className={className}
        fill="none"
        aria-hidden
      >
        <circle
          className="rt-notification-circle"
          cx="32"
          cy="32"
          r="25"
          stroke="currentColor"
          strokeWidth="5"
        />
        <path
          className="rt-notification-error-line rt-notification-error-line-a"
          d="M23 23 41 41"
          stroke="currentColor"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <path
          className="rt-notification-error-line rt-notification-error-line-b"
          d="M41 23 23 41"
          stroke="currentColor"
          strokeWidth="5"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      fill="none"
      aria-hidden
    >
      <circle
        className="rt-notification-circle"
        cx="32"
        cy="32"
        r="25"
        stroke="currentColor"
        strokeWidth="5"
      />
      <path
        className="rt-notification-check"
        d="M32 30V45"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        className="rt-notification-dot"
        d="M32 19h.01"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function showToast(detail: ToastEventDetail) {
  if (typeof window === "undefined") return;
  const event = new CustomEvent<ToastEventDetail>(TOAST_EVENT, {
    detail,
  });
  window.dispatchEvent(event);
}
