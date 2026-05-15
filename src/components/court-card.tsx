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
      className={`group flex h-full flex-col gap-3 rounded-3xl border border-slate-200 bg-white px-5 py-6 transition hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-indigo-400 ${className ?? ""}`}
    >
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-slate-100">
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

      <div className="space-y-1">
        <h3
          className={`text-xl font-semibold text-slate-900 ${titleClassName ?? ""}`}
        >
          {name || "Court"}
        </h3>
        {location ? (
          <p className="text-sm text-slate-600 line-clamp-2" title={location}>
            {location}
          </p>
        ) : null}
      </div>

      {showDetails && details.length > 0 && (
        <ul className="space-y-2 text-sm text-slate-600">
          {details.map((detail, index) => (
            <li key={`${name}-detail-${index}`} className="line-clamp-2" title={detail}>
              {detail}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-auto flex flex-col gap-3">
        {(primaryBadge || secondaryBadge) && (
          <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase text-slate-500">
            {primaryBadge && (
              <span className="inline-flex rounded-full bg-[rgb(var(--rt-primary-rgb)/0.08)] px-3 py-1 text-[var(--rt-primary)]">
                {primaryBadge}
              </span>
            )}
            {secondaryBadge && (
              <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700 normal-case">
                {secondaryBadge}
              </span>
            )}
          </div>
        )}

        {footer}
      </div>
    </Wrapper>
  );
}
