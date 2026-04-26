"use client";

import type { MouseEvent, ReactNode } from "react";
import Link, { type LinkProps } from "next/link";
import { track } from "@vercel/analytics";

type TrackedLinkProps = LinkProps & {
  eventName: string;
  eventPayload?: Record<string, string | number | boolean | null | undefined>;
  className?: string;
  children: ReactNode;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
};

export function TrackedLink({
  eventName,
  eventPayload,
  onClick,
  children,
  ...props
}: TrackedLinkProps) {
  return (
    <Link
      {...props}
      onClick={(event) => {
        track(eventName, eventPayload);
        onClick?.(event);
      }}
    >
      {children}
    </Link>
  );
}
