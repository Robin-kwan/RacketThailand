import { describe, expect, it } from "vitest";
import { PRODUCT_UPDATES } from "./productUpdates";

describe("PRODUCT_UPDATES", () => {
  it("keeps versions unique and releases newest first", () => {
    const versions = PRODUCT_UPDATES.map((update) => update.version);
    const timestamps = PRODUCT_UPDATES.map((update) =>
      new Date(update.releasedAt).getTime(),
    );

    expect(new Set(versions).size).toBe(versions.length);
    expect(timestamps.every(Number.isFinite)).toBe(true);
    expect(timestamps).toEqual([...timestamps].sort((a, b) => b - a));
  });

  it("provides Thai and English copy for every visible field", () => {
    for (const update of PRODUCT_UPDATES) {
      expect(update.title.th).toBeTruthy();
      expect(update.title.en).toBeTruthy();
      expect(update.summary.th).toBeTruthy();
      expect(update.summary.en).toBeTruthy();

      for (const item of update.items) {
        expect(item.text.th).toBeTruthy();
        expect(item.text.en).toBeTruthy();
      }
    }
  });
});
