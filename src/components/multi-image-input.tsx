"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { BaseImageCard } from "@/components/base-image-card";
import {
  PHOTO_ORIGINAL_MAX_MB,
  PHOTO_UPLOAD_ACCEPT,
  optimizePhotoFile,
} from "@/lib/image-upload";

type MultiImageInputProps = {
  label: string;
  limit?: number;
  accept?: string;
  maxSizeMB?: number;
  removable?: boolean;
  value?: File[];
  cardHeightClass?: string;
  variant?: "light" | "dark";
  primaryLabel: string;
  makePrimaryLabel: string;
  helperText: string;
  processErrorLabel: string;
  onChange(images: File[]): void;
};

const VARIANT_CLASSNAMES = {
  dark: {
    label: "text-slate-100",
    error: "text-rose-400",
    addButton:
      "border-slate-700 bg-slate-900/40 text-slate-300 hover:border-slate-500 hover:text-white",
    helper: "text-slate-500",
  },
  light: {
    label: "text-[var(--foreground)]",
    error: "text-rose-500",
    addButton:
      "border-slate-200 bg-[rgb(var(--foreground-rgb)/0.05)] text-[rgb(var(--foreground-rgb)/0.45)] hover:border-slate-400 hover:text-[var(--foreground)]",
    helper: "text-[rgb(var(--foreground-rgb)/0.6)]",
  },
};

export function MultiImageInput({
  label,
  limit = 8,
  accept = PHOTO_UPLOAD_ACCEPT,
  maxSizeMB = PHOTO_ORIGINAL_MAX_MB,
  removable = true,
  value,
  cardHeightClass = "h-40",
  variant = "light",
  primaryLabel,
  makePrimaryLabel,
  helperText,
  processErrorLabel,
  onChange,
}: MultiImageInputProps) {
  const [internalFiles, setInternalFiles] = useState<File[]>([]);
  const files = value ?? internalFiles;
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const fileId = (file: File) => `${file.name}-${file.lastModified}`;

  const previews = useMemo(
    () =>
      files.map((file, index) => ({
        id: fileId(file),
        url: URL.createObjectURL(file),
        name: file.name,
        isPrimary: index === 0,
      })),
    [files],
  );

  useEffect(
    () => () => {
      previews.forEach((preview) => URL.revokeObjectURL(preview.url));
    },
    [previews],
  );

  const updateFiles = (next: File[]) => {
    if (value !== undefined) {
      onChange(next);
    } else {
      setInternalFiles(next);
      onChange(next);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const incoming = Array.from(event.target.files ?? []);
    if (incoming.length === 0) return;
    const availableSlots = Math.max(limit - files.length, 0);
    if (availableSlots === 0) {
      event.target.value = "";
      return;
    }

    setProcessing(true);
    const optimizedFiles: File[] = [];
    const errors: string[] = [];

    for (const file of incoming.slice(0, availableSlots)) {
      try {
        optimizedFiles.push(
          await optimizePhotoFile(file, { maxOriginalMB: maxSizeMB }),
        );
      } catch (error) {
        errors.push(error instanceof Error ? error.message : processErrorLabel);
      }
    }

    setError(errors[0] ?? null);
    if (optimizedFiles.length > 0) {
      updateFiles([...files, ...optimizedFiles]);
    }
    setProcessing(false);
    if (event.target.value) {
      event.target.value = "";
    }
  };

  const handleAddClick = () => {
    inputRef.current?.click();
  };

  const handleRemove = (id: string) => {
    const remaining = files.filter((file) => fileId(file) !== id);
    updateFiles(remaining);
  };

  const handleSetPrimary = (id: string) => {
    const index = files.findIndex((file) => fileId(file) === id);
    if (index <= 0) return;
    const selected = files[index];
    const others = files.filter((_, idx) => idx !== index);
    updateFiles([selected, ...others]);
  };

  const styles = VARIANT_CLASSNAMES[variant] ?? VARIANT_CLASSNAMES.light;

  return (
    <div className="space-y-3">
      <label className={`text-sm font-semibold ${styles.label}`}>{label}</label>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={accept}
        className="hidden"
        onChange={handleFileChange}
      />
      {error && <p className={`text-xs ${styles.error}`}>{error}</p>}
      <p className={`text-xs ${styles.helper}`}>
        {helperText}
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {previews.map((preview) => (
          <BaseImageCard
            key={preview.id}
            imageUrl={preview.url}
            alt={preview.name}
            onRemove={
              removable ? () => handleRemove(preview.id) : undefined
            }
            heightClass={cardHeightClass}
            variant={variant}
            footer={
              removable && (
                <button
                  type="button"
                  onClick={() => handleSetPrimary(preview.id)}
                  className={`font-semibold ${
                    preview.isPrimary
                      ? "text-emerald-300"
                      : "text-slate-100"
                  }`}
                  disabled={preview.isPrimary}
                >
                  {preview.isPrimary ? primaryLabel : makePrimaryLabel}
                </button>
              )
            }
          />
        ))}
        {files.length < limit && (
          <button
            type="button"
            onClick={handleAddClick}
            disabled={processing}
            className={`flex ${cardHeightClass} items-center justify-center rounded-2xl border border-dashed text-3xl disabled:cursor-wait disabled:opacity-60 ${styles.addButton}`}
          >
            {processing ? "..." : "+"}
          </button>
        )}
      </div>
    </div>
  );
}
