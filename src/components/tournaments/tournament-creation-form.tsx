"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { BaseSelect } from "@/components/base-select";
import { CourtPicker } from "@/components/court-picker";
import { DatePickerField } from "@/components/date-picker-field";
import { GroupPicker } from "@/components/group-picker";
import { MultiImageInput } from "@/components/multi-image-input";
import { QuickCourtInsert } from "@/components/quick-court-insert";
import { showToast } from "@/components/toaster";
import { buildLocalizedPath, type Locale } from "@/lib/i18n";

type Option = { value: string; label: string; sportId?: string };
type Organizer = {
  source: "manual" | "group";
  groupId: string;
  name: string;
  phone?: string;
  lineId?: string;
  websiteUrl?: string;
};

export type TournamentFormInitialData = {
  id: string;
  sportId: string;
  courtId: string;
  name: string;
  description: string;
  tournamentStartDate: string;
  tournamentEndDate: string;
  registrationUrl: string;
  phone: string;
  lineId: string;
  organizers: Organizer[];
  existingImages: {
    id: string;
    image_url: string;
    is_primary: boolean;
  }[];
};

const QUICK_ADD_COURT_VALUE = "__quick_add_court__";

function getBangkokDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function latestDate(...dates: Array<string | undefined>) {
  return dates
    .filter((date): date is string => Boolean(date))
    .sort()
    .at(-1);
}

