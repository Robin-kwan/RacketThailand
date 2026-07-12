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

function isTallImage(width: number, height: number) {
  return Boolean(width && height && width / height < 0.9);
}

export function CourtGallery({
  gallery,
  courtName,
}: CourtGalleryProps) {
  const ordered = useMemo(() => {
    return gallery
      .slice()
      .sort((a, b) => Number(b.is_primary) - Number(a.is_primary));
  }, [gallery]);

  const [presentationById, setPresentationById] = useState<
    Record<string, ImagePresentation>
  >({});
  const [tallImageById, setTallImageById] = useState<Record<string, boolean>>(
    {},
  );
  const [aspectRatioById, setAspectRatioById] = useState<
    Record<string, number>
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
  const primaryPresentation = primaryImage.allowFullscreen === false
    ? "cover"
    : (presentationById[primaryImage.id] ?? "cover");
  const primaryImageClass =
    primaryPresentation === "contain"
      ? "object-contain"
      : "object-cover";
  const primaryIsTall =
    primaryCanOpen && (tallImageById[primaryImage.id] ?? false);
  const primaryAspectRatio = aspectRatioById[primaryImage.id] ?? null;
  const useNaturalWideAspect =
    primaryPresentation === "contain" &&
    !primaryIsTall &&
    primaryAspectRatio !== null &&
    primaryAspectRatio >= 1.5;
  const useConstrainedImageStage =
    primaryPresentation === "contain" &&
    primaryAspectRatio !== null &&
    primaryAspectRatio < 1.5;
  const primaryHeightClass = useConstrainedImageStage
    ? "aspect-square"
    : useNaturalWideAspect
      ? "aspect-[2/1]"
      : "h-[280px] md:h-[420px]";
  const primaryMediaStyle =
    (useNaturalWideAspect || useConstrainedImageStage) && primaryAspectRatio
    ? { aspectRatio: primaryAspectRatio }
    : undefined;
  const constrainedMaxWidth = primaryAspectRatio
    ? Math.round(Math.min(640, 760 * primaryAspectRatio))
    : undefined;
  const primaryFrameClass = useConstrainedImageStage
    ? "mx-auto w-full"
    : `overflow-hidden rounded-lg border border-slate-200 shadow-sm ${
        primaryPresentation === "contain"
          ? "bg-[linear-gradient(135deg,#f8fafc_0%,#eef8f4_100%)]"
          : "bg-white"
      }`;
  const primaryFrameStyle = useConstrainedImageStage && constrainedMaxWidth
    ? { maxWidth: `${constrainedMaxWidth}px` }
    : undefined;
  const primaryMediaClass = `${
    useConstrainedImageStage ? "rounded-lg shadow-sm" : ""
  } relative block w-full overflow-hidden ${primaryHeightClass}`;
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
    setTallImageById((current) => {
      const nextTall = isTallImage(image.naturalWidth, image.naturalHeight);
      return current[primaryImage.id] === nextTall
        ? current
        : { ...current, [primaryImage.id]: nextTall };
    });
    setAspectRatioById((current) => {
      const nextAspectRatio = image.naturalWidth / image.naturalHeight;
      return current[primaryImage.id] === nextAspectRatio
        ? current
        : { ...current, [primaryImage.id]: nextAspectRatio };
    });
  };

  return (
    <>
      <section className="space-y-3">
        <div
          className={primaryFrameClass}
          style={primaryFrameStyle}
        >
          {primaryCanOpen ? (
            <button
              type="button"
              onClick={() => setLightbox({ open: true, index: 0 })}
              className={primaryMediaClass}
              style={primaryMediaStyle}
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
            <div
              className={primaryMediaClass}
              style={primaryMediaStyle}
            >
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
                  className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
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
                  className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
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
