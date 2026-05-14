"use client";

import { useEffect, useMemo, useState } from "react";
import { BaseNumberField } from "@/components/base-number-field";
import { BaseSelect } from "@/components/base-select";
import { BaseTextArea } from "@/components/base-text-area";
import { BaseTextField } from "@/components/base-text-field";
import { DatePickerField } from "@/components/date-picker-field";
import type { Option } from "@/components/groups/group-form";
import {
  ClosingTimePickerField,
  TimePickerField,
  createClosingTimeOptions,
  createTimeOptions,
  getOpeningTimeOptions,
  isClosingTimeAfterStart,
} from "@/components/time-picker-field";
import type { Locale } from "@/lib/i18n";
import {
  DEFAULT_PLAY_FORMAT,
  type PlayFormat,
} from "@/lib/play-format";

export type CasualPlayFormValues = {
  sportId: string;
  title: string;
  description: string;
  courtId: string;
  venueName: string;
  locationNote: string;
  playDate: string;
  startTime: string;
  endTime: string;
  playFormat?: PlayFormat | null;
  playerAmount?: string | null;
  phone?: string | null;
  lineId?: string | null;
  allowPublicContact?: boolean | null;
};

export type CasualPlayFormCopy = {
  sport: string;
  title: string;
  description: string;
  court: string;
  courtHelp: string;
  courtEmpty: string;
  venueName: string;
  venueNamePlaceholder: string;
  locationNote: string;
  locationNotePlaceholder: string;
  playDate: string;
  playDateHelp: string;
  startTime: string;
  endTime: string;
  endTimeHelp: string;
  clearTime: string;
  playFormatLabel: string;
  playFormatSingle: string;
  playFormatDouble: string;
  playerAmountLabel: string;
  playerAmountPlaceholder: string;
  playerAmountHelp: string;
  phoneLabel: string;
  phonePlaceholder: string;
  lineLabel: string;
  linePlaceholder: string;
  contactVisibilityLabel: string;
  contactVisibilityHelp: string;
  allowPublicContactLabel: string;
  requestToJoinLabel: string;
};

type SubmitPayload = {
  sportId: string;
  title: string;
  description: string;
  courtId: string;
  venueName?: string;
  locationNote?: string;
  playDate: string;
  startTime: string;
  endTime?: string;
  playFormat: PlayFormat;
  playerAmount?: string;
  phone?: string;
  lineId?: string;
  allowPublicContact?: boolean;
};

type CasualPlayFormProps = {
  initialValues: CasualPlayFormValues;
  sports: Option[];
  courts: Record<string, Option[]>;
  copy: CasualPlayFormCopy;
  locale: Locale;
  minDate: string;
  maxDate: string;
  onSubmit: (payload: SubmitPayload) => Promise<void> | void;
  submitting: boolean;
  submitLabel: string;
  submittingLabel: string;
  sportDisabled?: boolean;
  disableIfUnchanged?: boolean;
};

const CASUAL_PLAY_TIME_OPTIONS = createTimeOptions({ minuteStep: 30 });
const CASUAL_PLAY_CLOSING_TIME_OPTIONS = createClosingTimeOptions({
  minuteStep: 30,
});

