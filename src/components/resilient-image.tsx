"use client";

import { createElement, useState } from "react";
import Image, { type ImageProps } from "next/image";

/** Keep uploaded photos visible when the image optimization service is unavailable. */
export function ResilientImage({
  src,
  unoptimized = false,
  onError,
  ...props
}: ImageProps) {
  const source =
    typeof src === "string" ? src : "default" in src ? src.default.src : src.src;
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const useOriginal = unoptimized || failedSource === source;

  return createElement(Image, {
    ...props,
    src,
    unoptimized: useOriginal,
    onError: (event) => {
      // Retry the original once; a missing original must not cause a retry loop.
      if (!useOriginal) setFailedSource(source);
      onError?.(event);
    },
  });
}
