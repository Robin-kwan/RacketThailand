export const PHOTO_UPLOAD_ACCEPT = "image/jpeg,image/png,image/webp";
export const PHOTO_ORIGINAL_MAX_MB = 20;
export const PHOTO_OUTPUT_MAX_MB = 3;
export const PHOTO_MAX_DIMENSION = 1800;
export const PHOTO_OUTPUT_QUALITY = 0.82;

export const LINE_QR_UPLOAD_ACCEPT = "image/jpeg,image/png,image/webp";
export const LINE_QR_MAX_MB = 2;

const PHOTO_SUPPORTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MB = 1024 * 1024;

type ImageSize = {
  width: number;
  height: number;
};

type OptimizePhotoOptions = {
  maxOriginalMB?: number;
  maxOutputMB?: number;
  maxDimension?: number;
  quality?: number;
};

function megabytes(value: number) {
  return value * MB;
}

export function formatFileSize(bytes: number) {
  if (bytes < MB) {
    return `${Math.max(1, Math.round(bytes / 1024))}KB`;
  }
  return `${(bytes / MB).toFixed(bytes >= 10 * MB ? 0 : 1)}MB`;
}

export function validatePhotoSource(file: File, maxOriginalMB = PHOTO_ORIGINAL_MAX_MB) {
  if (!PHOTO_SUPPORTED_TYPES.has(file.type)) {
    return "Use a JPG, PNG, or WebP image.";
  }
  if (file.size > megabytes(maxOriginalMB)) {
    return `Use an image under ${maxOriginalMB}MB.`;
  }
  return null;
}

export function validateOptimizedPhotoFile(file: File) {
  if (!PHOTO_SUPPORTED_TYPES.has(file.type)) {
    return "Use a JPG, PNG, or WebP image.";
  }
  if (file.size > megabytes(PHOTO_OUTPUT_MAX_MB)) {
    return `Photo must be under ${PHOTO_OUTPUT_MAX_MB}MB after resizing.`;
  }
  return null;
}

export function validateLineQrFile(file: File) {
  if (!PHOTO_SUPPORTED_TYPES.has(file.type)) {
    return "Use a JPG, PNG, or WebP image.";
  }
  if (file.size > megabytes(LINE_QR_MAX_MB)) {
    return `LINE QR image must be under ${LINE_QR_MAX_MB}MB.`;
  }
  return null;
}

function replaceExtension(filename: string, extension: string) {
  const trimmed = filename.trim() || "image";
  return /\.[^.]+$/.test(trimmed)
    ? trimmed.replace(/\.[^.]+$/, extension)
    : `${trimmed}${extension}`;
}

async function loadImageSize(file: File): Promise<ImageSize> {
  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(file);
    const size = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return size;
  }

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image dimensions."));
    };
    image.src = url;
  });
}

async function drawImageToCanvas(
  file: File,
  targetWidth: number,
  targetHeight: number,
) {
  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Could not prepare image canvas.");
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, targetWidth, targetHeight);

  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(file);
    context.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
    bitmap.close();
    return canvas;
  }

  await new Promise<void>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      context.drawImage(image, 0, 0, targetWidth, targetHeight);
      URL.revokeObjectURL(url);
      resolve();
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image."));
    };
    image.src = url;
  });

  return canvas;
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Could not optimize image."));
          return;
        }
        resolve(blob);
      },
      type,
      quality,
    );
  });
}

export async function optimizePhotoFile(
  file: File,
  options: OptimizePhotoOptions = {},
) {
  const maxOriginalMB = options.maxOriginalMB ?? PHOTO_ORIGINAL_MAX_MB;
  const maxOutputMB = options.maxOutputMB ?? PHOTO_OUTPUT_MAX_MB;
  const maxDimension = options.maxDimension ?? PHOTO_MAX_DIMENSION;
  const quality = options.quality ?? PHOTO_OUTPUT_QUALITY;
  const sourceError = validatePhotoSource(file, maxOriginalMB);
  if (sourceError) {
    throw new Error(sourceError);
  }

  const maxOutputBytes = megabytes(maxOutputMB);
  const size = await loadImageSize(file);
  const scale = Math.min(1, maxDimension / Math.max(size.width, size.height));
  const targetWidth = Math.max(1, Math.round(size.width * scale));
  const targetHeight = Math.max(1, Math.round(size.height * scale));

  if (
    file.size <= maxOutputBytes &&
    scale === 1 &&
    PHOTO_SUPPORTED_TYPES.has(file.type)
  ) {
    return file;
  }

  const canvas = await drawImageToCanvas(file, targetWidth, targetHeight);
  const qualities = [quality, 0.76, 0.7, 0.64];
  let bestBlob: Blob | null = null;

  for (const nextQuality of qualities) {
    const blob = await canvasToBlob(canvas, "image/jpeg", nextQuality);
    bestBlob = blob;
    if (blob.size <= maxOutputBytes) {
      return new File([blob], replaceExtension(file.name, ".jpg"), {
        type: "image/jpeg",
        lastModified: Date.now(),
      });
    }
  }

  throw new Error(
    `Image is still ${formatFileSize(bestBlob?.size ?? file.size)} after resizing. Use a smaller photo.`,
  );
}
