import { expect, it } from "vitest";
import { getLocationGroupSessions } from "./location-group-sessions";

it("shows dated sessions in Thai local time, keeps ongoing sessions, and excludes other provinces and ended sessions", () => {
  const court = {
    id: "c1",
    name: "Court",
    province: "กรุงเทพมหานคร",
    province_id: 1,
    latitude: 13,
    longitude: 100,
  };
  const sessions = getLocationGroupSessions(
    [{ day: "monday", start_time: "19:00", end_time: "21:00", courts: court }],
    [
      {
        starts_at: "2026-09-07T18:00:00Z",
        ends_at: "2026-09-07T20:00:00Z",
        courts: court,
      },
      {
        starts_at: "2026-09-07T16:00:00Z",
        ends_at: "2026-09-07T17:30:00Z",
        courts: court,
      },
      {
        starts_at: "2026-09-07T10:00:00Z",
        ends_at: "2026-09-07T12:00:00Z",
        courts: court,
      },
      {
        starts_at: "2026-09-07T18:00:00Z",
        ends_at: null,
        courts: { ...court, province_id: 2 },
      },
      {
        starts_at: "2026-09-07T18:00:00Z",
        ends_at: null,
        courts: { ...court, is_active: false },
      },
    ],
    { provinceId: 1, name: { th: "กรุงเทพมหานคร", en: "Bangkok" } },
    Date.parse("2026-09-07T17:00:00Z"),
  );
  expect(sessions.map(({ date, start_time }) => [date, start_time])).toEqual([
    ["2026-09-07", "23:00"],
    ["2026-09-08", "01:00"],
    [undefined, "19:00"],
  ]);
});
