"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import {
  LINE_QR_UPLOAD_ACCEPT,
  validateLineQrFile,
} from "@/lib/image-upload";

export type LineQrUploaderCopy = {
  replaceLabel?: string;
  removeLabel?: string;
  uploadLabel?: string;
  formatHint?: string;
};

type LineQrUploaderProps = LineQrUploaderCopy & {
  label: string;
  previewUrl?: string | null;
  onChange: (file: File | null, previewUrl: string | null) => void;
  disabled?: boolean;
  helperText?: string;
};

export function LineQrUploader({
  label,
  previewUrl: controlledPreview,
  onChange,
  disabled = false,
  helperText,
  replaceLabel = "Replace image",
  removeLabel = "Remove QR code",
  uploadLabel = "Upload LINE QR image",
  formatHint = "PNG, JPG, or WebP",
}: LineQrUploaderProps) {
  const isControlled = typeof controlledPreview !== "undefined";
  const [localPreview, setLocalPreview] = useState<string | null>(
    isControlled ? null : controlledPreview ?? null,
  );
  const [error, setError] = useState<string | null>(null);
  const preview = isControlled ? controlledPreview : localPreview;

  useEffect(() => {
    if (isControlled) return;
    return () => {
      if (localPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(localPreview);
      }
    };
  }, [isControlled, localPreview]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const validationError = validateLineQrFile(file);
    if (validationError) {
      setError(validationError);
      event.target.value = "";
      return;
    }
    const nextPreview = URL.createObjectURL(file);
    setError(null);
    if (!isControlled) {
      if (localPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(localPreview);
      }
      setLocalPreview(nextPreview);
    }
    onChange(file, nextPreview);
    event.target.value = "";
  };

  const handleRemove = () => {
    if (!isControlled && localPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(localPreview);
    }
    if (!isControlled) {
      setLocalPreview(null);
    }
    setError(null);
    onChange(null, null);
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-[var(--foreground)]">
        {label}
      </label>
      {helperText && (
        <p className="text-xs text-[rgb(var(--foreground-rgb)/0.6)]">
          {helperText}
        </p>
      )}
      {error && <p className="text-xs text-rose-500">{error}</p>}
      <div className="rounded-2xl border border-dashed border-[rgb(var(--foreground-rgb)/0.2)] bg-[rgb(var(--foreground-rgb)/0.05)] p-4">
        {preview ? (
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <div className="relative h-32 w-32 overflow-hidden rounded-2xl border border-[rgb(var(--foreground-rgb)/0.2)] bg-white">
              <Image
                src={preview}
                alt="LINE QR"
                fill
                sizes="128px"
                className="object-contain"
                unoptimized
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="inline-flex cursor-pointer items-center justify-center rounded-full border border-[rgb(var(--foreground-rgb)/0.2)] bg-white px-4 py-2 text-sm font-semibold text-[var(--foreground)] hover:border-[rgb(var(--foreground-rgb)/0.4)]">
                <input
                  type="file"
                  accept={LINE_QR_UPLOAD_ACCEPT}
                  className="hidden"
                  onChange={handleFileChange}
                  disabled={disabled}
                />
                {replaceLabel}
              </label>
              <button
                type="button"
                onClick={handleRemove}
                disabled={disabled}
                className="text-xs font-semibold text-rose-500 hover:text-rose-400"
              >
                {removeLabel}
              </button>
            </div>
          </div>
        ) : (
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border border-[rgb(var(--foreground-rgb)/0.2)] bg-white px-4 py-6 text-center text-sm font-semibold text-[var(--foreground)] hover:border-[rgb(var(--foreground-rgb)/0.4)]">
            <input
              type="file"
              accept={LINE_QR_UPLOAD_ACCEPT}
              className="hidden"
              onChange={handleFileChange}
              disabled={disabled}
            />
            <span>{uploadLabel}</span>
            <p className="text-xs font-normal text-[rgb(var(--foreground-rgb)/0.6)]">
              {formatHint}
            </p>
          </label>
        )}
      </div>
    </div>
  );
}
