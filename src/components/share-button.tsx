"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Share2 } from "lucide-react";
import { showToast } from "@/components/toaster";

type ShareButtonProps = {
  title: string;
  text?: string | null;
  url: string;
  label: string;
  copiedLabel: string;
  className?: string;
};

export function ShareButton({
  title,
  text,
  url,
  label,
  copiedLabel,
  className,
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const copiedTimeoutRef = useRef<number | null>(null);
  const baseClass =
    "inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-500";
  const computedClass = className
    ? `${baseClass} ${className}`.trim()
    : baseClass;

  useEffect(() => {
    return () => {
      if (copiedTimeoutRef.current !== null) {
        window.clearTimeout(copiedTimeoutRef.current);
      }
    };
  }, []);

  const markCopied = () => {
    setCopied(true);
    showToast({ variant: "success", message: copiedLabel });
    if (copiedTimeoutRef.current !== null) {
      window.clearTimeout(copiedTimeoutRef.current);
    }
    copiedTimeoutRef.current = window.setTimeout(() => {
      setCopied(false);
    }, 1600);
  };

  const handleShare = async () => {
    const shareData = {
      title,
      text: text || undefined,
      url,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }
      await navigator.clipboard.writeText(url);
      markCopied();
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
      try {
        await navigator.clipboard.writeText(url);
        markCopied();
      } catch {
        // Leave the button unchanged when sharing and clipboard access fail.
      }
    }
  };

  return (
    <button
      type="button"
      onClick={handleShare}
      className={computedClass}
      aria-label={copied ? copiedLabel : label}
    >
      {copied ? (
        <Check className="h-4 w-4" aria-hidden />
      ) : (
        <Share2 className="h-4 w-4" aria-hidden />
      )}
      {copied ? copiedLabel : label}
    </button>
  );
}
