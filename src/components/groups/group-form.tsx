"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Trash2, X } from "lucide-react";
import { BaseSelect } from "@/components/base-select";
import { BaseAutocomplete } from "@/components/base-autocomplete";
import { BaseTextField } from "@/components/base-text-field";
import { BaseNumberField } from "@/components/base-number-field";
import { BaseTextArea } from "@/components/base-text-area";
import {
  PlaceSearchField,
  type ExistingCourt,
  type PlaceResolution,
} from "@/components/admin/place-search-field";
import {
  ClosingTimePickerField,
  TimePickerField,
  createClosingTimeOptions,
  createTimeOptions,
} from "@/components/time-picker-field";
import {
  DEFAULT_PLAY_FORMAT,
  type PlayFormat,
} from "@/lib/play-format";
import type { GroupStatus } from "@/lib/group-status";
import type { LineQrUploaderCopy } from "@/components/line-qr-uploader";
import type { MapCoordinates } from "@/lib/google-maps";
import type { PlaceDetailsPayload } from "@/lib/google-places";

export type Option = {
  value: string;
  label: string;
};

export type SessionSlot = {
  id: string;
  day: string;
  start: string;
  end: string;
};

export type CourtSessionBlock = {
  id: string;
  courtId: string;
  slots: SessionSlot[];
};

const normalizeSessions = (blocks: CourtSessionBlock[]) =>
  blocks
    .flatMap((block) =>
      block.slots.map((slot) => ({
        courtId: block.courtId,
        day: slot.day,
        start: slot.start,
        end: slot.end,
      })),
    )
    .filter(
      (session) =>
        session.courtId && session.day && session.start && session.end,
    );

const normalizeCourtIds = (blocks: CourtSessionBlock[]) =>
  Array.from(
    new Set(
      blocks
        .map((block) => block.courtId.trim())
        .filter(Boolean),
    ),
  );

const hasContactMethod = (values: {
  phone: string;
  lineId: string;
  websiteUrl: string;
}) =>
  Boolean(
    values.phone.trim() ||
      values.lineId.trim() ||
      values.websiteUrl.trim(),
  );

const CONTACT_FIELD_NAMES = new Set(["phone", "lineId", "websiteUrl"]);
const QUICK_ADD_COURT_VALUE = "__quick_add_court__";

export type GroupFormValues = {
  sportId: string;
  name: string;
  description: string;
  status?: GroupStatus | null;
  sessions: CourtSessionBlock[];
  playFormat?: PlayFormat | null;
  playerAmount?: string | null;
  allowWalkIn?: boolean | null;
  phone?: string | null;
  lineId?: string | null;
  websiteUrl?: string | null;
};

export type GroupFormCopy = {
  sport: string;
  name: string;
  description: string;
  wizardStepBasic: string;
  wizardStepCourts: string;
  wizardStepContact: string;
  wizardStepPhotos: string;
  wizardNext: string;
  wizardBack: string;
  wizardRequiredFields: string;
  sessionsLabel: string;
  sessionsTitle?: string;
  sessionsAddCourt: string;
  sessionsAddSlot: string;
  sessionsRemoveCourt: string;
  sessionsEmpty: string;
  sessionCourt: string;
  quickCourtAddOption: string;
  quickCourtTitle: string;
  quickCourtName: string;
  quickCourtNamePlaceholder: string;
  quickCourtPlaceSearch: string;
  quickCourtPlaceHelper: string;
  quickCourtNoResults: string;
  quickCourtDuplicateLabel: string;
  quickCourtDuplicateLinkLabel: string;
  quickCourtLocationPreview: string;
  quickCourtMapTitle: string;
  quickCourtSave: string;
  quickCourtSaving: string;
  quickCourtCancel: string;
  quickCourtNameRequired: string;
  quickCourtPlaceRequired: string;
  quickCourtDuplicateError: string;
  quickCourtLocationIncomplete: string;
  quickCourtCreateError: string;
  noOptionsFound: string;
  scheduleLabel: string;
  scheduleOptionalEmpty: string;
  scheduleDay: string;
  scheduleStart: string;
  scheduleEnd: string;
  scheduleRemove: string;
  playFormatLabel: string;
  playFormatSingle: string;
  playFormatDouble: string;
  playerAmountLabel: string;
  playerAmountPlaceholder: string;
  playerAmountHelp: string;
  allowWalkInLabel: string;
  allowWalkInHelp: string;
  contactTitle: string;
  contactHelp: string;
  contactRequirementLabel: string;
  phoneLabel: string;
  phonePlaceholder: string;
  lineLabel: string;
  linePlaceholder: string;
  websiteLabel: string;
  websitePlaceholder: string;
  contactRequired: string;
  courtSportMismatch: string;
  lineQrLabel: string;
  lineQrUploader?: LineQrUploaderCopy;
};

