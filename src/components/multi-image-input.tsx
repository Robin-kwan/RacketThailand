"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { BaseImageCard } from "@/components/base-image-card";

type MultiImageInputProps = {
  label: string;
  limit?: number;
  accept?: string;
  maxSizeMB?: number;
  removable?: boolean;
  value?: File[];
  cardHeightClass?: string;
  onChange(images: File[]): void;
};

export function MultiImageInput({
  label,
  limit = 8,
  accept = "image/png,image/jpeg,image/webp",
  maxSizeMB = 2,
  removable = true,
  value,
  cardHeightClass = "h-40",
  onChange,
}: MultiImageInputProps) {
  const [internalFiles, setInternalFiles] = useState<File[]>([]);
  const files = value ?? internalFiles;
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const incoming = Array.from(event.target.files ?? []);
    if (incoming.length === 0) return;
    const availableSlots = Math.max(limit - files.length, 0);
    const maxBytes = maxSizeMB * 1024 * 1024;
    const validFiles = incoming.filter((file) => file.size <= maxBytes);
    if (validFiles.length !== incoming.length) {
      setError(`Each image must be under ${maxSizeMB}MB.`);
    } else {
      setError(null);
    }
    const merged = [...files, ...validFiles.slice(0, availableSlots)];
    updateFiles(merged);
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

  return (
    <div className="space-y-3">
      <label className="text-sm font-semibold text-slate-100">{label}</label>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={accept}
        className="hidden"
        onChange={handleFileChange}
      />
      {error && <p className="text-xs text-rose-400">{error}</p>}
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
            footer={
              removable && (
                <button
                  type="button"
                  onClick={() => handleSetPrimary(preview.id)}
                  className={`font-semibold ${preview.isPrimary ? "text-emerald-300" : "text-slate-200"}`}
                  disabled={preview.isPrimary}
                >
                  {preview.isPrimary ? "Primary" : "Make primary"}
                </button>
              )
            }
          />
        ))}
        {files.length < limit && (
          <button
            type="button"
            onClick={handleAddClick}
            className={`flex ${cardHeightClass} items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 text-3xl text-slate-300 hover:border-slate-500 hover:text-white`}
          >
            +
          </button>
        )}
      </div>
    </div>
  );
}
