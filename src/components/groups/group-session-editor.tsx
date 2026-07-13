"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import type { FormEvent } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { BaseSelect } from "@/components/base-select";
import { BaseTextArea } from "@/components/base-text-area";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { DatePickerField } from "@/components/date-picker-field";
import { showToast } from "@/components/toaster";
import {
  ClosingTimePickerField,
  TimePickerField,
  createClosingTimeOptions,
  createTimeOptions,
} from "@/components/time-picker-field";

type Option = {
  value: string;
  label: string;
};

type SessionValue = {
  id: string;
  day: string;
  startTime: string | null;
  endTime: string | null;
};

export type GroupSessionEditorCopy = {
  edit: string;
  title: string;
  add: string;
  remove: string;
  save: string;
  saving: string;
  cancel: string;
  success: string;
  error: string;
  required: string;
  dayLabel: string;
  dateLabel: string;
  startLabel: string;
  endLabel: string;
  notesLabel: string;
  notesPlaceholder: string;
  clearTime: string;
  empty: string;
  dateRangeError: string;
  removeCourt: string;
  removeCourtConfirm: string;
  removeCourtSuccess: string;
  removeCourtError: string;
  deleteEvent: string;
  deleteEventConfirm: string;
  deleteEventSuccess: string;
  deleteEventError: string;
  deleteWeeklySession: string;
  deleteWeeklySessionConfirm: string;
  deleteWeeklySessionSuccess: string;
  deleteWeeklySessionError: string;
};

type EditableSession = {
  key: string;
  id?: string;
  day: string;
  start: string;
  end: string;
};

type GroupSessionEditorProps = {
  groupId: string;
  courtId: string;
  sessions: SessionValue[];
  dayOptions: Option[];
  copy: GroupSessionEditorCopy;
};

type GroupEventEditorProps = {
  groupId: string;
  eventId: string;
  courtId: string;
  startsAt: string;
  endsAt: string | null;
  notes: string | null;
  locale: "th" | "en";
  copy: GroupSessionEditorCopy;
};

type GroupWeeklySessionEditorProps = {
  groupId: string;
  sessionId: string;
  courtId: string;
  day: string;
  startTime: string | null;
  endTime: string | null;
  dayOptions: Option[];
  copy: GroupSessionEditorCopy;
};

const TIME_OPTIONS = createTimeOptions({ minuteStep: 30 });
const CLOSING_TIME_OPTIONS = createClosingTimeOptions({ minuteStep: 30 });

function normalizeTime(value: string | null | undefined) {
  return value ? value.slice(0, 5) : "00:00";
}

function getThailandDate(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const partMap = new Map(parts.map((part) => [part.type, part.value]));
  return [
    partMap.get("year"),
    partMap.get("month"),
    partMap.get("day"),
  ].join("-");
}

function formatDateForInput(value: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  const partMap = new Map(parts.map((part) => [part.type, part.value]));
  return [
    partMap.get("year"),
    partMap.get("month"),
    partMap.get("day"),
  ].join("-");
}

function formatTimeForInput(value: string | null) {
  if (!value) return "";
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Bangkok",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));
  const partMap = new Map(parts.map((part) => [part.type, part.value]));
  return `${partMap.get("hour") ?? "00"}:${partMap.get("minute") ?? "00"}`;
}

function createEmptySession(dayOptions: Option[]): EditableSession {
  return {
    key: crypto.randomUUID(),
    day: dayOptions[0]?.value ?? "sunday",
    start: "00:00",
    end: "00:00",
  };
}

function createInitialRows(
  sessions: SessionValue[],
  dayOptions: Option[],
): EditableSession[] {
  if (sessions.length === 0) {
    return [createEmptySession(dayOptions)];
  }

  return sessions.map((session) => ({
    key: session.id,
    id: session.id,
    day: session.day,
    start: normalizeTime(session.startTime),
    end: normalizeTime(session.endTime),
  }));
}

