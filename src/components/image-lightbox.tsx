"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

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

  const handleClose = useCallback(() => {
    setVisible(false);
    onClose?.();
  }, [onClose]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleClose();
      } else if (event.key === "ArrowRight") {
        setCurrent((prev) => (prev + 1) % images.length);
      } else if (event.key === "ArrowLeft") {
        setCurrent((prev) => (prev - 1 + images.length) % images.length);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [images.length, handleClose]);

  if (typeof document === "undefined" || !visible || images.length === 0) {
    return null;
  }

  const image = images[current];

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
            ? "relative aspect-square w-[min(82vw,420px)] rounded-3xl bg-white p-4"
            : "relative h-[70vh] w-full max-w-4xl"
        }
        onClick={(event) => event.stopPropagation()}
      >
        <Image
          src={image.src}
          alt={image.alt ?? "Court photo"}
          fill
          sizes="100vw"
          className={variant === "compact" ? "object-contain p-4" : "object-contain"}
          unoptimized={unoptimized}
        />
      </div>
    </div>,
    document.body,
  );
}
