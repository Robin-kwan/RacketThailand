import { describe, expect, it } from "vitest";
import { SPORT_META } from "../data/sportMeta";
import {
  PLAYER_ANALYTICS_ACTIONS,
  PLAYER_ANALYTICS_SPORTS,
  playerAnalyticsWindow,
  playerEventName,
  summarizeOutreach,
  type OutreachRow,
} from "./player-analytics";

it("uses every actual sport code and bounded GA event names", () => {
  expect([...PLAYER_ANALYTICS_SPORTS].sort()).toEqual(
    Object.keys(SPORT_META).sort(),
  );
  for (const sport of PLAYER_ANALYTICS_SPORTS)
    for (const action of PLAYER_ANALYTICS_ACTIONS) {
      const name = playerEventName(action, sport)!;
      expect(name.length).toBeLessThanOrEqual(40);
      expect(name).toMatch(/^[a-z][a-z_]+$/);
    }
  expect(playerEventName("view", "invalid")).toBeNull();
});

it("uses Thai calendar days, including today, at UTC date boundaries", () => {
  expect(playerAnalyticsWindow(7, new Date("2026-09-11T18:00:00Z"))).toEqual({
    start: "2026-09-05T17:00:00.000Z",
    end: "2026-09-11T18:00:00.000Z",
    startDate: "2026-09-06",
    endDate: "2026-09-12",
  });
  expect(
    playerAnalyticsWindow(30, new Date("2026-03-01T01:00:00Z")).startDate,
  ).toBe("2026-01-31");
});

describe("outreach aggregation", () => {
  const row = (
    id: string,
    senderId: string,
    recipientId: string,
    sport: string,
    status: string,
  ): OutreachRow => ({ id, senderId, recipientId, sport, status });
  const rows = [
    row("1", "a", "b", "badminton", "accepted"),
    row("2", "a", "b", "tennis", "pending"),
    row("3", "c", "b", "tennis", "declined"),
    row("4", "admin", "b", "tennis", "accepted"),
    row("5", "c", "test", "tennis", "accepted"),
  ];
  it("deduplicates people across sports and excludes both endpoints", () => {
    expect(
      summarizeOutreach([...rows, rows[0]], new Set(["admin", "test"])),
    ).toEqual({
      sent: 3,
      senders: 2,
      recipients: 1,
      accepted: 1,
      declined: 1,
      pending: 1,
      cancelled: 0,
    });
  });
  it("recomputes the selected sport instead of summing distinct counts", () => {
    expect(
      summarizeOutreach(rows, new Set(["admin", "test"]), "badminton"),
    ).toEqual({
      sent: 1,
      senders: 1,
      recipients: 1,
      accepted: 1,
      declined: 0,
      pending: 0,
      cancelled: 0,
    });
  });
  it("represents a genuinely empty database as zero", () => {
    expect(summarizeOutreach([], new Set()).sent).toBe(0);
  });
});