export function TournamentCreationForm({
  sports,
  courts,
  groups,
  locale,
  initialData,
  initialSportId,
}: {
  sports: Option[];
  courts: Option[];
  groups: Option[];
  locale: Locale;
  initialData?: TournamentFormInitialData;
  initialSportId?: string;
}) {
  const router = useRouter();
  const [sportId, setSportId] = useState(
    initialData?.sportId ?? initialSportId ?? sports[0]?.value ?? "",
  );
  const [courtId, setCourtId] = useState(initialData?.courtId ?? "");
  const [courtOptions, setCourtOptions] = useState(courts);
  const [quickCourtOpen, setQuickCourtOpen] = useState(false);
  const [organizers, setOrganizers] = useState<Organizer[]>(
    initialData?.organizers.length
      ? initialData.organizers
      : [{ source: "manual", groupId: "", name: "" }],
  );
  const [tournamentStartDate, setTournamentStartDate] = useState(
    initialData?.tournamentStartDate ?? "",
  );
  const [tournamentEndDate, setTournamentEndDate] = useState(
    initialData?.tournamentEndDate ?? "",
  );
  const [images, setImages] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState(
    initialData?.existingImages ?? [],
  );
  const initialPrimaryImageId =
    initialData?.existingImages.find((image) => image.is_primary)?.id ?? null;
  const [primaryExistingImageId, setPrimaryExistingImageId] = useState<
    string | null
  >(initialPrimaryImageId);
  const [removedImageIds, setRemovedImageIds] = useState<string[]>([]);
  const [createdTournamentId, setCreatedTournamentId] = useState<string | null>(
    null,
  );
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const th = locale === "th";
  const today = getBangkokDate();
  const input =
    "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm";
  const filteredCourts = courtOptions.filter(
    (court) => court.sportId === sportId,
  );
  const filteredGroups = groups.filter((group) => group.sportId === sportId);
  function validateDateRange(start: string, end: string, label: string) {
    if (!start || !end) return null;
    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();
    if (Number.isNaN(startTime) || Number.isNaN(endTime)) {
      return th
        ? `วันที่และเวลา${label}ไม่ถูกต้อง`
        : `${label} dates are invalid.`;
    }
    if (endTime < startTime) {
      return th
        ? `วันและเวลาสิ้นสุด${label}ต้องไม่อยู่ก่อนวันและเวลาเริ่มต้น`
        : `${label} end cannot be before its start.`;
    }
    return null;
  }

  function handleSportChange(nextSportId: string) {
    setSportId(nextSportId);
    setCourtId("");
    setQuickCourtOpen(false);
    setOrganizers((rows) =>
      rows.map((organizer) => ({ ...organizer, groupId: "" })),
    );
  }

  function handleCourtChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const nextCourtId = event.target.value;
    if (nextCourtId === QUICK_ADD_COURT_VALUE) {
      setQuickCourtOpen(true);
      return;
    }
    setCourtId(nextCourtId);
    setQuickCourtOpen(false);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const data = new FormData(event.currentTarget);
    if (!sportId || !courtId || courtId === QUICK_ADD_COURT_VALUE) {
      setError(
        th
          ? "กรุณาเลือกกีฬาและสนามแข่งขัน"
          : "Select a sport and tournament court.",
      );
      return;
    }
    if ([tournamentStartDate, tournamentEndDate].some((value) => !value)) {
      return;
    }
    if (
      !organizers.some((organizer) =>
        organizer.source === "group"
          ? Boolean(organizer.groupId)
          : Boolean(organizer.name.trim()),
      )
    ) {
      setError(
        th
          ? "กรุณาระบุผู้จัดการแข่งขันอย่างน้อย 1 ราย"
          : "Add at least one organizer.",
      );
      return;
    }
    if (existingImages.length + images.length === 0) {
      setError(
        th
          ? "กรุณาเพิ่มรูปการแข่งขันอย่างน้อย 1 รูป"
          : "Add at least one tournament image.",
      );
      return;
    }
    const registrationUrl = String(data.get("registrationUrl") ?? "").trim();
    const phone = String(data.get("phone") ?? "").trim();
    const lineId = String(data.get("lineId") ?? "").trim();
    if (!registrationUrl && !phone && !lineId) {
      setError(
        th
          ? "กรุณาระบุช่องทางติดต่ออย่างน้อย 1 ช่องทาง"
          : "Add at least one contact method: external link, phone, or LINE.",
      );
      return;
    }
    const rangeError = validateDateRange(
      tournamentStartDate,
      tournamentEndDate,
      th ? "การแข่งขัน" : "Tournament",
    );
    if (rangeError) {
      setError(rangeError);
      return;
    }
    setPending(true);
    const savedTournamentId = initialData?.id ?? createdTournamentId;
    let response: Response;
    try {
      response = await fetch(
        savedTournamentId
          ? `/api/tournaments/${savedTournamentId}`
          : "/api/tournaments",
        {
          method: savedTournamentId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sportId,
            courtId,
            name: data.get("name"),
            description: data.get("description"),
            tournamentStartDate,
            tournamentEndDate,
            registrationUrl,
            phone,
            lineId,
            organizers,
          }),
        },
      );
    } catch {
      setError(
        th
          ? "ไม่สามารถเชื่อมต่อเพื่อบันทึกรายการแข่งขันได้ กรุณาลองอีกครั้ง"
          : "Unable to connect and save the tournament. Please try again.",
      );
      setPending(false);
      return;
    }
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(result.error ?? "Unable to create tournament");
      setPending(false);
      return;
    }
    const tournamentId =
      (result.tournamentId as string | undefined) ?? savedTournamentId;
    if (!tournamentId) {
      setError(th ? "ไม่พบรายการแข่งขัน" : "Tournament not found.");
      setPending(false);
      return;
    }
    if (!initialData) setCreatedTournamentId(tournamentId);
    let uploadsSucceeded = true;
    let hasPrimary = Boolean(primaryExistingImageId);
    const wantsNewPrimary = !primaryExistingImageId && images.length > 0;
    const failedImages: File[] = [];
    const uploadedImages: TournamentFormInitialData["existingImages"] = [];
    const pendingRemovalIds = [...removedImageIds];
    let estimatedStoredPhotoCount =
      existingImages.length + pendingRemovalIds.length;
    for (let index = 0; index < images.length; index += 1) {
      while (
        estimatedStoredPhotoCount >= 8 &&
        pendingRemovalIds.length > 0
      ) {
        const photoId = pendingRemovalIds[0];
        const deleteResponse = await fetch(
          `/api/tournaments/${tournamentId}/photos/${photoId}`,
          { method: "DELETE" },
        ).catch(() => null);
        if (!deleteResponse?.ok) {
          setRemovedImageIds(pendingRemovalIds);
          setError(
            th
              ? "ไม่สามารถลบรูปเดิมเพื่อเพิ่มรูปใหม่ได้ กรุณาลองบันทึกอีกครั้ง"
              : "Unable to remove an existing image before uploading its replacement. Please save again.",
          );
          setPending(false);
          return;
        }
        pendingRemovalIds.shift();
        estimatedStoredPhotoCount -= 1;
      }
      const photoData = new FormData();
      photoData.append("file", images[index]);
      const isPrimary = wantsNewPrimary ? index === 0 : !hasPrimary;
      photoData.append("isPrimary", String(isPrimary));
      let photoResponse: Response | null = null;
      try {
        photoResponse = await fetch(
          `/api/tournaments/${tournamentId}/photos`,
          {
            method: "POST",
            body: photoData,
          },
        );
      } catch {
        // Keep this file in the retry queue while retaining successful uploads.
      }
      const photoResult = photoResponse
        ? await photoResponse.json().catch(() => null)
        : null;
      if (!photoResponse?.ok || !photoResult?.photo) {
        uploadsSucceeded = false;
        failedImages.push(images[index]);
        showToast({
          variant: "error",
          message:
            photoResult?.error ??
            (th
              ? "อัปโหลดรูปภาพบางรูปไม่สำเร็จ"
              : "Some tournament images could not be uploaded."),
        });
      } else {
        const photo = photoResult.photo as TournamentFormInitialData["existingImages"][number];
        const uploadedPhoto =
          wantsNewPrimary && index > 0 && photo.is_primary
            ? { ...photo, is_primary: false }
            : photo;
        uploadedImages.push(uploadedPhoto);
        estimatedStoredPhotoCount += 1;
        hasPrimary ||= photo.is_primary;
        if (photo.is_primary && uploadedPhoto.is_primary) {
          setPrimaryExistingImageId(photo.id);
        }
      }
    }
    if (uploadedImages.length) {
      setExistingImages((current) => [...current, ...uploadedImages]);
    }
    if (!uploadsSucceeded) {
      setImages(failedImages);
      setRemovedImageIds(pendingRemovalIds);
      setPending(false);
      return;
    }
    if (images.length) {
      setImages([]);
    }
    if (
      initialData &&
      primaryExistingImageId &&
      primaryExistingImageId !== initialPrimaryImageId
    ) {
      const primaryResponse = await fetch(
        `/api/tournaments/${tournamentId}/photos/${primaryExistingImageId}`,
        { method: "PATCH" },
      ).catch(() => null);
      if (!primaryResponse?.ok) {
        const primaryResult = primaryResponse
          ? await primaryResponse.json().catch(() => ({}))
          : {};
        setError(primaryResult.error ?? "Unable to update the primary image.");
        setPending(false);
        return;
      }
    }
    if (initialData) {
      const failedRemovalIds: string[] = [];
      for (const photoId of pendingRemovalIds) {
        const deleteResponse = await fetch(
          `/api/tournaments/${tournamentId}/photos/${photoId}`,
          { method: "DELETE" },
        ).catch(() => null);
        if (!deleteResponse?.ok) {
          failedRemovalIds.push(photoId);
          const deleteResult = deleteResponse
            ? await deleteResponse.json().catch(() => ({}))
            : {};
          showToast({
            variant: "error",
            message:
              deleteResult.error ??
              (th
                ? "ลบรูปเดิมไม่สำเร็จ"
                : "Unable to remove an existing image."),
          });
        }
      }
      setRemovedImageIds(failedRemovalIds);
      if (failedRemovalIds.length) {
        setError(
          th
            ? "ลบรูปภาพบางรูปไม่สำเร็จ กรุณาลองบันทึกอีกครั้ง"
            : "Some images could not be removed. Please save again to retry.",
        );
        setPending(false);
        return;
      }
    }
    router.push(buildLocalizedPath(`/tournaments/${tournamentId}`, locale));
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-6 [&_input:not([type='checkbox']):not([type='radio'])]:!bg-white [&_textarea]:!bg-white"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <BaseSelect
          label={th ? "กีฬา" : "Sport"}
          name="sportId"
          value={sportId}
          variant="light"
          options={sports}
          required
          onChange={(event) => handleSportChange(event.target.value)}
        />
        <CourtPicker
          label={th ? "สนามแข่งขัน" : "Tournament court"}
          name="courtId"
          value={courtId}
          variant="light"
          options={[
            {
              value: QUICK_ADD_COURT_VALUE,
              label: th ? "+ เพิ่มสนามใหม่" : "+ Add a new court",
            },
            ...filteredCourts,
          ]}
          placeholder={th ? "เลือกสนาม" : "Select a court"}
          pinnedOptionValues={[QUICK_ADD_COURT_VALUE]}
          onValueChange={(value) =>
            handleCourtChange({
              target: { value },
            } as React.ChangeEvent<HTMLSelectElement>)
          }
        />
      </div>
      {quickCourtOpen && (
        <QuickCourtInsert
          sportId={sportId}
          locale={locale}
          onCancel={() => setQuickCourtOpen(false)}
          onCreated={({ courtId: nextCourtId, label }) => {
            setCourtOptions((current) => [
              { value: nextCourtId, label, sportId },
              ...current.filter((option) => option.value !== nextCourtId),
            ]);
            setCourtId(nextCourtId);
            setQuickCourtOpen(false);
          }}
        />
      )}
      <label className="block text-sm font-semibold">
        {th ? "ชื่อการแข่งขัน" : "Tournament name"}
        <input
          required
          name="name"
          defaultValue={initialData?.name}
          className={`${input} mt-2`}
        />
      </label>
      <label className="block text-sm font-semibold">
        {th ? "รายละเอียด" : "Description"}
        <textarea
          required
          name="description"
          defaultValue={initialData?.description}
          rows={6}
          className={`${input} mt-2`}
        />
      </label>
      <div className="grid gap-4 md:grid-cols-2">
        <DatePickerField
          label={th ? "เริ่มการแข่งขัน" : "Tournament starts"}
          value={tournamentStartDate}
          onChange={setTournamentStartDate}
          min={today}
          locale={locale}
          required
        />
        <DatePickerField
          label={th ? "จบการแข่งขัน" : "Tournament ends"}
          value={tournamentEndDate}
          onChange={setTournamentEndDate}
          min={latestDate(today, tournamentStartDate)}
          locale={locale}
          required
        />
      </div>
      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold">
          {th ? "ผู้จัดการแข่งขัน" : "Organizers"}
        </legend>
        {organizers.map((organizer, index) => (
          <div
            key={index}
            className="space-y-4 rounded-lg border border-slate-200 bg-white p-4"
          >
            {organizers.length > 1 && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() =>
                    setOrganizers((rows) => rows.filter((_, i) => i !== index))
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-rose-600 hover:bg-rose-50"
                  aria-label={
                    th
                      ? `ลบผู้จัดคนที่ ${index + 1}`
                      : `Remove organizer ${index + 1}`
                  }
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                  {th ? "ลบ" : "Remove"}
                </button>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
              {[
                {
                  value: "manual" as const,
                  label: th ? "ไม่ได้จัดโดยกลุ่ม" : "No group",
                },
                {
                  value: "group" as const,
                  label: th ? "เลือกกลุ่ม" : "Select group",
                },
              ].map((choice) => (
                <button
                  key={choice.value}
                  type="button"
                  onClick={() =>
                    setOrganizers((rows) =>
                      rows.map((row, i) =>
                        i === index
                          ? {
                              ...row,
                              source: choice.value,
                              groupId: "",
                              name: "",
                              phone: "",
                              lineId: "",
                              websiteUrl: "",
                            }
                          : row,
                      ),
                    )
                  }
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                    organizer.source === choice.value
                      ? "bg-white text-slate-950 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                  aria-pressed={organizer.source === choice.value}
                >
                  {choice.label}
                </button>
              ))}
            </div>

            {organizer.source === "manual" ? (
              <div className="space-y-2">
                <label
                  htmlFor={`organizer-name-${index}`}
                  className="block text-sm font-semibold text-slate-700"
                >
                  {th
                    ? "ชื่อผู้จัดหรือองค์กร"
                    : "Organizer or organization name"}
                </label>
                <input
                  id={`organizer-name-${index}`}
                  className={input}
                  value={organizer.name}
                  onChange={(event) =>
                    setOrganizers((rows) =>
                      rows.map((row, i) =>
                        i === index
                          ? { ...row, name: event.target.value }
                          : row,
                      ),
                    )
                  }
                />
              </div>
            ) : (
              <GroupPicker
                label={th ? "กลุ่มผู้จัดการแข่งขัน" : "Organizer group"}
                name={`organizer-group-${index}`}
                value={organizer.groupId}
                variant="light"
                options={filteredGroups}
                placeholder={
                  th ? "ค้นหาและเลือกกลุ่ม" : "Search and select a group"
                }
                noResultsText={
                  th
                    ? "ไม่พบกลุ่มสำหรับกีฬานี้"
                    : "No groups found for this sport"
                }
                onValueChange={(value) =>
                  setOrganizers((rows) =>
                    rows.map((row, i) =>
                      i === index ? { ...row, groupId: value } : row,
                    ),
                  )
                }
              />
            )}
          </div>
        ))}
        <button
          type="button"
          className="rt-btn-group px-4 py-2 text-sm"
          onClick={() =>
            setOrganizers((rows) => [
              ...rows,
              { source: "manual", groupId: "", name: "" },
            ])
          }
        >
          {th ? "+ เพิ่มผู้จัด" : "+ Add organizer"}
        </button>
      </fieldset>
      <MultiImageInput
        label={th ? "รูปการแข่งขัน *" : "Tournament images *"}
        limit={8}
        value={images}
        primaryLabel={th ? "รูปหลัก" : "Primary image"}
        makePrimaryLabel={th ? "ตั้งเป็นรูปหลัก" : "Make primary"}
        helperText={
          th
            ? existingImages.length
              ? `มีรูปเดิม ${existingImages.length} รูป และมีรูปได้สูงสุดรวม 8 รูป`
              : "ต้องมีอย่างน้อย 1 รูป เพิ่มได้สูงสุด 8 รูป รองรับ JPG, PNG และ WebP"
            : existingImages.length
              ? `${existingImages.length} existing image(s). Up to 8 images total.`
              : "At least 1 image is required. Add up to 8 JPG, PNG, or WebP images."
        }
        processErrorLabel={
          th ? "ประมวลผลรูปภาพไม่สำเร็จ" : "Unable to process image."
        }
        existingImages={existingImages.map((existingImage) => ({
          id: existingImage.id,
          imageUrl: existingImage.image_url,
          alt: initialData?.name ?? "Tournament image",
          isPrimary: existingImage.is_primary,
        }))}
        onRemoveExisting={(imageId) => {
          setExistingImages((current) =>
            current.filter((image) => image.id !== imageId),
          );
          setRemovedImageIds((current) => [...current, imageId]);
          if (primaryExistingImageId === imageId) {
            setPrimaryExistingImageId(null);
          }
        }}
        onSetExistingPrimary={(imageId) => {
          setPrimaryExistingImageId(imageId);
          setExistingImages((current) =>
            current.map((image) => ({
              ...image,
              is_primary: image.id === imageId,
            })),
          );
        }}
        onSetNewPrimary={() => {
          setPrimaryExistingImageId(null);
          setExistingImages((current) =>
            current.map((image) => ({ ...image, is_primary: false })),
          );
        }}
        onChange={setImages}
      />
      <div className="grid gap-4 md:grid-cols-3">
        <label className="text-sm font-semibold">
          {th ? "ลิงก์ข้อมูลเพิ่มเติม" : "External information URL"}
          <input
            type="text"
            name="registrationUrl"
            defaultValue={initialData?.registrationUrl}
            inputMode="url"
            className={`${input} mt-2`}
          />
        </label>
        <label className="text-sm font-semibold">
          {th ? "โทรศัพท์" : "Phone"}
          <input
            name="phone"
            defaultValue={initialData?.phone}
            className={`${input} mt-2`}
          />
        </label>
        <label className="text-sm font-semibold">
          LINE
          <input
            name="lineId"
            defaultValue={initialData?.lineId}
            className={`${input} mt-2`}
          />
        </label>
      </div>
      <p className="-mt-3 text-sm rt-text-muted">
        {th
          ? "ต้องระบุอย่างน้อย 1 ช่องทาง: ลิงก์ข้อมูล โทรศัพท์ หรือ LINE"
          : "At least one is required: external link, phone, or LINE."}
      </p>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <button
        disabled={pending}
        className="rt-btn-primary px-5 py-3 text-sm disabled:opacity-60"
      >
        {pending
          ? th
            ? "กำลังบันทึก..."
            : "Saving..."
          : th
            ? initialData
              ? "บันทึกการแก้ไข"
              : "สร้างการแข่งขัน"
            : initialData
              ? "Save changes"
              : "Create tournament"}
      </button>
    </form>
  );
}
