"use client";

import { ReactNode } from "react";

type BaseImageCardProps = {
  imageUrl?: string | null;
  alt?: string;
  onRemove?: () => void;
  disabled?: boolean;
  footer?: ReactNode;
  emptyLabel?: string;
  heightClass?: string;
};

export function BaseImageCard({
  imageUrl,
  alt = "Image preview",
  onRemove,
  disabled = false,
  footer,
  emptyLabel = "No image",
  heightClass = "h-32",
}: BaseImageCardProps) {
  return (
    <div
      className={`${heightClass} relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-100`}
    >
      {onRemove && (
        <button
          type="button"
          disabled={disabled}
          onClick={onRemove}
          className="absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-sm font-bold text-slate-600 shadow transition hover:bg-slate-200 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
        >
          ×
        </button>
      )}
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt={alt}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full items-center justify-center text-sm text-slate-500">
          {emptyLabel}
        </div>
      )}
      {footer && (
        <div className="absolute inset-x-0 bottom-0 bg-slate-900/70 px-3 py-2 text-xs text-white">
          {footer}
        </div>
      )}
    </div>
  );
}