export function GroupSessionEditor({
  groupId,
  courtId,
  sessions,
  dayOptions,
  copy,
}: GroupSessionEditorProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState(() => createInitialRows(sessions, dayOptions));
  const [validationVisible, setValidationVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingCourt, setDeletingCourt] = useState(false);
  const [confirmRemoveCourtOpen, setConfirmRemoveCourtOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const canRemoveCourt = sessions.length === 0;

  const isInvalid = useMemo(
    () => rows.some((row) => !row.day || !row.start || !row.end),
    [rows],
  );

  const resetRows = () => {
    setRows(createInitialRows(sessions, dayOptions));
    setValidationVisible(false);
  };

  const updateRow = (
    key: string,
    field: keyof Pick<EditableSession, "day" | "start" | "end">,
    value: string,
  ) => {
    setRows((currentRows) =>
      currentRows.map((row) =>
        row.key === key
          ? {
              ...row,
              [field]: value,
            }
          : row,
      ),
    );
  };

  const handleCancel = () => {
    resetRows();
    setOpen(false);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setValidationVisible(true);

    if (isInvalid) {
      showToast({ variant: "error", message: copy.required });
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/groups/${groupId}/sessions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courtId,
          sessions: rows.map((row) => ({
            id: row.id,
            day: row.day,
            start: row.start,
            end: row.end,
          })),
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        showToast({
          variant: "error",
          message: payload?.error ?? copy.error,
        });
        return;
      }

      showToast({ variant: "success", message: copy.success });
      setOpen(false);
      setValidationVisible(false);
      startTransition(() => router.refresh());
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveCourt = async () => {
    setDeletingCourt(true);
    try {
      const response = await fetch(`/api/groups/${groupId}/sessions`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "court",
          courtId,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        showToast({
          variant: "error",
          message: payload?.error ?? copy.removeCourtError,
        });
        return;
      }

      showToast({ variant: "success", message: copy.removeCourtSuccess });
      setConfirmRemoveCourtOpen(false);
      startTransition(() => router.refresh());
    } finally {
      setDeletingCourt(false);
    }
  };

  return (
    <Fragment>
      <button
        type="button"
        onClick={() => {
          if (!open) resetRows();
          setOpen((current) => !current);
        }}
        className="inline-flex shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
      >
        <Pencil className="h-3.5 w-3.5" aria-hidden />
        {copy.edit}
      </button>

      {open && (
        <form
          onSubmit={handleSubmit}
          className="basis-full rounded-lg border border-slate-200 bg-slate-50/70 p-4"
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-[var(--foreground)]">
              {copy.title}
            </h3>
            <button
              type="button"
              onClick={handleCancel}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:text-slate-900"
              aria-label={copy.cancel}
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>

          <div className="space-y-3">
            {rows.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
                {copy.empty}
              </p>
            ) : (
              rows.map((row) => (
                <div
                  key={row.key}
                  className="grid gap-3 rounded-lg border border-slate-200 bg-white p-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]"
                >
                  <BaseSelect
                    label={copy.dayLabel}
                    name={`session-day-${row.key}`}
                    value={row.day}
                    onChange={(event) =>
                      updateRow(row.key, "day", event.target.value)
                    }
                    options={dayOptions}
                    required
                    variant="light"
                  />
                  <TimePickerField
                    label={copy.startLabel}
                    value={row.start}
                    options={TIME_OPTIONS}
                    onChange={(value) => updateRow(row.key, "start", value)}
                  />
                  <ClosingTimePickerField
                    label={copy.endLabel}
                    value={row.end}
                    options={CLOSING_TIME_OPTIONS}
                    startTime={row.start}
                    allowOvernight
                    allowClear
                    clearLabel={copy.clearTime}
                    onChange={(value) => updateRow(row.key, "end", value)}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setRows((currentRows) =>
                        currentRows.filter((currentRow) => currentRow.key !== row.key),
                      )
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-rose-100 bg-white px-3 py-2 text-xs font-semibold text-rose-500 transition hover:border-rose-200 hover:bg-rose-50 md:self-end"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    {copy.remove}
                  </button>
                </div>
              ))
            )}
          </div>

          {validationVisible && isInvalid && (
            <p className="mt-3 text-sm font-medium text-rose-600">
              {copy.required}
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setRows((currentRows) => [
                    ...currentRows,
                    createEmptySession(dayOptions),
                  ])
                }
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-[var(--rt-primary)] transition hover:border-[rgb(var(--rt-primary-rgb)/0.35)] hover:bg-[rgb(var(--rt-primary-rgb)/0.06)]"
              >
                <Plus className="h-4 w-4" aria-hidden />
                {copy.add}
              </button>
              {canRemoveCourt && (
                <button
                  type="button"
                  disabled={deletingCourt || isPending}
                  onClick={() => setConfirmRemoveCourtOpen(true)}
                  className="inline-flex items-center gap-2 rounded-full border border-rose-100 bg-white px-4 py-2 text-sm font-semibold text-rose-500 transition hover:border-rose-200 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                  {deletingCourt ? `${copy.saving}...` : copy.removeCourt}
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCancel}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
              >
                {copy.cancel}
              </button>
              <button
                type="submit"
                disabled={submitting || isPending}
                className="rt-btn-group inline-flex items-center justify-center px-5 py-2 text-sm"
              >
                {submitting || isPending ? `${copy.saving}...` : copy.save}
              </button>
            </div>
          </div>
        </form>
      )}
      <ConfirmationDialog
        open={confirmRemoveCourtOpen}
        title={copy.removeCourt}
        message={copy.removeCourtConfirm}
        confirmLabel={copy.removeCourt}
        cancelLabel={copy.cancel}
        loading={deletingCourt}
        onConfirm={handleRemoveCourt}
        onClose={() => setConfirmRemoveCourtOpen(false)}
      />
    </Fragment>
  );
}

export function GroupWeeklySessionEditor({
  groupId,
  sessionId,
  courtId,
  day: initialDay,
  startTime,
  endTime,
  dayOptions,
  copy,
}: GroupWeeklySessionEditorProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [day, setDay] = useState(initialDay);
  const [start, setStart] = useState(normalizeTime(startTime));
  const [end, setEnd] = useState(normalizeTime(endTime));
  const [validationVisible, setValidationVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const isInvalid = !day || !start || !end;

  const resetDraft = useCallback(() => {
    setDay(initialDay);
    setStart(normalizeTime(startTime));
    setEnd(normalizeTime(endTime));
    setValidationVisible(false);
  }, [endTime, initialDay, startTime]);

  const close = useCallback(() => {
    if (submitting || deleting || isPending) return;
    resetDraft();
    setOpen(false);
  }, [deleting, isPending, resetDraft, submitting]);

  useEffect(() => {
    if (!open || submitting || deleting || isPending) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [close, deleting, isPending, open, submitting]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setValidationVisible(true);

    if (isInvalid) {
      showToast({ variant: "error", message: copy.required });
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/groups/${groupId}/sessions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "weekly",
          sessionId,
          courtId,
          day,
          start,
          end,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        showToast({
          variant: "error",
          message: payload?.error ?? copy.error,
        });
        return;
      }

      showToast({ variant: "success", message: copy.success });
      setOpen(false);
      setValidationVisible(false);
      startTransition(() => router.refresh());
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const response = await fetch(`/api/groups/${groupId}/sessions`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "weekly", sessionId }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        showToast({
          variant: "error",
          message: payload?.error ?? copy.deleteWeeklySessionError,
        });
        return;
      }

      showToast({ variant: "success", message: copy.deleteWeeklySessionSuccess });
      setConfirmDeleteOpen(false);
      setOpen(false);
      startTransition(() => router.refresh());
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Fragment>
      <button
        type="button"
        onClick={() => {
          if (!open) resetDraft();
          setOpen(true);
        }}
        className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-800"
        aria-label={copy.edit}
        title={copy.edit}
      >
        <Pencil className="size-3.5" aria-hidden />
      </button>

      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed inset-0 z-[9997] flex items-center justify-center bg-slate-950/45 px-4 py-8 backdrop-blur-sm"
              role="presentation"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                  close();
                }
              }}
            >
              <form
                onSubmit={handleSubmit}
                role="dialog"
                aria-modal="true"
                aria-label={copy.title}
                className="w-full max-w-lg rounded-lg border border-white/80 bg-white p-5 shadow-[0_24px_80px_rgb(15_23_42/0.28)] sm:p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-950">
                      {copy.title}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={close}
                    className="inline-flex size-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:text-slate-900"
                    aria-label={copy.cancel}
                    title={copy.cancel}
                  >
                    <X className="size-4" aria-hidden />
                  </button>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-3">
                  <BaseSelect
                    label={copy.dayLabel}
                    name={`session-day-${sessionId}`}
                    value={day}
                    onChange={(event) => setDay(event.target.value)}
                    options={dayOptions}
                    required
                    variant="light"
                  />
                  <TimePickerField
                    label={copy.startLabel}
                    value={start}
                    options={TIME_OPTIONS}
                    onChange={setStart}
                  />
                  <ClosingTimePickerField
                    label={copy.endLabel}
                    value={end}
                    options={CLOSING_TIME_OPTIONS}
                    startTime={start}
                    allowOvernight
                    clearLabel={copy.clearTime}
                    onChange={setEnd}
                  />
                </div>

                {validationVisible && isInvalid && (
                  <p className="mt-3 text-sm font-medium text-rose-600">
                    {copy.required}
                  </p>
                )}

                <div className="mt-6 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    disabled={deleting || isPending}
                    onClick={() => setConfirmDeleteOpen(true)}
                    className="inline-flex size-10 items-center justify-center rounded-lg border border-rose-100 bg-white text-rose-500 transition hover:border-rose-200 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label={copy.deleteWeeklySession}
                    title={copy.deleteWeeklySession}
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={close}
                      className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
                    >
                      {copy.cancel}
                    </button>
                    <button
                      type="submit"
                      disabled={submitting || isPending}
                      className="rt-btn-group inline-flex items-center justify-center px-5 py-2 text-sm"
                    >
                      {submitting || isPending ? `${copy.saving}...` : copy.save}
                    </button>
                  </div>
                </div>
              </form>
            </div>,
            document.body,
          )
        : null}
      <ConfirmationDialog
        open={confirmDeleteOpen}
        title={copy.deleteWeeklySession}
        message={copy.deleteWeeklySessionConfirm}
        confirmLabel={copy.deleteWeeklySession}
        cancelLabel={copy.cancel}
        loading={deleting}
        onConfirm={handleDelete}
        onClose={() => setConfirmDeleteOpen(false)}
      />
    </Fragment>
  );
}

