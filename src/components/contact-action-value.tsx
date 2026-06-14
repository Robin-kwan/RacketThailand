"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy, PhoneCall } from "lucide-react";
import { showToast } from "@/components/toaster";

type ContactActionValueProps = {
  mode: "phone" | "line" | "copy";
  value: string;
  copyLabel: string;
  copiedLabel: string;
  callLabel: string;
};

function normalizePhoneHref(value: string) {
  const normalized = value.replace(/[^\d+]/g, "");
  return `tel:${normalized || value}`;
}

function normalizeLineHref(value: string) {
  const normalized = value.trim();
  if (/^https?:\/\//i.test(normalized)) {
    return normalized;
  }
  if (normalized.startsWith("@")) {
    return `https://line.me/R/ti/p/${encodeURIComponent(normalized)}`;
  }
  return `https://line.me/ti/p/~${encodeURIComponent(normalized)}`;
}

export function ContactActionValue({
  mode,
  value,
  copyLabel,
  copiedLabel,
  callLabel,
}: ContactActionValueProps) {
  const [copied, setCopied] = useState(false);
  const copiedTimeoutRef = useRef<number | null>(null);
  const phoneHref = useMemo(() => normalizePhoneHref(value), [value]);
  const lineHref = useMemo(() => normalizeLineHref(value), [value]);

  useEffect(() => {
    return () => {
      if (copiedTimeoutRef.current !== null) {
        window.clearTimeout(copiedTimeoutRef.current);
      }
    };
  }, []);

  if (mode === "phone") {
    return (
      <div className="mt-1 flex flex-wrap items-center gap-3">
        <a
          href={phoneHref}
          title={value}
          className="max-w-full truncate text-base font-semibold text-[var(--foreground)] underline decoration-dotted underline-offset-4 sm:max-w-[20rem]"
        >
          {value}
        </a>
        <a
          href={phoneHref}
          className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 transition hover:border-emerald-300 hover:bg-emerald-100"
        >
          <PhoneCall
            className="h-3.5 w-3.5"
            aria-hidden
          />
          {callLabel}
        </a>
      </div>
    );
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      showToast({
        variant: "success",
        message: copiedLabel,
      });
      if (copiedTimeoutRef.current !== null) {
        window.clearTimeout(copiedTimeoutRef.current);
      }
      copiedTimeoutRef.current = window.setTimeout(() => {
        setCopied(false);
      }, 1600);
    } catch {
      // Ignore clipboard failures and leave the current value visible.
    }
  };

  return (
    <div className="mt-1 flex flex-wrap items-center gap-3">
      {mode === "line" ? (
        <a
          href={lineHref}
          target="_blank"
          rel="noreferrer"
          title={value}
          className="max-w-full truncate text-base font-semibold text-[var(--foreground)] underline decoration-dotted underline-offset-4 sm:max-w-[20rem]"
        >
          {value}
        </a>
      ) : (
        <p
          title={value}
          className="max-w-full truncate text-base font-semibold text-[var(--foreground)] sm:max-w-[20rem]"
        >
          {value}
        </p>
      )}
      <button
        type="button"
        onClick={handleCopy}
        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
        aria-label={copied ? copiedLabel : copyLabel}
      >
        {copied ? (
          <Check
            className="h-3.5 w-3.5"
            aria-hidden
          />
        ) : (
          <Copy
            className="h-3.5 w-3.5"
            aria-hidden
          />
        )}
        {copied ? copiedLabel : copyLabel}
      </button>
    </div>
  );
}
