import { describe, expect, it } from "vitest";
import {
  buildActiveGroupEventsOrFilter,
  hasGroupEventEnded,
  normalizeGroupEvents,
} from "./groupEvents";

describe("group event helpers", () => {
  it("builds a PostgREST filter that keeps ongoing and future events", () => {
    const now = new Date("2026-08-29T12:00:00.000Z");

    expect(buildActiveGroupEventsOrFilter(now)).toBe(
      "(ends_at.gte.2026-08-29T12:00:00.000Z,and(ends_at.is.null,starts_at.gte.2026-08-29T12:00:00.000Z))",
    );
  });

  it("normalizes Thailand session times to UTC", () => {
    expect(
      normalizeGroupEvents([
        {
          courtId: "court-1",
          date: "2026-08-29",
          start: "18:00",
          end: "20:00",
        },
      ]),
    ).toEqual([
      {
        courtId: "court-1",
        venueName: null,
        startsAt: "2026-08-29T11:00:00.000Z",
        endsAt: "2026-08-29T13:00:00.000Z",
        notes: null,
      },
    ]);
  });

  it("allows a session that has started but has not ended", () => {
    expect(
      hasGroupEventEnded(
        {
          startsAt: "2026-08-29T11:00:00.000Z",
          endsAt: "2026-08-29T13:00:00.000Z",
        },
        new Date("2026-08-29T12:00:00.000Z"),
      ),
    ).toBe(false);
  });

  it("rejects a session whose end time is now or earlier", () => {
    const now = new Date("2026-08-29T13:00:00.000Z");

    expect(
      hasGroupEventEnded(
        {
          startsAt: "2026-08-29T11:00:00.000Z",
          endsAt: "2026-08-29T13:00:00.000Z",
        },
        now,
      ),
    ).toBe(true);
    expect(
      hasGroupEventEnded(
        {
          startsAt: "2026-08-29T10:00:00.000Z",
          endsAt: "2026-08-29T12:59:00.000Z",
        },
        now,
      ),
    ).toBe(true);
  });

  it("uses the start time as the effective end when no end is provided", () => {
    expect(
      hasGroupEventEnded(
        {
          startsAt: "2026-08-29T11:00:00.000Z",
          endsAt: null,
        },
        new Date("2026-08-29T12:00:00.000Z"),
      ),
    ).toBe(true);
  });
});
