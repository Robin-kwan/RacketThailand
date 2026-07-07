export type GroupEventPayload = {
  courtId?: string | null;
  venueName?: string | null;
  date?: string | null;
  start?: string | null;
  end?: string | null;
  notes?: string | null;
};

export type NormalizedGroupEvent = {
  courtId: string | null;
  venueName: string | null;
  startsAt: string;
  endsAt: string | null;
  notes: string | null;
};

const THAILAND_UTC_OFFSET = "+07:00";

function normalizeText(value?: string | null) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseLocalDateTime(date?: string | null, time?: string | null) {
  const normalizedDate = normalizeText(date);
  const normalizedTime = normalizeText(time);
  if (!normalizedDate || !normalizedTime) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedDate)) return null;
  if (!/^\d{2}:\d{2}$/.test(normalizedTime)) return null;
  const parsed = new Date(
    `${normalizedDate}T${normalizedTime}:00${THAILAND_UTC_OFFSET}`,
  );
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function normalizeGroupEvents(
  events?: GroupEventPayload[] | null,
): NormalizedGroupEvent[] {
  if (!Array.isArray(events)) return [];

  return events
    .map((event) => {
      const courtId = normalizeText(event.courtId);
      const venueName = normalizeText(event.venueName);
      const startsAt = parseLocalDateTime(event.date, event.start);
      if (!startsAt || (!courtId && !venueName)) return null;

      const endDate = parseLocalDateTime(event.date, event.end);
      let endsAt = endDate;
      if (startsAt && endsAt && endsAt <= startsAt) {
        endsAt = new Date(endsAt.getTime() + 24 * 60 * 60 * 1000);
      }

      return {
        courtId,
        venueName,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt ? endsAt.toISOString() : null,
        notes: normalizeText(event.notes),
      };
    })
    .filter((event): event is NormalizedGroupEvent => Boolean(event));
}

export function getCourtIdsFromGroupEvents(events: NormalizedGroupEvent[]) {
  return Array.from(
    new Set(
      events
        .map((event) => event.courtId)
        .filter((courtId): courtId is string => Boolean(courtId)),
    ),
  );
}
