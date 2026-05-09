import {
  getMaxCasualPlayDateString,
  getThailandTodayDateString,
  isCasualPlayDateAllowed,
  isCasualPlayTimeRangeValid,
} from "@/lib/casual-play";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^\d{2}:\d{2}$/;

export type CasualPlayPayloadInput = {
  sportId?: string;
  courtId?: string;
  venueName?: string | null;
  locationNote?: string | null;
  title?: string;
  description?: string;
  playDate?: string;
  startTime?: string;
  endTime?: string | null;
  playFormat?: string | null;
  playerAmount?: number | string | null;
  phone?: string | null;
  lineId?: string | null;
  allowPublicContact?: boolean | null;
};

export type NormalizedCasualPlayPayload = {
  sportId: string;
  courtId: string | null;
  venueName: string | null;
  locationNote: string | null;
  title: string;
  description: string | null;
  playDate: string;
  startTime: string;
  endTime: string | null;
  playFormat: "single" | "double";
  playerAmount: number | null;
  phone: string | null;
  lineId: string | null;
  allowPublicContact: boolean;
};

function normalizeRequiredText(value?: string) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeOptionalText(value?: string | null) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeTime(value?: string) {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return TIME_PATTERN.test(trimmed) ? trimmed : "";
}

function normalizeOptionalTime(value?: string | null) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return TIME_PATTERN.test(trimmed) ? trimmed : "";
}

function normalizePlayerAmount(value?: number | string | null) {
  if (typeof value === "number") {
    if (Number.isFinite(value) && value > 0) {
      return Math.round(value);
    }
    return null;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.round(parsed);
    }
  }
  return null;
}

function normalizePlayFormat(value?: string | null) {
  return value === "single" || value === "double" ? value : "double";
}

export function validateCasualPlayPayload(
  payload: CasualPlayPayloadInput,
  now = new Date(),
):
  | { ok: true; value: NormalizedCasualPlayPayload }
  | { ok: false; error: string } {
  const sportId = normalizeRequiredText(payload.sportId);
  const courtId = normalizeOptionalText(payload.courtId);
  const venueName = normalizeOptionalText(payload.venueName);
  const locationNote = normalizeOptionalText(payload.locationNote);
  const title = normalizeRequiredText(payload.title);
  const playDate = normalizeRequiredText(payload.playDate);
  const startTime = normalizeTime(payload.startTime);
  const endTime = normalizeOptionalTime(payload.endTime);
  const playFormat = normalizePlayFormat(payload.playFormat);
  const phone = normalizeOptionalText(payload.phone);
  const lineId = normalizeOptionalText(payload.lineId);
  const allowPublicContact = payload.allowPublicContact === true;

  if (!sportId || !title || !playDate || !startTime) {
    return {
      ok: false,
      error: "Missing required casual play fields.",
    };
  }

  if (!courtId && !venueName) {
    return {
      ok: false,
      error: "Choose a linked court or enter a venue name.",
    };
  }

  if (endTime === "") {
    return {
      ok: false,
      error: "End time must use HH:MM when provided.",
    };
  }

  if (!DATE_PATTERN.test(playDate)) {
    return {
      ok: false,
      error: "Play date must use YYYY-MM-DD.",
    };
  }

  const minDate = getThailandTodayDateString(now);
  const maxDate = getMaxCasualPlayDateString(now);
  if (!isCasualPlayDateAllowed(playDate, now)) {
    return {
      ok: false,
      error: `Casual plays must be scheduled between ${minDate} and ${maxDate} (Asia/Bangkok).`,
    };
  }

  if (!isCasualPlayTimeRangeValid(startTime, endTime)) {
    return {
      ok: false,
      error: "End time must be later than start time.",
    };
  }

  if (allowPublicContact && !phone && !lineId) {
    return {
      ok: false,
      error: "Add an organizer phone number or LINE ID for public contact.",
    };
  }

  return {
    ok: true,
    value: {
      sportId,
      courtId,
      venueName,
      locationNote,
      title,
      description: normalizeOptionalText(payload.description),
      playDate,
      startTime,
      endTime,
      playFormat,
      playerAmount: normalizePlayerAmount(payload.playerAmount),
      phone,
      lineId,
      allowPublicContact,
    },
  };
}
