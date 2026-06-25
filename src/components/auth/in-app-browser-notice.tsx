"use client";

import { useState } from "react";
import { ExternalLink, X } from "lucide-react";
import { showToast } from "@/components/toaster";

type InAppBrowserNoticeCopy = {
  title: string;
  body: string;
  copyLink: string;
  copied: string;
  dismiss: string;
};

type InAppBrowserNoticeProps = {
  copy: InAppBrowserNoticeCopy;
};

const DISMISS_KEY = "rt-auth-in-app-browser-notice-dismissed";

function isInAppBrowser(userAgent: string) {
  return /FBAN|FBAV|FB_IAB|Instagram|Line\/|MicroMessenger/i.test(userAgent);
}

export function InAppBrowserNotice({ copy }: InAppBrowserNoticeProps) {
  const [visible, setVisible] = useState(() => {
    if (typeof window === "undefined") return false;
    if (window.sessionStorage.getItem(DISMISS_KEY) === "1") return false;
    return isInAppBrowser(window.navigator.userAgent);
  });

  if (!visible) return null;

  const handleDismiss = () => {
    window.sessionStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  };

  const handleCopy = async () => {
    const url = window.location.href;
    try {
      await window.navigator.clipboard.writeText(url);
      showToast({ variant: "success", message: copy.copied });
    } catch {
      showToast({ variant: "info", message: url });
    }
  };

  return (
    <div className="mb-5 rounded-3xl border border-amber-200 bg-amber-50/95 p-4 text-sm text-amber-950 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-amber-700">
          <ExternalLink className="h-4 w-4" strokeWidth={2} aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{copy.title}</p>
          <p className="mt-1 leading-6 text-amber-900/85">{copy.body}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="rounded-full bg-amber-950 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-900"
            >
              {copy.copyLink}
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="rounded-full border border-amber-300 bg-white px-4 py-2 text-xs font-semibold text-amber-950 hover:border-amber-400"
            >
              {copy.dismiss}
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="-mr-1 -mt-1 rounded-full p-2 text-amber-800 hover:bg-white"
          aria-label={copy.dismiss}
        >
          <X className="h-4 w-4" strokeWidth={2} aria-hidden />
        </button>
      </div>
    </div>
  );
}
