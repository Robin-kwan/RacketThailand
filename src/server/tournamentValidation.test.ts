import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  isValidTournamentUuid,
  type TournamentPayloadInput,
  validateTournamentPayload,
} from "./tournamentValidation";

const SPORT_ID = "11111111-1111-4111-8111-111111111111";
const COURT_ID = "22222222-2222-4222-8222-222222222222";
const GROUP_ID = "33333333-3333-4333-8333-333333333333";

function validPayload(
  overrides: Partial<TournamentPayloadInput> = {},
): TournamentPayloadInput {
  return {
    sportId: SPORT_ID,
    courtId: COURT_ID,
    name: "Bangkok Open",
    description: "Local tennis tournament",
    tournamentStartDate: "2026-08-10",
    tournamentEndDate: "2026-08-12",
    registrationUrl: "example.com/register",
    organizers: [{ name: "RacketThailand" }],
    ...overrides,
  };
}

describe("validateTournamentPayload", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-03T05:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("normalizes scheme-less external links and Bangkok date boundaries", () => {
    const result = validateTournamentPayload(validPayload());

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.registrationUrl).toBe("https://example.com/register");
    expect(result.value.tournamentStartAt).toBe("2026-08-09T17:00:00.000Z");
    expect(result.value.tournamentEndAt).toBe("2026-08-12T16:59:59.999Z");
  });

  it("preserves a plain LINE ID without adding an at-sign", () => {
    const result = validateTournamentPayload(
      validPayload({ registrationUrl: null, lineId: "racket_thailand" }),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.lineId).toBe("racket_thailand");
  });

  it("requires at least one supported contact method", () => {
    const result = validateTournamentPayload(
      validPayload({ registrationUrl: null, phone: null, lineId: null }),
    );

    expect(result).toMatchObject({ ok: false });
  });

  it("rejects past dates and an end before the start", () => {
    expect(
      validateTournamentPayload(
        validPayload({ tournamentStartDate: "2026-08-02" }),
      ),
    ).toMatchObject({ ok: false, error: "Tournament dates cannot be in the past." });
    expect(
      validateTournamentPayload(
        validPayload({ tournamentEndDate: "2026-08-09" }),
      ),
    ).toMatchObject({
      ok: false,
      error: "Tournament end cannot be before its start.",
    });
  });

  it("rejects impossible calendar dates", () => {
    expect(
      validateTournamentPayload(
        validPayload({ tournamentStartDate: "2026-02-30" }),
      ),
    ).toMatchObject({ ok: false, error: "Tournament dates are invalid." });
  });

  it("rejects invalid sport, court, and organizer group identifiers", () => {
    expect(validateTournamentPayload(validPayload({ sportId: "bad" }))).toMatchObject({
      ok: false,
      error: "Sport or court identifier is invalid.",
    });
    expect(
      validateTournamentPayload(
        validPayload({ organizers: [{ groupId: "bad" }] }),
      ),
    ).toMatchObject({
      ok: false,
      error: "Organizer group identifier is invalid.",
    });
    expect(
      validateTournamentPayload(
        validPayload({ organizers: [{ groupId: GROUP_ID }] }),
      ),
    ).toMatchObject({ ok: true });
  });

  it("normalizes organizer websites and rejects unsafe protocols", () => {
    const normalized = validateTournamentPayload(
      validPayload({
        organizers: [{ name: "Organizer", websiteUrl: "organizer.example" }],
      }),
    );
    expect(normalized.ok).toBe(true);
    if (normalized.ok) {
      expect(normalized.value.organizers[0].websiteUrl).toBe(
        "https://organizer.example/",
      );
    }

    expect(
      validateTournamentPayload(
        validPayload({
          organizers: [{ name: "Organizer", websiteUrl: "javascript://x" }],
        }),
      ),
    ).toMatchObject({ ok: false });
  });

  it("handles arbitrary parsed JSON without throwing", () => {
    expect(() => validateTournamentPayload(null)).not.toThrow();
    expect(() =>
      validateTournamentPayload({ sportId: 123 } as unknown as TournamentPayloadInput),
    ).not.toThrow();
    expect(() =>
      validateTournamentPayload({
        ...validPayload(),
        organizers: { name: "not-an-array" },
      } as unknown as TournamentPayloadInput),
    ).not.toThrow();

    expect(validateTournamentPayload(null)).toMatchObject({ ok: false });
  });
});

describe("isValidTournamentUuid", () => {
  it("accepts supported UUIDs and rejects malformed route identifiers", () => {
    expect(isValidTournamentUuid(SPORT_ID)).toBe(true);
    expect(isValidTournamentUuid("not-a-uuid")).toBe(false);
    expect(isValidTournamentUuid(123)).toBe(false);
  });
});
