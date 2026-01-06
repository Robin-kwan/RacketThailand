"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type LineQrUploaderProps = {
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
}: LineQrUploaderProps) {
  const isControlled = typeof controlledPreview !== "undefined";
  const [localPreview, setLocalPreview] = useState<string | null>(
    isControlled ? null : controlledPreview ?? null,
  );
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
    const nextPreview = URL.createObjectURL(file);
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
    onChange(null, null);
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-slate-100">
        {label}
      </label>
      {helperText && <p className="text-xs text-slate-400">{helperText}</p>}
      <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/60 p-4">
        {preview ? (
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <div className="relative h-32 w-32 overflow-hidden rounded-2xl border border-slate-700 bg-slate-950">
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
              <label className="inline-flex cursor-pointer items-center justify-center rounded-full border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-100 hover:border-slate-400">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                  disabled={disabled}
                />
                Replace image
              </label>
              <button
                type="button"
                onClick={handleRemove}
                disabled={disabled}
                className="text-xs font-semibold text-rose-300 hover:text-rose-200"
              >
                Remove QR code
              </button>
            </div>
          </div>
        ) : (
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900/40 px-4 py-6 text-center text-sm font-semibold text-slate-100 hover:border-slate-500">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
              disabled={disabled}
            />
            <span>Upload LINE QR image</span>
            <p className="text-xs font-normal text-slate-400">
              PNG, JPG, or WebP
            </p>
          </label>
        )}
      </div>
    </div>
  );
}
