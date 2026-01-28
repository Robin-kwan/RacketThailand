"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Clock3, Trash2 } from "lucide-react";
import { BaseSelect } from "@/components/base-select";
import { BaseAutocomplete } from "@/components/base-autocomplete";
import { BaseTextField } from "@/components/base-text-field";
import { BaseNumberField } from "@/components/base-number-field";
import { BaseTextArea } from "@/components/base-text-area";

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
export type GroupFormValues = {
  sportId: string;
  name: string;
  description: string;
  sessions: CourtSessionBlock[];
  playerAmount?: string | null;
  phone?: string | null;
  lineId?: string | null;
};

export type GroupFormCopy = {
  sport: string;
  name: string;
  description: string;
  sessionsLabel: string;
  sessionsTitle?: string;
  sessionsAddCourt: string;
  sessionsAddSlot: string;
  sessionsRemoveCourt: string;
  sessionsEmpty: string;
  sessionCourt: string;
  scheduleLabel: string;
  scheduleDay: string;
  scheduleStart: string;
  scheduleEnd: string;
  scheduleRemove: string;
  playerAmountLabel: string;
  playerAmountPlaceholder: string;
  playerAmountHelp: string;
  phoneLabel: string;
  phonePlaceholder: string;
  lineLabel: string;
  linePlaceholder: string;
  lineQrLabel: string;
};

type SubmitPayload = {
  sportId: string;
  name: string;
  description: string;
  sessions: { courtId: string; day: string; start: string; end: string }[];
  playerAmount?: string;
  phone?: string;
  lineId?: string;
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
  start: "",
  end: "",
});

type TimeOption = {
  value: string;
  label: string;
};

const TIME_OPTIONS: TimeOption[] = createTimeOptions();

function createTimeOptions(): TimeOption[] {
  const options: TimeOption[] = [];
  const stepMinutes = 30;
  for (let hour = 0; hour < 24; hour += 1) {
    for (let minute = 0; minute < 60; minute += stepMinutes) {
      const value = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
      const displayHour = ((hour + 11) % 12) + 1;
      const period = hour >= 12 ? "PM" : "AM";
      const label = `${displayHour}:${String(minute).padStart(2, "0")} ${period}`;
      options.push({ value, label });
    }
  }
  return options;
}

type TimePickerFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
};

const formatDisplayTime = (time: string) => {
  if (!time) return "";
  const [hours, minutes] = time.split(":");
  if (typeof hours === "undefined" || typeof minutes === "undefined") {
    return time;
  }
  return `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}`;
};