type SubmitPayload = {
  sportId: string;
  name: string;
  description: string;
  courtIds: string[];
  sessions: { courtId: string; day: string; start: string; end: string }[];
  playFormat: PlayFormat;
  playerAmount?: string;
  allowWalkIn: boolean;
  phone?: string;
  lineId?: string;
  websiteUrl?: string;
};

type QuickCourtDraft = {
  blockId: string | null;
  name: string;
  place: PlaceDetailsPayload | null;
  placeId: string;
  coordinates: MapCoordinates | null;
  duplicateCourt: ExistingCourt | null;
  validationVisible: boolean;
  submitting: boolean;
  error: string | null;
};

type GroupFormProps = {
  initialValues: GroupFormValues;
  sports: Option[];
  courts: Record<string, Option[]>;
  dayOptions: Option[];
  copy: GroupFormCopy;
  photoSection?: React.ReactNode;
  lineQrSection?: React.ReactNode;
  onSubmit: (payload: SubmitPayload) => Promise<void> | void;
  submitting: boolean;
  submitLabel: string;
  submittingLabel: string;
  sportDisabled?: boolean;
  externalDirty?: boolean;
};

const createSlot = (): SessionSlot => ({
  id: crypto.randomUUID
    ? crypto.randomUUID()
    : `slot-${Date.now()}-${Math.random()}`,
  day: "sunday",
  start: "00:00",
  end: "00:00",
});

const GROUP_TIME_OPTIONS = createTimeOptions({ minuteStep: 30 });
const GROUP_CLOSING_TIME_OPTIONS = createClosingTimeOptions({ minuteStep: 30 });

const createQuickCourtDraft = (blockId: string | null = null): QuickCourtDraft => ({
  blockId,
  name: "",
  place: null,
  placeId: "",
  coordinates: null,
  duplicateCourt: null,
  validationVisible: false,
  submitting: false,
  error: null,
});

