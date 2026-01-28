"use client";

import { ReactNode } from "react";

type BaseImageCardVariant = "light" | "dark";

type BaseImageCardProps = {
  imageUrl?: string | null;
  alt?: string;
  onRemove?: () => void;
  disabled?: boolean;
  footer?: ReactNode;
  emptyLabel?: string;
  heightClass?: string;
  variant?: BaseImageCardVariant;
};

const VARIANT_CLASSNAMES: Record<
  BaseImageCardVariant,
  {
    container: string;
    remove: string;
    footer: string;
    placeholder: string;
  }
> = {
  dark: {
    container: "border-slate-700 bg-slate-900/60",
    remove:
      "bg-[rgb(var(--rt-primary-soft-rgb)/0.8)] text-[var(--rt-primary-text)] hover:bg-[rgb(var(--rt-primary-rgb)/0.85)] hover:text-white",
    footer: "bg-black/60 text-white",
    placeholder: "text-slate-400",
  },
  light: {
    container: "border-slate-200 bg-white shadow-sm",
    remove:
      "bg-white/90 text-[var(--foreground)] border border-slate-200 hover:border-slate-400 hover:text-[var(--foreground)]",
    footer: "bg-[rgb(var(--foreground-rgb)/0.08)] text-[var(--foreground)]",
    placeholder: "text-[rgb(var(--foreground-rgb)/0.55)]",
  },
};

export function BaseImageCard({
  imageUrl,
  alt = "Image preview",
  onRemove,
  disabled = false,
  footer,
  emptyLabel = "No image",
  heightClass = "h-32",
  variant = "dark",
}: BaseImageCardProps) {
  const styles = VARIANT_CLASSNAMES[variant] ?? VARIANT_CLASSNAMES.dark;
  return (
    <div
      className={`${heightClass} relative overflow-hidden rounded-2xl border ${styles.container}`}
    >
      {onRemove && (
        <button
          type="button"
          disabled={disabled}
          onClick={onRemove}
          className={`absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${styles.remove}`}
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
        <div className={`flex h-full items-center justify-center text-sm ${styles.placeholder}`}>
          {emptyLabel}
        </div>
      )}
      {footer && (
        <div className={`absolute inset-x-0 bottom-0 px-3 py-2 text-xs ${styles.footer}`}>
          {footer}
        </div>
      )}
    </div>
  );
}
