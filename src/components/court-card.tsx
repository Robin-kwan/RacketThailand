"use client";

import Image from "next/image";
import Link from "next/link";
import type { ElementType, ReactNode } from "react";

type CourtCardProps = {
  name: string;
  href?: string | null;
  imageUrl: string;
  imageAlt?: string;
  location?: string | null;
  details?: string[];
  primaryBadge?: string | null;
  secondaryBadge?: string | null;
  className?: string;
  titleClassName?: string;
  imageAspectClass?: string;
  showDetails?: boolean;
  footer?: ReactNode;
};

export function CourtCard({
  name,
  href,
  imageUrl,
  imageAlt,
  location,
  details = [],
  primaryBadge,
  secondaryBadge,
  className,
  titleClassName,
  imageAspectClass = "aspect-[4/3]",
  showDetails = true,
  footer,
}: CourtCardProps) {
  const Wrapper: ElementType = href ? Link : "div";
  const wrapperProps = href ? { href } : {};

  return (
    <Wrapper
      {...wrapperProps}
      className={`group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-indigo-400 sm:rounded-3xl ${className ?? ""}`}
    >
      <div className="overflow-hidden border-b border-slate-100 bg-slate-100">
        <div className={`relative ${imageAspectClass} w-full`}>
          <Image
            src={imageUrl}
            alt={imageAlt ?? name ?? "Court image"}
            fill
            sizes="(max-width:768px) 100vw, 50vw"
            className="object-cover transition duration-300 group-hover:scale-105"
          />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1.5 px-3 py-2 sm:gap-2 sm:px-5 sm:py-3">
        <div className="space-y-0.5">
          <h3
            className={`line-clamp-2 text-sm font-medium text-slate-900 sm:text-xl ${titleClassName ?? ""}`}
          >
            {name || "Court"}
          </h3>
          {location ? (
            <p className="line-clamp-2 text-xs text-slate-600 sm:text-sm" title={location}>
              {location}
            </p>
          ) : null}
        </div>

        {showDetails && details.length > 0 && (
          <ul className="space-y-1 text-xs text-slate-600 sm:space-y-2 sm:text-sm">
            {details.map((detail, index) => (
              <li key={`${name}-detail-${index}`} className="line-clamp-2" title={detail}>
                {detail}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-auto flex flex-col gap-1.5 sm:gap-2">
          {(primaryBadge || secondaryBadge) && (
            <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-semibold uppercase text-slate-500 sm:gap-3 sm:text-xs">
              {primaryBadge && (
                <span className="inline-flex rounded-full bg-[rgb(var(--rt-primary-rgb)/0.08)] px-2 py-0.5 text-[var(--rt-primary)] sm:px-3 sm:py-1">
                  {primaryBadge}
                </span>
              )}
              {secondaryBadge && (
                <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 normal-case sm:px-3 sm:py-1 sm:text-[11px]">
                  {secondaryBadge}
                </span>
              )}
            </div>
          )}

          {footer}
        </div>
      </div>
    </Wrapper>
  );
}