export function CasualPlayForm({
  initialValues,
  sports,
  courts,
  copy,
  locale,
  minDate,
  maxDate,
  onSubmit,
  submitting,
  submitLabel,
  submittingLabel,
  sportDisabled = false,
  disableIfUnchanged = false,
}: CasualPlayFormProps) {
  const [form, setForm] = useState({
    sportId: initialValues.sportId,
    title: initialValues.title,
    description: initialValues.description,
    courtId: initialValues.courtId,
    venueName: initialValues.venueName,
    locationNote: initialValues.locationNote,
    playDate: initialValues.playDate,
    startTime: initialValues.startTime,
    endTime: initialValues.endTime,
    playFormat: initialValues.playFormat ?? DEFAULT_PLAY_FORMAT,
    playerAmount: initialValues.playerAmount ?? "",
    phone: initialValues.phone ?? "",
    lineId: initialValues.lineId ?? "",
    allowPublicContact: initialValues.allowPublicContact === true,
  });

  const sportOptions = useMemo(
    () =>
      sports.map((sport) => ({
        value: sport.value,
        label: sport.label,
      })),
    [sports],
  );
  const [courtCache, setCourtCache] = useState<Record<string, Option[]>>(courts);
  const courtOptions = useMemo(
    () => courtCache[form.sportId] ?? [],
    [courtCache, form.sportId],
  );

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
  }, [courtCache, form.sportId]);

  const updateField = (
    event: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = event.target;
    if (name === "sportId") {
      setForm((prev) => ({
        ...prev,
        sportId: value,
        courtId: "",
      }));
      return;
    }

    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const updateStartTime = (nextStartTime: string) => {
    setForm((prev) => ({
      ...prev,
      startTime: nextStartTime,
      endTime:
        prev.endTime &&
        nextStartTime &&
        !isClosingTimeAfterStart(prev.endTime, nextStartTime)
          ? ""
          : prev.endTime,
    }));
  };

  const updateEndTime = (nextEndTime: string) => {
    setForm((prev) => ({
      ...prev,
      endTime:
        nextEndTime &&
        prev.startTime &&
        !isClosingTimeAfterStart(nextEndTime, prev.startTime)
          ? ""
          : nextEndTime,
    }));
  };

  const initialSnapshot = useMemo(
    () =>
      JSON.stringify({
        ...initialValues,
        playFormat: initialValues.playFormat ?? DEFAULT_PLAY_FORMAT,
        playerAmount: initialValues.playerAmount ?? "",
        phone: initialValues.phone ?? "",
        lineId: initialValues.lineId ?? "",
        allowPublicContact: initialValues.allowPublicContact === true,
      }),
    [initialValues],
  );
  const currentSnapshot = useMemo(
    () => JSON.stringify(form),
    [form],
  );
  const hasChanges = currentSnapshot !== initialSnapshot;
  const submitDisabled =
    submitting || (disableIfUnchanged && !hasChanges);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSubmit({
      sportId: form.sportId,
      title: form.title,
      description: form.description,
      courtId: form.courtId,
      venueName: form.venueName,
      locationNote: form.locationNote,
      playDate: form.playDate,
      startTime: form.startTime,
      endTime: form.endTime,
      playFormat: form.playFormat,
      playerAmount: form.playerAmount,
      phone: form.phone,
      lineId: form.lineId,
      allowPublicContact: form.allowPublicContact,
    });
  };

  return (
    <form className="space-y-5 text-[var(--foreground)]" onSubmit={handleSubmit}>
      <BaseSelect
        label={copy.sport}
        name="sportId"
        value={form.sportId}
        onChange={updateField}
        options={sportOptions}
        disabled={sportDisabled}
        required
        variant="light"
      />
      <div className="space-y-2">
        <label className="text-sm font-semibold text-[var(--foreground)]">
          {copy.title}
        </label>
        <BaseTextField
          type="text"
          name="title"
          value={form.title}
          onChange={updateField}
          required
          variant="light"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-semibold text-[var(--foreground)]">
          {copy.description}
        </label>
        <BaseTextArea
          name="description"
          value={form.description}
          onChange={updateField}
          rows={4}
          variant="light"
        />
      </div>
      <BaseSelect
        label={copy.court}
        name="courtId"
        value={form.courtId}
        onChange={updateField}
        options={[
          { value: "", label: copy.courtEmpty },
          ...courtOptions,
        ]}
        variant="light"
      />
      <p className="-mt-3 text-xs text-[rgb(var(--foreground-rgb)/0.65)]">
        {copy.courtHelp}
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-[var(--foreground)]">
            {copy.venueName}
          </label>
          <BaseTextField
            type="text"
            name="venueName"
            value={form.venueName}
            onChange={updateField}
            placeholder={copy.venueNamePlaceholder}
            required={!form.courtId}
            variant="light"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-[var(--foreground)]">
            {copy.locationNote}
          </label>
          <BaseTextField
            type="text"
            name="locationNote"
            value={form.locationNote}
            onChange={updateField}
            placeholder={copy.locationNotePlaceholder}
            variant="light"
          />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <DatePickerField
            label={copy.playDate}
            value={form.playDate}
            onChange={(nextValue) =>
              setForm((prev) => ({
                ...prev,
                playDate: nextValue,
              }))}
            locale={locale}
            min={minDate}
            max={maxDate}
            required
            className="space-y-0"
          />
          <p className="text-xs text-[rgb(var(--foreground-rgb)/0.65)]">
            {copy.playDateHelp}
          </p>
        </div>
        <div className="space-y-2">
          <TimePickerField
            label={copy.startTime}
            value={form.startTime}
            onChange={updateStartTime}
            options={
              form.endTime
                ? getOpeningTimeOptions({
                    closeTime: form.endTime,
                    options: CASUAL_PLAY_TIME_OPTIONS,
                  })
                : CASUAL_PLAY_TIME_OPTIONS
            }
            minuteStep={30}
            required
            className="space-y-0"
          />
        </div>
        <div className="space-y-2">
          <ClosingTimePickerField
            label={copy.endTime}
            value={form.endTime}
            onChange={updateEndTime}
            options={CASUAL_PLAY_CLOSING_TIME_OPTIONS}
            startTime={form.startTime}
            minuteStep={30}
            allowClear
            clearLabel={copy.clearTime}
            className="space-y-0"
          />
          <p className="text-xs text-[rgb(var(--foreground-rgb)/0.65)]">
            {copy.endTimeHelp}
          </p>
        </div>
      </div>
      <BaseSelect
        label={copy.playFormatLabel}
        name="playFormat"
        value={form.playFormat}
        onChange={updateField}
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
          onChange={updateField}
          variant="light"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-[var(--foreground)]">
            {copy.phoneLabel}
          </label>
          <BaseTextField
            type="tel"
            name="phone"
            value={form.phone}
            onChange={updateField}
            placeholder={copy.phonePlaceholder}
            variant="light"
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
            onChange={updateField}
            placeholder={copy.linePlaceholder}
            variant="light"
          />
        </div>
      </div>
      <fieldset className="space-y-3 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4">
        <legend className="text-sm font-semibold text-[var(--foreground)]">
          {copy.contactVisibilityLabel}
        </legend>
        <p className="text-xs text-[rgb(var(--foreground-rgb)/0.65)]">
          {copy.contactVisibilityHelp}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
            <input
              type="radio"
              name="contactVisibility"
              checked={!form.allowPublicContact}
              onChange={() =>
                setForm((prev) => ({ ...prev, allowPublicContact: false }))
              }
              className="mt-1"
            />
            <span className="font-semibold">{copy.requestToJoinLabel}</span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
            <input
              type="radio"
              name="contactVisibility"
              checked={form.allowPublicContact}
              onChange={() =>
                setForm((prev) => ({ ...prev, allowPublicContact: true }))
              }
              className="mt-1"
            />
            <span className="font-semibold">{copy.allowPublicContactLabel}</span>
          </label>
        </div>
      </fieldset>
      <button
        type="submit"
        disabled={submitDisabled}
        className="rt-btn-primary w-full px-6 py-3 text-base disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? `${submittingLabel}...` : submitLabel}
      </button>
    </form>
  );
}
