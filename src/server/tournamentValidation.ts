export type TournamentOrganizerInput = {
  groupId?: string | null;
  name?: string | null;
  phone?: string | null;
  lineId?: string | null;
  websiteUrl?: string | null;
};

export type TournamentPayloadInput = {
  sportId?: string;
  courtId?: string;
  name?: string;
  description?: string;
  tournamentStartDate?: string;
  tournamentEndDate?: string;
  registrationUrl?: string | null;
  phone?: string | null;
  lineId?: string | null;
  organizers?: TournamentOrganizerInput[];
};

const text = (value: unknown) =>
  typeof value === "string" ? value.trim() || null : null;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidTournamentUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function normalizeHttpUrl(value?: string | null) {
  const input = text(value);
  if (!input) return { value: null, error: null };
  const candidate = /^[a-z][a-z\d+.-]*:\/\//i.test(input)
    ? input
    : `https://${input}`;
  try {
    const url = new URL(candidate);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return { value: null, error: "External links must use HTTP or HTTPS." };
    }
    return { value: url.toString(), error: null };
  } catch {
    return { value: null, error: "External information URL is invalid." };
  }
}

function isValidDate(value: string) {
  if (!DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function getBangkokDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function validateTournamentPayload(
  payload: TournamentPayloadInput | null | undefined,
) {
  const input = payload && typeof payload === "object" ? payload : {};
  const sportId = text(input.sportId);
  const courtId = text(input.courtId);
  const name = text(input.name);
  const description = text(input.description);
  const tournamentStartDate = text(input.tournamentStartDate);
  const tournamentEndDate = text(input.tournamentEndDate);
  const normalizedRegistrationUrl = normalizeHttpUrl(input.registrationUrl);
  const registrationUrl = normalizedRegistrationUrl.value;
  const phone = text(input.phone);
  const lineId = text(input.lineId);

  if (
    !sportId ||
    !courtId ||
    !name ||
    !description ||
    !tournamentStartDate ||
    !tournamentEndDate
  ) {
    return { ok: false as const, error: "Missing required tournament fields." };
  }
  if (!isValidTournamentUuid(sportId) || !isValidTournamentUuid(courtId)) {
    return { ok: false as const, error: "Sport or court identifier is invalid." };
  }
  if (normalizedRegistrationUrl.error)
    return { ok: false as const, error: normalizedRegistrationUrl.error };
  if (!registrationUrl && !phone && !lineId) {
    return {
      ok: false as const,
      error: "Add at least one contact method: external link, phone, or LINE.",
    };
  }

  const today = getBangkokDate();
  if (!isValidDate(tournamentStartDate) || !isValidDate(tournamentEndDate)) {
    return { ok: false as const, error: "Tournament dates are invalid." };
  }
  if ([tournamentStartDate, tournamentEndDate].some((value) => value < today)) {
    return {
      ok: false as const,
      error: "Tournament dates cannot be in the past.",
    };
  }
  if (tournamentEndDate < tournamentStartDate) {
    return {
      ok: false as const,
      error: "Tournament end cannot be before its start.",
    };
  }

  const dates = [
    `${tournamentStartDate}T00:00:00+07:00`,
    `${tournamentEndDate}T23:59:59.999+07:00`,
  ].map((value) => new Date(value));
  if (dates.some((date) => Number.isNaN(date.getTime()))) {
    return { ok: false as const, error: "Tournament dates are invalid." };
  }
  const [tournamentStart, tournamentEnd] = dates;
  const organizerPayloads = Array.isArray(input.organizers)
    ? input.organizers
    : [];
  const organizerInputs = organizerPayloads.map((organizer) => {
    const safeOrganizer =
      organizer && typeof organizer === "object" ? organizer : {};
    const normalizedWebsiteUrl = normalizeHttpUrl(safeOrganizer.websiteUrl);
    return {
      groupId: text(safeOrganizer.groupId),
      name: text(safeOrganizer.name),
      phone: text(safeOrganizer.phone),
      lineId: text(safeOrganizer.lineId),
      websiteUrl: normalizedWebsiteUrl.value,
      websiteUrlError: normalizedWebsiteUrl.error,
    };
  });
  if (organizerInputs.some((organizer) => organizer.websiteUrlError)) {
    return {
      ok: false as const,
      error: "Organizer websites must be valid HTTP or HTTPS URLs.",
    };
  }
  const organizers = organizerInputs
    .map((organizer) => ({
      groupId: organizer.groupId,
      name: organizer.name,
      phone: organizer.phone,
      lineId: organizer.lineId,
      websiteUrl: organizer.websiteUrl,
    }))
    .filter((organizer) => organizer.groupId || organizer.name);
  if (
    organizers.some(
      (organizer) =>
        organizer.groupId && !isValidTournamentUuid(organizer.groupId),
    )
  ) {
    return { ok: false as const, error: "Organizer group identifier is invalid." };
  }
  if (organizers.length === 0)
    return { ok: false as const, error: "Add at least one organizer." };

  return {
    ok: true as const,
    value: {
      sportId,
      courtId,
      name,
      description,
      tournamentStartAt: tournamentStart.toISOString(),
      tournamentEndAt: tournamentEnd.toISOString(),
      registrationUrl,
      phone,
      lineId,
      organizers,
    },
  };
}