export function GroupForm({
  initialValues,
  sports,
  courts,
  dayOptions,
  copy,
  photoSection,
  lineQrSection,
  onSubmit,
  submitting,
  submitLabel,
  submittingLabel,
  sportDisabled = false,
  externalDirty = false,
}: GroupFormProps) {
  const [form, setForm] = useState({
    sportId: initialValues.sportId,
    name: initialValues.name,
    description: initialValues.description,
    status: initialValues.status ?? "published",
    playFormat: initialValues.playFormat ?? DEFAULT_PLAY_FORMAT,
    playerAmount: initialValues.playerAmount ?? "",
    allowWalkIn: initialValues.allowWalkIn !== false,
    phone: initialValues.phone ?? "",
    lineId: initialValues.lineId ?? "",
    websiteUrl: initialValues.websiteUrl ?? "",
  });
  const [courtSessions, setCourtSessions] = useState<CourtSessionBlock[]>(
    initialValues.sessions,
  );
  const [quickCourt, setQuickCourt] = useState<QuickCourtDraft>(() =>
    createQuickCourtDraft(),
  );
  const [currentStep, setCurrentStep] = useState(0);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [basicErrorVisible, setBasicErrorVisible] = useState(false);
  const [contactErrorVisible, setContactErrorVisible] = useState(false);
  const firstContactFieldRef = useRef<HTMLInputElement>(null);
  const sportOptions = useMemo(
    () =>
      [
        { value: "", label: "", disabled: true, hidden: true },
        ...sports.map((sport) => ({
          value: sport.value,
          label: sport.label,
        })),
      ],
    [sports],
  );
  const [courtCache, setCourtCache] = useState<Record<string, Option[]>>(courts);
  const courtOptions = useMemo(
    () => courtCache[form.sportId] ?? [],
    [courtCache, form.sportId],
  );
  const selectedCourtIds = useMemo(
    () =>
      new Set(
        courtSessions
          .map((block) => block.courtId)
          .filter((courtId): courtId is string => Boolean(courtId)),
      ),
    [courtSessions],
  );

  const getCourtOptionsForBlock = (blockId: string) => {
    const currentCourtId =
      courtSessions.find((block) => block.id === blockId)?.courtId ?? "";
    const availableOptions = courtOptions.filter(
      (option) =>
        option.value === currentCourtId || !selectedCourtIds.has(option.value),
    );
    if (!form.sportId) {
      return availableOptions;
    }
    return [
      {
        value: QUICK_ADD_COURT_VALUE,
        label: copy.quickCourtAddOption,
      },
      ...availableOptions,
    ];
  };

  useEffect(() => {
    if (courtCache[form.sportId]) return;
    let active = true;
    const fetchCourts = async () => {
      try {
        const response = await fetch(
          `/api/court-options?sportId=${form.sportId}`,
        );
        const data = await response.json().catch(() => null);
        if (!response.ok || !data?.options || !active) return;
        setCourtCache((prev) => ({
          ...prev,
          [form.sportId]: data.options as Option[],
        }));
      } catch (error) {
        console.error(error);
      }
    };
    if (form.sportId) {
      fetchCourts();
    }
    return () => {
      active = false;
    };
  }, [form.sportId, courtCache]);

  const updateForm = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.target;
    if (CONTACT_FIELD_NAMES.has(name)) {
      const nextContactValues = {
        phone: name === "phone" ? value : form.phone,
        lineId: name === "lineId" ? value : form.lineId,
        websiteUrl: name === "websiteUrl" ? value : form.websiteUrl,
      };
      if (hasContactMethod(nextContactValues)) {
        setContactErrorVisible(false);
      }
    }
    if ((name === "sportId" || name === "name") && basicErrorVisible) {
      const nextSportId = name === "sportId" ? value : form.sportId;
      const nextName = name === "name" ? value : form.name;
      if (nextSportId && nextName.trim()) {
        setBasicErrorVisible(false);
      }
    }
    setForm((prev) => ({ ...prev, [name]: value }));
    if (name === "sportId") {
      setQuickCourt(createQuickCourtDraft());
      const nextOptions = courtCache[value] ?? [];
      const optionSet = new Set(nextOptions.map((option) => option.value));
      setCourtSessions((prev) =>
        prev.map((block) => {
          if (optionSet.size === 0) {
            return { ...block, courtId: "", slots: [] };
          }
          if (optionSet.has(block.courtId)) {
            return block;
          }
          return { ...block, courtId: "", slots: [] };
        }),
      );
    }
  };

  const addCourtBlock = () => {
    setCourtSessions((prev) => [
      ...prev,
      {
        id: crypto.randomUUID
          ? crypto.randomUUID()
          : `court-${Date.now()}-${Math.random()}`,
        courtId: "",
        slots: [],
      },
    ]);
  };

  const updateCourtBlock = (blockId: string, courtId: string) => {
    if (courtId === QUICK_ADD_COURT_VALUE) {
      setQuickCourt(createQuickCourtDraft(blockId));
      return;
    }
    setCourtSessions((prev) =>
      prev.map((block) =>
        block.id === blockId ? { ...block, courtId } : block,
      ),
    );
  };

  const removeCourtBlock = (blockId: string) => {
    setQuickCourt((prev) =>
      prev.blockId === blockId ? createQuickCourtDraft() : prev,
    );
    setCourtSessions((prev) => prev.filter((block) => block.id !== blockId));
  };

  const handleQuickCourtPlaceResolution = (resolution: PlaceResolution) => {
    setQuickCourt((prev) => ({
      ...prev,
      place: resolution.place ?? null,
      placeId: resolution.place?.placeId ?? resolution.placeId ?? "",
      coordinates: resolution.coordinates,
      duplicateCourt: null,
      name: prev.name.trim() ? prev.name : resolution.place?.name ?? prev.name,
      error: null,
    }));
  };

  const handleQuickCourtSubmit = async () => {
    setQuickCourt((prev) => ({
      ...prev,
      validationVisible: true,
      error: null,
    }));

    const name = quickCourt.name.trim();
    const place = quickCourt.place;
    const coordinates = quickCourt.coordinates;
    const latitude = Number(coordinates?.latitude);
    const longitude = Number(coordinates?.longitude);
    const hasCompleteLocation =
      Boolean(place?.address) &&
      Boolean(place?.province) &&
      typeof place?.provinceId === "number" &&
      typeof place?.districtId === "number" &&
      Number.isFinite(latitude) &&
      Number.isFinite(longitude);

    if (
      !quickCourt.blockId ||
      !name ||
      !quickCourt.placeId ||
      !place ||
      !coordinates ||
      quickCourt.duplicateCourt ||
      !hasCompleteLocation
    ) {
      return;
    }

    setQuickCourt((prev) => ({
      ...prev,
      submitting: true,
      error: null,
    }));

    try {
      const response = await fetch("/api/courts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sportId: form.sportId,
          name,
          address: place.address,
          district: place.district ?? "",
          province: place.province,
          provinceId: place.provinceId,
          districtId: place.districtId,
          latitude,
          longitude,
          googlePlaceId: quickCourt.placeId,
          phone: place.phone ?? "",
          website_url: place.website ?? "",
          opening_hours: place.openingHoursStructured ?? null,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.courtId) {
        setQuickCourt((prev) => ({
          ...prev,
          submitting: false,
          error: data?.error ?? copy.quickCourtCreateError,
        }));
        return;
      }

      const courtId = data.courtId as string;
      const label = [name, place.province].filter(Boolean).join(" · ");
      setCourtCache((prev) => {
        const currentOptions = prev[form.sportId] ?? [];
        const nextOption = { value: courtId, label };
        return {
          ...prev,
          [form.sportId]: [
            nextOption,
            ...currentOptions.filter((option) => option.value !== courtId),
          ],
        };
      });
      updateCourtBlock(quickCourt.blockId, courtId);
      setQuickCourt(createQuickCourtDraft());
    } catch {
      setQuickCourt((prev) => ({
        ...prev,
        submitting: false,
        error: copy.quickCourtCreateError,
      }));
    }
  };

  const addSessionSlot = (blockId: string) => {
    setCourtSessions((prev) =>
      prev.map((block) =>
        block.id === blockId
          ? { ...block, slots: [...block.slots, { ...createSlot() }] }
          : block,
      ),
    );
  };

  const updateSessionSlot = (
    blockId: string,
    slotId: string,
    field: "day" | "start" | "end",
    value: string,
  ) => {
    setCourtSessions((prev) =>
      prev.map((block) =>
        block.id === blockId
          ? {
              ...block,
              slots: block.slots.map((slot) => {
                if (slot.id !== slotId) {
                  return slot;
                }

                const nextSlot = {
                  ...slot,
                  [field]: value,
                };

                return nextSlot;
              }),
            }
          : block,
      ),
    );
  };

  const removeSessionSlot = (blockId: string, slotId: string) => {
    setCourtSessions((prev) =>
      prev.map((block) =>
        block.id === blockId
          ? { ...block, slots: block.slots.filter((slot) => slot.id !== slotId) }
          : block,
      ),
    );
  };

  const serializedSessions = useMemo(
    () => normalizeSessions(courtSessions),
    [courtSessions],
  );
  const serializedCourtIds = useMemo(
    () => normalizeCourtIds(courtSessions),
    [courtSessions],
  );

  const initialSnapshot = useMemo(
    () =>
      JSON.stringify({
        sportId: initialValues.sportId,
        name: initialValues.name,
        description: initialValues.description,
        status: initialValues.status ?? "published",
        playFormat: initialValues.playFormat ?? DEFAULT_PLAY_FORMAT,
        playerAmount: initialValues.playerAmount ?? "",
        allowWalkIn: initialValues.allowWalkIn !== false,
        phone: initialValues.phone ?? "",
        lineId: initialValues.lineId ?? "",
        websiteUrl: initialValues.websiteUrl ?? "",
        courtIds: normalizeCourtIds(initialValues.sessions),
        sessions: normalizeSessions(initialValues.sessions),
      }),
    [initialValues],
  );

  const currentSnapshot = useMemo(
    () =>
      JSON.stringify({
        sportId: form.sportId,
        name: form.name,
        description: form.description,
        status: form.status,
        playFormat: form.playFormat,
        playerAmount: form.playerAmount,
        allowWalkIn: form.allowWalkIn,
        phone: form.phone,
        lineId: form.lineId,
        websiteUrl: form.websiteUrl,
        courtIds: serializedCourtIds,
        sessions: serializedSessions,
      }),
    [form, serializedCourtIds, serializedSessions],
  );

  const hasChanges = currentSnapshot !== initialSnapshot || externalDirty;
  const steps = [
    copy.wizardStepBasic,
    copy.wizardStepCourts,
    copy.wizardStepContact,
    copy.wizardStepPhotos,
  ];
  const stepInsetPercent = steps.length > 0 ? 100 / (steps.length * 2) : 0;
  const stepLinePercent =
    steps.length > 1
      ? (100 - stepInsetPercent * 2) * (currentStep / (steps.length - 1))
      : 0;
  const isBasicComplete = Boolean(form.sportId && form.name.trim());
  const contactFieldClass = contactErrorVisible
    ? "border-rose-300 bg-rose-50 focus-visible:border-rose-400 focus-visible:ring-rose-200"
    : undefined;
  const contactErrorId = "group-contact-error";

  const goToPreviousStep = () => {
    setCurrentStep((prev) => Math.max(0, prev - 1));
  };

  const goToNextStep = () => {
    setSubmitAttempted(true);
    if (currentStep === 0 && !isBasicComplete) {
      setBasicErrorVisible(true);
      return;
    }
    if (currentStep === 2 && !hasContactMethod(form)) {
      setContactErrorVisible(true);
      window.requestAnimationFrame(() => {
        firstContactFieldRef.current?.focus();
      });
      return;
    }
    setBasicErrorVisible(false);
    setContactErrorVisible(false);
    setCurrentStep((prev) => Math.min(steps.length - 1, prev + 1));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitAttempted(true);
    if (currentStep < steps.length - 1) {
      goToNextStep();
      return;
    }
    if (!isBasicComplete) {
      setBasicErrorVisible(true);
      setCurrentStep(0);
      return;
    }
    if (!hasContactMethod(form)) {
      setContactErrorVisible(true);
      setCurrentStep(2);
      window.requestAnimationFrame(() => {
        firstContactFieldRef.current?.focus();
      });
      return;
    }
    setContactErrorVisible(false);
    await onSubmit({
      sportId: form.sportId,
      name: form.name,
      description: form.description,
      playFormat: form.playFormat,
      playerAmount: form.playerAmount,
      allowWalkIn: form.allowWalkIn,
      phone: form.phone,
      lineId: form.lineId,
      websiteUrl: form.websiteUrl,
      courtIds: serializedCourtIds,
      sessions: serializedSessions,
    });
  };

  return (
    <form
      className="space-y-5 text-[var(--foreground)]"
      data-validation-visible={submitAttempted ? "true" : undefined}
      onInvalidCapture={() => setSubmitAttempted(true)}
      onSubmit={handleSubmit}
    >
      <div className="relative min-w-0 px-1 py-2 sm:px-0">
        <div
          aria-hidden
          className="absolute top-6 h-0.5 bg-slate-200 sm:top-7"
          style={{
            left: `${stepInsetPercent}%`,
            right: `${stepInsetPercent}%`,
          }}
        />
        <div
          aria-hidden
          className="absolute top-6 h-0.5 bg-slate-900 transition-all duration-300 sm:top-7"
          style={{
            left: `${stepInsetPercent}%`,
            width: `${stepLinePercent}%`,
          }}
        />
        <div
          className="relative grid"
          style={{
            gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))`,
          }}
        >
          {steps.map((step, index) => {
            const isCurrent = index === currentStep;
            const isComplete = index < currentStep;
            return (
              <button
                key={step}
                type="button"
                onClick={() => {
                  if (index <= currentStep) {
                    setCurrentStep(index);
                  }
                }}
                disabled={index > currentStep}
                className="group flex flex-col items-center gap-1.5 px-1 text-center transition disabled:cursor-not-allowed sm:gap-2 sm:px-3"
              >
                <span
                  className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border text-xs font-bold shadow-sm transition sm:h-10 sm:w-10 sm:text-sm ${
                    isCurrent
                      ? "border-[rgb(var(--rt-primary-border-rgb))] bg-[rgb(var(--rt-primary-rgb))] text-white shadow-[0_10px_24px_rgb(var(--rt-primary-rgb)/0.22)]"
                      : isComplete
                        ? "border-slate-950 bg-slate-950 text-white"
                        : "border-slate-200 bg-slate-100 text-slate-500"
                  }`}
                >
                  {isComplete ? (
                    <Check aria-hidden className="h-4 w-4 stroke-[3] sm:h-5 sm:w-5" />
                  ) : (
                    index + 1
                  )}
                </span>
                <span
                  className={`block max-w-20 truncate text-[10px] font-semibold leading-tight transition sm:max-w-32 sm:text-sm ${
                    isCurrent
                      ? "text-[rgb(var(--rt-primary-soft-rgb))]"
                      : isComplete
                        ? "text-slate-950"
                        : "text-slate-500"
                  }`}
                >
                  {step}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {currentStep === 0 && (
        <section className="space-y-5">
          <BaseSelect
            label={copy.sport}
            name="sportId"
            value={form.sportId}
            onChange={updateForm}
            options={sportOptions}
            disabled={sportDisabled}
            required
            variant="light"
          />
          <div className="space-y-2">
            <label className="text-sm font-semibold text-[var(--foreground)]">
              {copy.name}
            </label>
            <BaseTextField
              type="text"
              name="name"
              value={form.name}
              onChange={updateForm}
              required
              variant="light"
              aria-invalid={basicErrorVisible && !form.name.trim()}
              className={
                basicErrorVisible && !form.name.trim()
                  ? "border-rose-300 bg-rose-50 focus-visible:border-rose-400 focus-visible:ring-rose-200"
                  : undefined
              }
            />
          </div>
          {basicErrorVisible && !isBasicComplete && (
            <p className="text-sm font-medium text-rose-600">
              {copy.wizardRequiredFields}
            </p>
          )}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-[var(--foreground)]">
              {copy.description}
            </label>
            <BaseTextArea
              name="description"
              value={form.description}
              onChange={updateForm}
              rows={4}
              variant="light"
            />
          </div>
          <BaseSelect
            label={copy.playFormatLabel}
            name="playFormat"
            value={form.playFormat}
            onChange={updateForm}
            options={[
              { value: "double", label: copy.playFormatDouble },
              { value: "single", label: copy.playFormatSingle },
            ]}
            required
            variant="light"
          />
          <div className="space-y-2">
            <label className="text-sm font-semibold text-[var(--foreground)]">
              {copy.playerAmountLabel}
            </label>
            <p className="text-xs text-[rgb(var(--foreground-rgb)/0.65)]">
              {copy.playerAmountHelp}
            </p>
            <BaseNumberField
              name="playerAmount"
              placeholder={copy.playerAmountPlaceholder}
              value={form.playerAmount}
              onChange={updateForm}
              variant="light"
            />
          </div>
          <label className="flex cursor-pointer items-start gap-3 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4">
            <input
              type="checkbox"
              checked={form.allowWalkIn}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  allowWalkIn: event.target.checked,
                }))
              }
              className="mt-1 h-4 w-4 rounded border-slate-300 text-[var(--rt-primary)] focus:ring-[var(--rt-primary)]"
            />
            <span>
              <span className="block text-sm font-semibold text-slate-800">
                {copy.allowWalkInLabel}
              </span>
              <span className="mt-1 block text-xs text-slate-500">
                {copy.allowWalkInHelp}
              </span>
            </span>
          </label>
        </section>
      )}
      {currentStep === 2 && (
      <section className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-[var(--foreground)]">
              {copy.contactTitle}
            </p>
            <p className="mt-1 text-xs text-[rgb(var(--foreground-rgb)/0.65)]">
              {copy.contactHelp}
            </p>
          </div>
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            {copy.contactRequirementLabel}
          </span>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-[var(--foreground)]">
              {copy.phoneLabel}
            </label>
            <BaseTextField
              type="tel"
              name="phone"
              value={form.phone}
              onChange={updateForm}
              placeholder={copy.phonePlaceholder}
              variant="light"
              ref={firstContactFieldRef}
              className={contactFieldClass}
              aria-invalid={contactErrorVisible}
              aria-describedby={contactErrorVisible ? contactErrorId : undefined}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-[var(--foreground)]">
              {copy.lineLabel}
            </label>
            <BaseTextField
              type="text"
              name="lineId"
              value={form.lineId}
              onChange={updateForm}
              placeholder={copy.linePlaceholder}
              variant="light"
              className={contactFieldClass}
              aria-invalid={contactErrorVisible}
              aria-describedby={contactErrorVisible ? contactErrorId : undefined}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-[var(--foreground)]">
              {copy.websiteLabel}
            </label>
            <BaseTextField
              type="text"
              name="websiteUrl"
              value={form.websiteUrl}
              onChange={updateForm}
              placeholder={copy.websitePlaceholder}
              variant="light"
              className={contactFieldClass}
              aria-invalid={contactErrorVisible}
              aria-describedby={contactErrorVisible ? contactErrorId : undefined}
            />
          </div>
        </div>
        {contactErrorVisible && (
          <p
            id={contactErrorId}
            role="alert"
            className="text-sm font-medium text-rose-600"
          >
            {copy.contactRequired}
          </p>
        )}
        {lineQrSection}
      </section>
      )}
      {currentStep === 1 && (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">
            {copy.sessionsLabel}
          </p>
          <button
            type="button"
            onClick={addCourtBlock}
            className="text-xs font-semibold text-[rgb(var(--rt-primary-rgb))] hover:text-[rgb(var(--rt-primary-rgb)/0.75)]"
          >
            {copy.sessionsAddCourt}
          </button>
        </div>
        {courtSessions.length === 0 ? (
          <p className="text-xs text-[rgb(var(--foreground-rgb)/0.65)]">
            {copy.sessionsEmpty}
          </p>
        ) : (
          <div className="space-y-4">
            {courtSessions.map((block) => (
              <div
                key={block.id}
                className="relative space-y-4 rounded-2xl border border-slate-200 bg-white p-4 pt-11"
              >
                <button
                  type="button"
                  onClick={() => removeCourtBlock(block.id)}
                  className="absolute right-3 top-3 z-10 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/90 text-slate-400 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-100 hover:text-rose-500"
                  aria-label={copy.sessionsRemoveCourt}
                  title={copy.sessionsRemoveCourt}
                >
                  <X
                    className="h-4 w-4"
                    strokeWidth={2}
                    aria-hidden
                  />
                </button>
                <div>
                  <BaseAutocomplete
                    label={copy.sessionCourt}
                    name={`session-court-${block.id}`}
                    value={block.courtId}
                    onChange={(event) =>
                      updateCourtBlock(block.id, event.target.value)
                    }
                    options={getCourtOptionsForBlock(block.id)}
                    className="flex-1"
                    noResultsText={copy.noOptionsFound}
                    pinnedOptionValues={[QUICK_ADD_COURT_VALUE]}
                    variant="light"
                  />
                  {quickCourt.blockId === block.id && (
                    <div
                      className="mt-4 space-y-4 rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-semibold text-slate-900">
                          {copy.quickCourtTitle}
                        </p>
                        <button
                          type="button"
                          onClick={() => setQuickCourt(createQuickCourtDraft())}
                          className="text-xs font-semibold text-slate-500 transition hover:text-slate-800"
                        >
                          {copy.quickCourtCancel}
                        </button>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700">
                          {copy.quickCourtName}
                        </label>
                        <BaseTextField
                          type="text"
                          value={quickCourt.name}
                          onChange={(event) =>
                            setQuickCourt((prev) => ({
                              ...prev,
                              name: event.target.value,
                              error: null,
                            }))
                          }
                          placeholder={copy.quickCourtNamePlaceholder}
                          variant="light"
                          aria-invalid={
                            quickCourt.validationVisible &&
                            !quickCourt.name.trim()
                          }
                          className={
                            quickCourt.validationVisible &&
                            !quickCourt.name.trim()
                              ? "border-rose-300 bg-rose-50 focus-visible:border-rose-400 focus-visible:ring-rose-200"
                              : undefined
                          }
                        />
                        {quickCourt.validationVisible &&
                          !quickCourt.name.trim() && (
                            <p className="text-xs font-medium text-rose-600">
                              {copy.quickCourtNameRequired}
                            </p>
                          )}
                      </div>
                      <PlaceSearchField
                        label={copy.quickCourtPlaceSearch}
                        placeholder={copy.quickCourtPlaceSearch}
                        helper={copy.quickCourtPlaceHelper}
                        noResults={copy.quickCourtNoResults}
                        duplicateLabel={copy.quickCourtDuplicateLabel}
                        duplicateLinkLabel={copy.quickCourtDuplicateLinkLabel}
                        locationPreviewLabel={copy.quickCourtLocationPreview}
                        mapTitle={copy.quickCourtMapTitle}
                        onResolve={handleQuickCourtPlaceResolution}
                        onDuplicateCourtChange={(court) =>
                          setQuickCourt((prev) => ({
                            ...prev,
                            duplicateCourt: court,
                            error: null,
                          }))
                        }
                        invalid={
                          quickCourt.validationVisible &&
                          (!quickCourt.placeId ||
                            !quickCourt.coordinates ||
                            !quickCourt.place ||
                            Boolean(quickCourt.duplicateCourt) ||
                            !quickCourt.place.address ||
                            !quickCourt.place.province ||
                            typeof quickCourt.place.provinceId !== "number" ||
                            typeof quickCourt.place.districtId !== "number")
                        }
                        invalidMessage={
                          quickCourt.duplicateCourt
                            ? copy.quickCourtDuplicateError
                            : !quickCourt.placeId || !quickCourt.coordinates
                              ? copy.quickCourtPlaceRequired
                              : copy.quickCourtLocationIncomplete
                        }
                      />
                      {quickCourt.error && (
                        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600">
                          {quickCourt.error}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={handleQuickCourtSubmit}
                          disabled={quickCourt.submitting}
                          className="rt-btn-court inline-flex items-center justify-center px-5 py-2 text-sm disabled:cursor-not-allowed"
                        >
                          {quickCourt.submitting
                            ? `${copy.quickCourtSaving}...`
                            : copy.quickCourtSave}
                        </button>
                        <button
                          type="button"
                          onClick={() => setQuickCourt(createQuickCourtDraft())}
                          disabled={quickCourt.submitting}
                          className="rounded-full border border-slate-200 bg-white px-5 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:text-slate-400"
                        >
                          {copy.quickCourtCancel}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase text-[rgb(var(--foreground-rgb)/0.5)]">
                    {copy.sessionsTitle ?? copy.scheduleLabel}
                  </p>
                  {block.slots.length === 0 && (
                    <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-[rgb(var(--foreground-rgb)/0.65)]">
                      {copy.scheduleOptionalEmpty}
                    </p>
                  )}
                  {block.slots.map((slot) => {
                    const startInputId = `session-${block.id}-${slot.id}-start`;
                    const endInputId = `session-${block.id}-${slot.id}-end`;
                    return (
                      <div
                        key={slot.id}
                        className="flex flex-col gap-3 md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end"
                      >
                        <div className="space-y-1">
                          <label
                            className="text-xs font-semibold text-[rgb(var(--foreground-rgb)/0.65)]"
                            htmlFor={`schedule-day-${slot.id}`}
                          >
                            {copy.scheduleDay}
                          </label>
                          <BaseSelect
                            label=""
                            name={`schedule-day-${slot.id}`}
                            value={slot.day}
                            onChange={(event) =>
                              updateSessionSlot(
                                block.id,
                                slot.id,
                                "day",
                                event.target.value,
                              )
                            }
                            options={dayOptions}
                            className="space-y-0"
                            variant="light"
                            labelHidden
                          />
                        </div>
                        <TimePickerField
                          id={startInputId}
                          label={copy.scheduleStart}
                          value={slot.start}
                          options={GROUP_TIME_OPTIONS}
                          className="min-w-0"
                          onChange={(next) =>
                            updateSessionSlot(
                              block.id,
                              slot.id,
                              "start",
                              next,
                            )
                          }
                        />
                        <ClosingTimePickerField
                          id={endInputId}
                          label={copy.scheduleEnd}
                          value={slot.end}
                          options={GROUP_CLOSING_TIME_OPTIONS}
                          startTime={slot.start}
                          allowOvernight
                          className="min-w-0"
                          onChange={(next) =>
                            updateSessionSlot(block.id, slot.id, "end", next)
                          }
                        />
                        <div className="flex items-end justify-end">
                          <button
                            type="button"
                            onClick={() => removeSessionSlot(block.id, slot.id)}
                            className="flex h-12 w-12 items-center justify-center text-rose-500 transition hover:text-rose-400"
                            aria-label={copy.scheduleRemove}
                          >
                            <Trash2 className="h-6 w-6" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => addSessionSlot(block.id)}
                  className="text-xs font-semibold text-[rgb(var(--rt-primary-rgb))] hover:text-[rgb(var(--rt-primary-rgb)/0.75)]"
                >
                  {copy.sessionsAddSlot}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      )}
      {currentStep === 3 && (
        <section className="space-y-5">
          {photoSection}
          <button
            type="submit"
            disabled={submitting || !hasChanges}
            onClick={() => setSubmitAttempted(true)}
            className="rt-btn-group w-full px-6 py-3 text-base"
          >
            {submitting ? `${submittingLabel}...` : submitLabel}
          </button>
        </section>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5">
        <button
          type="button"
          onClick={goToPreviousStep}
          disabled={currentStep === 0 || submitting}
          className="rounded-full border border-slate-200 bg-white px-5 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:text-slate-400"
        >
          {copy.wizardBack}
        </button>
        {currentStep < steps.length - 1 && (
          <button
            type="button"
            onClick={goToNextStep}
            disabled={submitting}
            className="rt-btn-group inline-flex items-center justify-center px-6 py-2 text-sm"
          >
            {copy.wizardNext}
          </button>
        )}
      </div>
    </form>
  );
}
