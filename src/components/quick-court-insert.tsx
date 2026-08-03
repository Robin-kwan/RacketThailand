"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MapPin, Plus, X } from "lucide-react";
import {
  PlaceSearchField,
  type ExistingCourt,
  type PlaceResolution,
} from "@/components/admin/place-search-field";
import { BaseTextField } from "@/components/base-text-field";
import type { Locale } from "@/lib/i18n";
import type { MapCoordinates } from "@/lib/google-maps";
import type { PlaceDetailsPayload } from "@/lib/google-places";

export type QuickCourtCreated = {
  courtId: string;
  label: string;
};

type QuickCourtInsertProps = {
  sportId: string;
  locale: Locale;
  onCreated: (court: QuickCourtCreated) => void;
  onCancel: () => void;
};

type QuickCourtDraft = {
  name: string;
  place: PlaceDetailsPayload | null;
  placeId: string;
  coordinates: MapCoordinates | null;
  duplicateCourt: ExistingCourt | null;
  validationVisible: boolean;
  submitting: boolean;
  error: string | null;
};

const createDraft = (): QuickCourtDraft => ({
  name: "",
  place: null,
  placeId: "",
  coordinates: null,
  duplicateCourt: null,
  validationVisible: false,
  submitting: false,
  error: null,
});

