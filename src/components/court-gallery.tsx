"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { ImageLightbox } from "./image-lightbox";

type GalleryImage = {
  id: string;
  image_url: string;
  is_primary?: boolean | null;
  allowFullscreen?: boolean;
};

type CourtGalleryProps = {
  gallery: GalleryImage[];
  courtName?: string | null;
};

export function CourtGallery({ gallery, courtName }: CourtGalleryProps) {
  const ordered = useMemo(() => {
    return gallery
      .slice()
      .sort((a, b) => Number(b.is_primary) - Number(a.is_primary));
  }, [gallery]);

  const [lightbox, setLightbox] = useState<{ open: boolean; index: number }>({
    open: false,
    index: 0,
  });

  if (ordered.length === 0) {
    return null;
  }

  const primaryImage = ordered[0];
  const thumbnails = ordered.slice(1);
  const primaryCanOpen = primaryImage.allowFullscreen !== false;

  return (
    <>
      <section className="space-y-3">
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
          {primaryCanOpen ? (
            <button
              type="button"
              onClick={() => setLightbox({ open: true, index: 0 })}
              className="relative block h-[280px] w-full overflow-hidden md:h-[420px]"
            >
              <Image
                src={primaryImage.image_url}
                alt={courtName ?? "Court photo"}
                fill
                sizes="(max-width:768px) 100vw, 80vw"
                className="object-cover"
              />
            </button>
          ) : (
            <div className="relative block h-[280px] w-full overflow-hidden md:h-[420px]">
              <Image
                src={primaryImage.image_url}
                alt={courtName ?? "Court photo"}
                fill
                sizes="(max-width:768px) 100vw, 80vw"
                className="object-cover"
              />
            </div>
          )}
        </div>
        {thumbnails.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {thumbnails.map((photo, index) => (
              photo.allowFullscreen !== false ? (
                <button
                  type="button"
                  key={photo.id}
                  onClick={() =>
                    setLightbox({
                      open: true,
                      index: index + 1,
                    })
                  }
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
                >
                  <div className="relative aspect-[4/3] w-full">
                    <Image
                      src={photo.image_url}
                      alt={courtName ?? "Court photo"}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      className="object-cover"
                    />
                  </div>
                </button>
              ) : (
                <div
                  key={photo.id}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
                >
                  <div className="relative aspect-[4/3] w-full">
                    <Image
                      src={photo.image_url}
                      alt={courtName ?? "Court photo"}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      className="object-cover"
                    />
                  </div>
                </div>
              )
            ))}
          </div>
        )}
      </section>
      {lightbox.open && (
        <ImageLightbox
          images={ordered.map((photo) => ({
            id: photo.id,
            src: photo.image_url,
            alt: courtName ?? "Court photo",
          }))}
          initialIndex={lightbox.index}
          onClose={() => setLightbox({ open: false, index: 0 })}
        />
      )}
    </>
  );
}
