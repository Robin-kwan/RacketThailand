"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";

type ImageLightboxProps = {
  images: { id: string; src: string; alt?: string }[];
  initialIndex?: number;
  onClose?: () => void;
};

export function ImageLightbox({
  images,
  initialIndex = 0,
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

  if (!visible || images.length === 0) {
    return null;
  }

  const image = images[current];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
      <button
        type="button"
        aria-label="Close"
        onClick={handleClose}
        className="absolute right-6 top-6 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-slate-900 hover:bg-white"
      >
        <X
          className="h-5 w-5"
          strokeWidth={2}
          aria-hidden
        />
      </button>
      <div className="relative h-[70vh] w-full max-w-4xl">
        <Image
          src={image.src}
          alt={image.alt ?? "Court photo"}
          fill
          sizes="100vw"
          className="object-contain"
        />
      </div>
    </div>
  );
}
