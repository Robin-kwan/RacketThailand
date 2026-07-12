"use client";

import type { TouchEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

type ImageLightboxProps = {
  images: { id: string; src: string; alt?: string }[];
  initialIndex?: number;
  unoptimized?: boolean;
  variant?: "gallery" | "compact";
  onClose?: () => void;
};

export function ImageLightbox({
  images,
  initialIndex = 0,
  unoptimized = false,
  variant = "gallery",
  onClose,
}: ImageLightboxProps) {
  const [visible, setVisible] = useState(true);
  const [current, setCurrent] = useState(initialIndex);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const hasMultipleImages = images.length > 1;

  const handleClose = useCallback(() => {
    setVisible(false);
    onClose?.();
  }, [onClose]);

  const goNext = useCallback(() => {
    setCurrent((prev) => (prev + 1) % images.length);
  }, [images.length]);

  const goPrevious = useCallback(() => {
    setCurrent((prev) => (prev - 1 + images.length) % images.length);
  }, [images.length]);

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    if (!touch) return;
    touchStartX.current = touch.clientX;
    touchStartY.current = touch.clientY;
  };

  const handleTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    if (
      touchStartX.current === null ||
      touchStartY.current === null ||
      !hasMultipleImages
    ) {
      touchStartX.current = null;
      touchStartY.current = null;
      return;
    }

    const touch = event.changedTouches[0];
    if (!touch) return;

    const deltaX = touch.clientX - touchStartX.current;
    const deltaY = touch.clientY - touchStartY.current;
    const isHorizontalSwipe = Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY) * 1.3;

    if (isHorizontalSwipe) {
      if (deltaX < 0) {
        goNext();
      } else {
        goPrevious();
      }
    }

    touchStartX.current = null;
    touchStartY.current = null;
  };

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleClose();
      } else if (event.key === "ArrowRight" && hasMultipleImages) {
        goNext();
      } else if (event.key === "ArrowLeft" && hasMultipleImages) {
        goPrevious();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [goNext, goPrevious, handleClose, hasMultipleImages]);

  if (typeof document === "undefined" || !visible || images.length === 0) {
    return null;
  }

  const image = images[current];
  const imageSizes =
    variant === "compact"
      ? "(max-width: 640px) 82vw, 420px"
      : "(max-width: 1024px) calc(100vw - 2rem), 896px";

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[4000] flex items-center justify-center bg-black/80 px-4"
      onClick={handleClose}
    >
      <button
        type="button"
        aria-label="Close"
        onClick={handleClose}
        className="fixed right-5 top-5 z-[4100] flex h-11 w-11 items-center justify-center rounded-full border border-white/40 bg-black/65 text-white shadow-lg backdrop-blur hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
      >
        <X
          className="h-5 w-5"
          strokeWidth={2}
          aria-hidden
        />
      </button>
      <div
        className={
          variant === "compact"
            ? "relative aspect-square w-[min(82vw,420px)] rounded-lg bg-white p-4"
            : "relative h-[70vh] w-full max-w-4xl touch-pan-y"
        }
        onClick={(event) => event.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <Image
          src={image.src}
          alt={image.alt ?? "Court photo"}
          fill
          sizes={imageSizes}
          className={variant === "compact" ? "object-contain p-4" : "object-contain"}
          unoptimized={unoptimized}
        />
      </div>
      {hasMultipleImages ? (
        <>
          <button
            type="button"
            aria-label="Previous image"
            onClick={(event) => {
              event.stopPropagation();
              goPrevious();
            }}
            className="fixed left-3 top-1/2 z-[4100] flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/35 bg-black/55 text-white shadow-lg backdrop-blur transition hover:bg-black/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 md:left-6 md:h-12 md:w-12"
          >
            <ChevronLeft
              className="h-6 w-6"
              strokeWidth={2.2}
              aria-hidden
            />
          </button>
          <button
            type="button"
            aria-label="Next image"
            onClick={(event) => {
              event.stopPropagation();
              goNext();
            }}
            className="fixed right-3 top-1/2 z-[4100] flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/35 bg-black/55 text-white shadow-lg backdrop-blur transition hover:bg-black/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 md:right-6 md:h-12 md:w-12"
          >
            <ChevronRight
              className="h-6 w-6"
              strokeWidth={2.2}
              aria-hidden
            />
          </button>
          <div className="fixed bottom-5 left-1/2 z-[4100] -translate-x-1/2 rounded-full border border-white/25 bg-black/55 px-3 py-1.5 text-xs font-semibold text-white shadow-lg backdrop-blur">
            {current + 1} / {images.length}
          </div>
        </>
      ) : null}
    </div>,
    document.body,
  );
}