function TimePickerField({ id, label, value, onChange }: TimePickerFieldProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (containerRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  const handleSelect = (time: string) => {
    onChange(time === value ? "" : time);
    setOpen(false);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value);
  };

  const handleInputClick = () => {
    setOpen((prev) => !prev);
  };

  const handleInputFocus = () => {
    setOpen(true);
  };

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setOpen(false);
    }
  };

  const handleOptionKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      setOpen(false);
    }
  };

  const displayValue = value ?? "";
  const formattedValue = formatDisplayTime(displayValue);

  return (
    <div className="space-y-1" ref={containerRef}>
      <label
        className="text-xs font-semibold text-[rgb(var(--foreground-rgb)/0.65)]"
        htmlFor={id}
      >
        {label}
      </label>
      <div className="relative rounded-2xl border border-slate-200 bg-white transition focus-within:border-slate-400 focus-within:bg-white">
        <div className="pointer-events-none flex h-12 items-center justify-between px-4 text-sm text-[var(--foreground)]">
          <span
            className={
              formattedValue
                ? "text-[var(--foreground)]"
                : "text-[rgb(var(--foreground-rgb)/0.55)]"
            }
          >
            {formattedValue || label}
          </span>
          <Clock3
            className="h-5 w-5 text-[rgb(var(--foreground-rgb)/0.5)]"
            aria-hidden="true"
          />
        </div>
        <input
          id={id}
          type="time"
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          value={displayValue}
          onClick={handleInputClick}
          onFocus={handleInputFocus}
          onKeyDown={handleInputKeyDown}
          onChange={handleInputChange}
          aria-haspopup="listbox"
        />
        {open && (
          <div
            className="absolute inset-x-0 top-full z-30 mt-2 rounded-3xl border border-slate-200 bg-white p-2 shadow-lg"
            onKeyDown={handleOptionKeyDown}
          >
            <div className="max-h-60 overflow-y-auto pr-1">
              {TIME_OPTIONS.map((option) => {
                const selected = option.value === value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    className={`flex w-full items-center justify-between rounded-2xl px-3 py-2 text-sm transition ${
                      selected
                        ? "bg-slate-100 text-[var(--foreground)]"
                        : "text-[var(--foreground)] hover:bg-slate-50"
                    }`}
                    onClick={() => handleSelect(option.value)}
                    role="option"
                    aria-selected={selected}
                  >
                    <span className="font-medium">{option.label}</span>
                    <span className="text-xs text-[rgb(var(--foreground-rgb)/0.5)]">
                      {option.value}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

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
    playerAmount: initialValues.playerAmount ?? "",
    phone: initialValues.phone ?? "",
    lineId: initialValues.lineId ?? "",
  });
  const [courtSessions, setCourtSessions] = useState<CourtSessionBlock[]>(
    initialValues.sessions,
  );
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
  }, [form.sportId, courtCache]);

  const updateForm = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (name === "sportId") {
      const nextOptions = courtCache[value] ?? [];
      const fallbackCourtId = nextOptions[0]?.value ?? "";
      const optionSet = new Set(nextOptions.map((option) => option.value));
      setCourtSessions((prev) =>
        prev.map((block) => {
          if (optionSet.size === 0) {
            return { ...block, courtId: "" };
          }
          if (optionSet.has(block.courtId)) {
            return block;
          }
          return { ...block, courtId: fallbackCourtId };
        }),
      );
    }
  };

  const addCourtBlock = () => {
    const defaultCourtId = courtOptions[0]?.value ?? "";
    setCourtSessions((prev) => [
      ...prev,
      {
        id: crypto.randomUUID
          ? crypto.randomUUID()
          : `court-${Date.now()}-${Math.random()}`,
        courtId: defaultCourtId,
        slots: [{ ...createSlot() }],
      },
    ]);
  };

  const updateCourtBlock = (blockId: string, courtId: string) => {
    setCourtSessions((prev) =>
      prev.map((block) =>
        block.id === blockId ? { ...block, courtId } : block,
      ),
    );
  };

  const removeCourtBlock = (blockId: string) => {
    setCourtSessions((prev) => prev.filter((block) => block.id !== blockId));
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
              slots: block.slots.map((slot) =>
                slot.id === slotId ? { ...slot, [field]: value } : slot,
              ),
            }
          : block,
      ),
    );
  };

  const removeSessionSlot = (blockId: string, slotId: string) => {
    setCourtSessions((prev) =>
      prev
        .map((block) =>
          block.id === blockId
            ? { ...block, slots: block.slots.filter((slot) => slot.id !== slotId) }
            : block,
        )
        .filter((block) => block.slots.length > 0),
    );
  };

  const serializedSessions = useMemo(
    () => normalizeSessions(courtSessions),
    [courtSessions],
  );

  const initialSnapshot = useMemo(
    () =>
      JSON.stringify({
        sportId: initialValues.sportId,
        name: initialValues.name,
        description: initialValues.description,
        playerAmount: initialValues.playerAmount ?? "",
        phone: initialValues.phone ?? "",
        lineId: initialValues.lineId ?? "",
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
        playerAmount: form.playerAmount,
        phone: form.phone,
        lineId: form.lineId,
        sessions: serializedSessions,
      }),
    [form, serializedSessions],
  );

  const hasChanges = currentSnapshot !== initialSnapshot || externalDirty;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSubmit({
      sportId: form.sportId,
      name: form.name,
      description: form.description,
      playerAmount: form.playerAmount,
      phone: form.phone,
      lineId: form.lineId,
      sessions: serializedSessions,
    });
  };

  return (
    <form className="space-y-5 text-[var(--foreground)]" onSubmit={handleSubmit}>
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
        />
      </div>
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
      <div className="grid gap-4 sm:grid-cols-2">
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
          />
        </div>
      </div>
      {lineQrSection}
      <div className="space-y-3 rounded-2xl border border-dashed border-slate-200 bg-[rgb(var(--foreground-rgb)/0.02)] p-4">
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
                className="space-y-3 rounded-2xl border border-slate-200 bg-white/70 p-4"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <BaseAutocomplete
                    label={copy.sessionCourt}
                    name={`session-court-${block.id}`}
                    value={block.courtId}
                    onChange={(event) =>
                      updateCourtBlock(block.id, event.target.value)
                    }
                    options={courtOptions}
                    className="flex-1"
                    variant="light"
                  />
                  <div className="flex items-end justify-end">
                    <button
                      type="button"
                      onClick={() => removeCourtBlock(block.id)}
                      className="flex h-12 w-12 items-center justify-center text-rose-500 transition hover:text-rose-400"
                    >
                      <Trash2 className="h-6 w-6" />
                    </button>
                  </div>
                </div>
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase text-[rgb(var(--foreground-rgb)/0.5)]">
                    {copy.sessionsTitle ?? copy.scheduleLabel}
                  </p>
                  {block.slots.map((slot) => {
                    const startInputId = `session-${block.id}-${slot.id}-start`;
                    const endInputId = `session-${block.id}-${slot.id}-end`;
                    return (
                      <div
                        key={slot.id}
                        className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]"
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
                          onChange={(next) =>
                            updateSessionSlot(
                              block.id,
                              slot.id,
                              "start",
                              next,
                            )
                          }
                        />
                        <TimePickerField
                          id={endInputId}
                          label={copy.scheduleEnd}
                          value={slot.end}
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
      {photoSection}
      <button
        type="submit"
        disabled={submitting || !hasChanges}
        className="rt-btn-primary w-full px-6 py-3 text-base"
      >
        {submitting ? `${submittingLabel}...` : submitLabel}
      </button>
    </form>
  );
}