export function QuickCourtInsert({
  sportId,
  locale,
  onCreated,
  onCancel,
}: QuickCourtInsertProps) {
  const th = locale === "th";
  const [draft, setDraft] = useState<QuickCourtDraft>(createDraft);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !draft.submitting) {
        onCancel();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    window.setTimeout(() => {
      dialogRef.current?.querySelector<HTMLInputElement>("input")?.focus();
    }, 0);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [draft.submitting, onCancel]);

  const handlePlaceResolution = (resolution: PlaceResolution) => {
    setDraft((current) => ({
      ...current,
      place: resolution.place ?? null,
      placeId: resolution.place?.placeId ?? resolution.placeId ?? "",
      coordinates: resolution.coordinates,
      duplicateCourt: null,
      name: current.name.trim()
        ? current.name
        : resolution.place?.name ?? current.name,
      error: null,
    }));
  };

  const handleSubmit = async () => {
    setDraft((current) => ({
      ...current,
      validationVisible: true,
      error: null,
    }));

    const name = draft.name.trim();
    const place = draft.place;
    const latitude = Number(draft.coordinates?.latitude);
    const longitude = Number(draft.coordinates?.longitude);
    const hasCompleteLocation =
      Boolean(place?.address) &&
      Boolean(place?.province) &&
      typeof place?.provinceId === "number" &&
      typeof place?.districtId === "number" &&
      Number.isFinite(latitude) &&
      Number.isFinite(longitude);

    if (
      !name ||
      !draft.placeId ||
      !place ||
      !draft.coordinates ||
      draft.duplicateCourt ||
      !hasCompleteLocation
    ) {
      return;
    }

    setDraft((current) => ({
      ...current,
      submitting: true,
      error: null,
    }));

    try {
      const response = await fetch("/api/courts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sportId,
          name,
          address: place.address,
          district: place.district ?? "",
          province: place.province,
          provinceId: place.provinceId,
          districtId: place.districtId,
          latitude,
          longitude,
          googlePlaceId: draft.placeId,
          phone: place.phone ?? "",
          website_url: place.website ?? "",
          opening_hours: place.openingHoursStructured ?? null,
        }),
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result.courtId) {
        setDraft((current) => ({
          ...current,
          submitting: false,
          error:
            result.error ??
            (th ? "ไม่สามารถเพิ่มสนามได้" : "Unable to add court"),
        }));
        return;
      }

      onCreated({
        courtId: result.courtId as string,
        label: [name, place.province].filter(Boolean).join(" - "),
      });
    } catch {
      setDraft((current) => ({
        ...current,
        submitting: false,
        error: th ? "ไม่สามารถเพิ่มสนามได้" : "Unable to add court",
      }));
    }
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9997] flex items-end justify-center bg-slate-950/45 backdrop-blur-sm sm:items-center sm:px-4 sm:py-8"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !draft.submitting) {
          onCancel();
        }
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-court-title"
        className="flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-white/80 bg-white shadow-[0_28px_90px_rgb(15_23_42/0.3)] sm:max-w-2xl sm:rounded-3xl"
      >
        <div className="relative overflow-hidden border-b border-slate-100 bg-[linear-gradient(135deg,rgb(240_253_250),rgb(255_255_255)_65%)] px-5 py-5 sm:px-7 sm:py-6">
          <div className="absolute -right-12 -top-16 h-40 w-40 rounded-full bg-emerald-200/30 blur-2xl" />
          <div className="relative flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-sm">
                <MapPin className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <h2
                  id="quick-court-title"
                  className="text-lg font-bold tracking-tight text-slate-950 sm:text-xl"
                >
                  {th ? "เพิ่มสนามอย่างรวดเร็ว" : "Quick-add a court"}
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  {th
                    ? "เพิ่มข้อมูลพื้นฐานและเลือกตำแหน่งที่ถูกต้องจาก Google Maps"
                    : "Add the basics and choose the exact Google Maps location."}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onCancel}
              disabled={draft.submitting}
              className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label={th ? "ปิด" : "Close"}
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto px-5 py-6 sm:px-7">
          <div className="space-y-6">
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-950 text-xs font-bold text-white">
                  1
                </span>
                <p className="text-sm font-semibold text-slate-800">
                  {th ? "ค้นหาตำแหน่งสนาม" : "Find the court location"}
                </p>
              </div>
              <PlaceSearchField
                label={
                  th
                    ? "ค้นหาสถานที่จาก Google Maps"
                    : "Find the Google Maps place"
                }
                placeholder={
                  th ? "พิมพ์ชื่อสนามหรือสถานที่" : "Search for the court"
                }
                helper={
                  th
                    ? "เลือกสถานที่ที่ตรงกันเพื่อเติมชื่อ ที่อยู่ และพิกัดโดยอัตโนมัติ"
                    : "Choose the exact place to fill its name, address, and coordinates."
                }
                noResults={th ? "ไม่พบสถานที่" : "No places found"}
                duplicateLabel={
                  th ? "พบสนามนี้แล้ว" : "This court already exists"
                }
                duplicateLinkLabel={th ? "เปิดดูสนาม" : "View court"}
                locationPreviewLabel={
                  th ? "ตำแหน่งที่เลือก" : "Selected location"
                }
                mapTitle={th ? "แผนที่สนาม" : "Court map"}
                onResolve={handlePlaceResolution}
                onDuplicateCourtChange={(court) =>
                  setDraft((current) => ({
                    ...current,
                    duplicateCourt: court,
                    error: null,
                  }))
                }
                invalid={
                  draft.validationVisible &&
                  (!draft.placeId ||
                    !draft.coordinates ||
                    !draft.place ||
                    Boolean(draft.duplicateCourt) ||
                    !draft.place.address ||
                    !draft.place.province ||
                    typeof draft.place.provinceId !== "number" ||
                    typeof draft.place.districtId !== "number")
                }
                invalidMessage={
                  draft.duplicateCourt
                    ? th
                      ? "สนามนี้มีอยู่ในระบบแล้ว"
                      : "This court already exists."
                    : th
                      ? "กรุณาเลือกสถานที่ที่มีข้อมูลตำแหน่งครบถ้วน"
                      : "Select a place with complete location details."
                }
              />
            </section>

            <section className="space-y-3 border-t border-slate-100 pt-6">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-950 text-xs font-bold text-white">
                  2
                </span>
                <label className="text-sm font-semibold text-slate-800">
                  {th ? "ตรวจสอบชื่อสนาม" : "Review the court name"}
                </label>
              </div>
              <BaseTextField
                value={draft.name}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    name: event.target.value,
                    error: null,
                  }))
                }
                placeholder={
                  th ? "ชื่อสนามที่จะแสดง" : "Displayed court name"
                }
                variant="light"
                aria-invalid={draft.validationVisible && !draft.name.trim()}
                className={
                  draft.validationVisible && !draft.name.trim()
                    ? "border-rose-300 bg-rose-50"
                    : "h-12"
                }
              />
              <p className="text-xs leading-5 text-slate-500">
                {th
                  ? "ระบบจะเติมชื่อจาก Google Maps ให้อัตโนมัติ คุณสามารถแก้ไขชื่อที่จะแสดงได้"
                  : "We fill this from Google Maps automatically. You can adjust the displayed name."}
              </p>
              {draft.validationVisible && !draft.name.trim() && (
                <p className="text-xs font-medium text-rose-600">
                  {th ? "กรุณาระบุชื่อสนาม" : "Court name is required"}
                </p>
              )}
            </section>

            {draft.error && (
              <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                {draft.error}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50/80 px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
          <button
            type="button"
            onClick={onCancel}
            disabled={draft.submitting}
            className="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {th ? "ยกเลิก" : "Cancel"}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={draft.submitting}
            className="rt-btn-court inline-flex h-11 items-center justify-center gap-2 px-6 text-sm disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Plus className="h-4 w-4" aria-hidden />
            {draft.submitting
              ? th
                ? "กำลังเพิ่ม..."
                : "Adding..."
              : th
                ? "เพิ่มสนาม"
                : "Add court"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
