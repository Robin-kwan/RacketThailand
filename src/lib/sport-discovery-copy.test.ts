import { describe, expect, it } from "vitest";
import { SUPPORTED_SPORTS } from "../data/sportMeta";
import { getSportDiscoveryCopy } from "./sport-discovery-copy";

describe("sport discovery copy", () => {
  it("provides complete Thai and English copy for every supported sport", () => {
    for (const sport of SUPPORTED_SPORTS) {
      for (const locale of ["th", "en"] as const) {
        const copy = getSportDiscoveryCopy(sport, locale);

        expect(copy).not.toBeNull();
        expect(Object.values(copy ?? {}).every((value) => value.trim())).toBe(
          true,
        );
      }
    }
  });

  it("does not use rejected or awkward badminton phrasing", () => {
    const thaiCopy = getSportDiscoveryCopy("badminton", "th");
    const combinedCopy = Object.values(thaiCopy ?? {}).join(" ");

    expect(combinedCopy).not.toContain("แบดมินตันไทย");
    expect(combinedCopy).not.toContain("คอมมูนิตี้แบด");
    expect(combinedCopy).not.toContain("ดูก๊วนแบดมินตัน");
    expect(thaiCopy?.sportTitle).not.toContain("ก๊วน");
    expect(thaiCopy?.sportDescription).not.toContain("ก๊วน");
    expect(thaiCopy?.groupFinderLinkLabel).not.toContain("ก๊วน");
    expect(thaiCopy?.groupFinderTitle).toBe("หาก๊วนตีแบด | RacketThailand");
  });
});
