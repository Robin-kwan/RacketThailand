"use client";

import type { SyntheticEvent } from "react";
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

type ImagePresentation = "cover" | "contain";

function getPresentationFromSize(width: number, height: number): ImagePresentation {
  if (!width || !height) return "cover";

  const aspectRatio = width / height;
  const isSmallForHero = width < 900 || height < 420;
  const isAwkwardHeroCrop = aspectRatio < 1.25 || aspectRatio > 2.2;

  return isSmallForHero || isAwkwardHeroCrop ? "contain" : "cover";
}

export function CourtGallery({ gallery, courtName }: CourtGalleryProps) {
  const ordered = useMemo(() => {
    return gallery
      .slice()
      .sort((a, b) => Number(b.is_primary) - Number(a.is_primary));
  }, [gallery]);

  const [presentationById, setPresentationById] = useState<
    Record<string, ImagePresentation>
  >({});
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
  const primaryPresentation =
    presentationById[primaryImage.id] ?? "cover";
  const primaryImageClass =
    primaryPresentation === "contain"
      ? "object-contain"
      : "object-cover";
  const primaryFrameClass =
    primaryPresentation === "contain"
      ? "bg-[linear-gradient(135deg,#f8fafc_0%,#eef8f4_100%)]"
      : "bg-white";
  const handlePrimaryImageLoad = (event: SyntheticEvent<HTMLImageElement>) => {
    const image = event.currentTarget;
    const nextPresentation = getPresentationFromSize(
      image.naturalWidth,
      image.naturalHeight,
    );

    setPresentationById((current) =>
      current[primaryImage.id] === nextPresentation
        ? current
        : { ...current, [primaryImage.id]: nextPresentation },
    );
  };

  return (
    <>
      <section className="space-y-3">
        <div
          className={`overflow-hidden rounded-3xl border border-slate-200 ${primaryFrameClass}`}
        >
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
                sizes="(max-width: 768px) calc(100vw - 3rem), 944px"
                className={primaryImageClass}
                onLoad={handlePrimaryImageLoad}
              />
            </button>
          ) : (
            <div className="relative block h-[280px] w-full overflow-hidden md:h-[420px]">
              <Image
                src={primaryImage.image_url}
                alt={courtName ?? "Court photo"}
                fill
                sizes="(max-width: 768px) calc(100vw - 3rem), 944px"
                className={primaryImageClass}
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
