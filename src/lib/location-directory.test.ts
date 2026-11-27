import { describe, expect, it } from "vitest";
import {
  buildLocationDirectory,
  locationPath,
  parseLocationPage,
  type DirectoryCourt,
  type DirectoryGroup,
} from "./location-directory";

const provinces = [
  { id: 1, name_th: "กรุงเทพมหานคร", name_en: "Bangkok" },
  { id: 2, name_th: "นนทบุรี", name_en: "Nonthaburi" },
];
const sports = [
  { id: "b", code: "badminton" },
  { id: "p", code: "pickleball" },
];
const courts: DirectoryCourt[] = [
  {
    id: "c1",
    province_id: 1,
    is_active: true,
    court_sports: [{ sport_id: "b" }, { sport_id: "b" }, { sport_id: "p" }],
  },
  {
    id: "c2",
    province_id: 2,
    is_active: true,
    court_sports: [{ sport_id: "b" }],
  },
  {
    id: "hidden",
    province_id: 2,
    is_active: false,
    court_sports: [{ sport_id: "p" }],
  },
  {
    id: "unknown",
    province_id: null,
    is_active: true,
    court_sports: [{ sport_id: "b" }],
  },
];

describe("populated location directory", () => {
  it("includes secondary sports, deduplicates courts, and excludes inactive and unlocated courts", () => {
    const directory = buildLocationDirectory(provinces, sports, courts, []);
    expect(
      directory.map((entry) => [entry.sport, entry.slug, entry.courtIds]),
    ).toEqual([
      ["badminton", "bangkok", ["c1"]],
      ["badminton", "nonthaburi", ["c2"]],
      ["pickleball", "bangkok", ["c1"]],
    ]);
  });

  it("counts published groups once per province across linked venues and sessions", () => {
    const groups: DirectoryGroup[] = [
      {
        id: "g1",
        sport_id: "b",
        status: "published",
        court_groups: [{ court_id: "c1" }],
        group_sessions: [{ court_id: "c1" }, { court_id: "c2" }],
      },
      {
        id: "draft",
        sport_id: "b",
        status: "draft",
        court_groups: [{ court_id: "c1" }],
      },
      {
        id: "hidden-venue",
        sport_id: "p",
        status: "published",
        court_groups: [{ court_id: "hidden" }],
      },
    ];
    const directory = buildLocationDirectory(provinces, sports, courts, groups);
    expect(
      directory
        .filter((entry) => entry.sport === "badminton")
        .map((entry) => entry.groupIds),
    ).toEqual([["g1"], ["g1"]]);
    expect(
      directory.find((entry) => entry.sport === "pickleball")?.groupIds,
    ).toEqual([]);
  });

  it("includes ongoing and future events but not expired events or unknown venues", () => {
    const now = Date.parse("2026-09-07T12:00:00Z");
    const events = [
      {
        court_id: "c1",
        starts_at: "2026-09-07T11:00:00Z",
        ends_at: "2026-09-07T13:00:00Z",
      },
      { court_id: "c2", starts_at: "2026-09-06T12:00:00Z", ends_at: null },
      { court_id: null, starts_at: "2026-09-08T12:00:00Z", ends_at: null },
    ];
    const directory = buildLocationDirectory(
      provinces,
      sports,
      courts,
      [
        {
          id: "event-group",
          sport_id: "b",
          status: "published",
          group_events: events,
        },
      ],
      now,
    );
    expect(
      directory.find(
        (entry) => entry.sport === "badminton" && entry.slug === "bangkok",
      )?.groupIds,
    ).toEqual(["event-group"]);
    expect(
      directory.find((entry) => entry.slug === "nonthaburi")?.groupIds,
    ).toEqual([]);
  });

  it("uses stable pages and rejects invalid or repeated page parameters", () => {
    expect(locationPath("badminton", "courts", "chiang-mai", 1)).toBe(
      "/badminton/court-finder/chiang-mai",
    );
    expect(locationPath("pickleball", "groups", "bangkok", 2)).toBe(
      "/pickleball/group-finder/bangkok?page=2",
    );
    expect(parseLocationPage(undefined)).toBe(1);
    expect(parseLocationPage("2")).toBe(2);
    for (const value of [
      "0",
      "-1",
      "1.5",
      "01",
      "abc",
      "999999999999999999999",
      ["1", "2"],
    ])
      expect(parseLocationPage(value)).toBeNull();
  });
});
