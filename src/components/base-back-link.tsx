"use client";

import Link, { type LinkProps } from "next/link";

type BaseBackLinkProps = LinkProps & {
  children: React.ReactNode;
  className?: string;
};

export function BaseBackLink({
  children,
  className,
  ...props
}: BaseBackLinkProps) {
  const baseClass =
    "inline-flex w-fit items-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-[var(--foreground)] transition-colors hover:border-slate-500";
  const computedClass = className
    ? `${baseClass} ${className}`.trim()
    : baseClass;

  return (
    <Link {...props} className={computedClass}>
      <span aria-hidden>←</span>
      {children}
    </Link>
  );
}