export function GroupEventEditor({
  groupId,
  eventId,
  courtId,
  startsAt,
  endsAt,
  notes,
  locale,
  copy,
}: GroupEventEditorProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(() => formatDateForInput(startsAt));
  const [start, setStart] = useState(() => formatTimeForInput(startsAt));
  const [end, setEnd] = useState(() => formatTimeForInput(endsAt));
  const [draftNotes, setDraftNotes] = useState(notes ?? "");
  const [validationVisible, setValidationVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const today = getThailandDate(0);
  const maxDate = getThailandDate(30);
  const isInvalid = !date || date < today || date > maxDate || !start;

  const resetDraft = useCallback(() => {
    setDate(formatDateForInput(startsAt));
    setStart(formatTimeForInput(startsAt));
    setEnd(formatTimeForInput(endsAt));
    setDraftNotes(notes ?? "");
    setValidationVisible(false);
  }, [endsAt, notes, startsAt]);

  const close = useCallback(() => {
    if (submitting || deleting || isPending) return;
    resetDraft();
    setOpen(false);
  }, [deleting, isPending, resetDraft, submitting]);

  useEffect(() => {
    if (!open || submitting || deleting || isPending) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [close, deleting, isPending, open, submitting]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setValidationVisible(true);

    if (isInvalid) {
      showToast({
        variant: "error",
        message: date && (date < today || date > maxDate)
          ? copy.dateRangeError
          : copy.required,
      });
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/groups/${groupId}/sessions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "date",
          eventId,
          courtId,
          date,
          start,
          end,
          notes: draftNotes,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        showToast({
          variant: "error",
          message: payload?.error ?? copy.error,
        });
        return;
      }

      showToast({ variant: "success", message: copy.success });
      setOpen(false);
      setValidationVisible(false);
      startTransition(() => router.refresh());
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const response = await fetch(`/api/groups/${groupId}/sessions`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "date",
          eventId,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        showToast({
          variant: "error",
          message: payload?.error ?? copy.deleteEventError,
        });
        return;
      }

      showToast({ variant: "success", message: copy.deleteEventSuccess });
      setConfirmDeleteOpen(false);
      setOpen(false);
      startTransition(() => router.refresh());
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Fragment>
      <button
        type="button"
        onClick={() => {
          if (!open) resetDraft();
          setOpen(true);
        }}
        className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-800"
        aria-label={copy.edit}
        title={copy.edit}
      >
        <Pencil className="size-3.5" aria-hidden />
      </button>

      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed inset-0 z-[9997] flex items-center justify-center bg-slate-950/45 px-4 py-8 backdrop-blur-sm"
              role="presentation"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                  close();
                }
              }}
            >
              <form
                onSubmit={handleSubmit}
                role="dialog"
                aria-modal="true"
                aria-label={copy.title}
                className="w-full max-w-xl rounded-lg border border-white/80 bg-white p-5 shadow-[0_24px_80px_rgb(15_23_42/0.28)] sm:p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-950">
                      {copy.title}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={close}
                    className="inline-flex size-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:text-slate-900"
                    aria-label={copy.cancel}
                    title={copy.cancel}
                  >
                    <X className="size-4" aria-hidden />
                  </button>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-3">
                  <DatePickerField
                    label={copy.dateLabel}
                    value={date}
                    onChange={setDate}
                    locale={locale}
                    min={today}
                    max={maxDate}
                    required
                  />
                  <TimePickerField
                    label={copy.startLabel}
                    value={start}
                    options={TIME_OPTIONS}
                    onChange={setStart}
                  />
                  <ClosingTimePickerField
                    label={copy.endLabel}
                    value={end}
                    options={CLOSING_TIME_OPTIONS}
                    startTime={start}
                    allowOvernight
                    allowClear
                    clearLabel={copy.clearTime}
                    onChange={setEnd}
                  />
                </div>

                <div className="mt-4 space-y-2">
                  <label className="text-sm font-semibold text-slate-950">
                    {copy.notesLabel}
                  </label>
                  <BaseTextArea
                    value={draftNotes}
                    onChange={(event) => setDraftNotes(event.target.value)}
                    placeholder={copy.notesPlaceholder}
                    rows={2}
                    variant="light"
                  />
                </div>

                {validationVisible && isInvalid && (
                  <p className="mt-3 text-sm font-medium text-rose-600">
                    {date && (date < today || date > maxDate)
                      ? copy.dateRangeError
                      : copy.required}
                  </p>
                )}

                <div className="mt-6 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    disabled={deleting || isPending}
                    onClick={() => setConfirmDeleteOpen(true)}
                    className="inline-flex size-10 items-center justify-center rounded-lg border border-rose-100 bg-white text-rose-500 transition hover:border-rose-200 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label={copy.deleteEvent}
                    title={copy.deleteEvent}
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={close}
                      className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
                    >
                      {copy.cancel}
                    </button>
                    <button
                      type="submit"
                      disabled={submitting || isPending}
                      className="rt-btn-group inline-flex items-center justify-center px-5 py-2 text-sm"
                    >
                      {submitting || isPending ? `${copy.saving}...` : copy.save}
                    </button>
                  </div>
                </div>
              </form>
            </div>,
            document.body,
          )
        : null}
      <ConfirmationDialog
        open={confirmDeleteOpen}
        title={copy.deleteEvent}
        message={copy.deleteEventConfirm}
        confirmLabel={copy.deleteEvent}
        cancelLabel={copy.cancel}
        loading={deleting}
        onConfirm={handleDelete}
        onClose={() => setConfirmDeleteOpen(false)}
      />
    </Fragment>
  );
}
