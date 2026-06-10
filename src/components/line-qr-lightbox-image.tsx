"use client";

import { useState } from "react";
import Image from "next/image";
import { ImageLightbox } from "@/components/image-lightbox";

type LineQrLightboxImageProps = {
  src: string;
  alt: string;
  className: string;
  sizes: string;
};

export function LineQrLightboxImage({
  src,
  alt,
  className,
  sizes,
}: LineQrLightboxImageProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`${className} block transition hover:border-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--rt-primary-rgb)/0.45)] focus-visible:ring-offset-2`}
      >
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          className="object-contain"
          unoptimized
        />
      </button>
      {open && (
        <ImageLightbox
          images={[{ id: "line-qr", src, alt }]}
          variant="compact"
          unoptimized
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
