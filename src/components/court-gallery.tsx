"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { ImageLightbox } from "./image-lightbox";

type GalleryImage = {
  id: string;
  image_url: string;
  is_primary?: boolean | null;
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

  return (
    <>
      <section className="space-y-3">
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
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
        </div>
        {thumbnails.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {thumbnails.map((photo, index) => (
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
                <div className="relative h-24 w-32 md:h-28 md:w-40">
                  <Image
                    src={photo.image_url}
                    alt={courtName ?? "Court photo"}
                    fill
                    sizes="200px"
                    className="object-cover"
                  />
                </div>
              </button>
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
