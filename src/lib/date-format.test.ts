import { describe, expect, it } from "vitest";
import { formatGroupSessionDate } from "./date-format";

describe("group session date labels", () => {
  it("formats dated sessions identically across server and browser locales", () => {
    expect(formatGroupSessionDate("2026-10-03", "th")).toBe("เสาร์ 3 ต.ค.");
    expect(formatGroupSessionDate("2026-10-03", "en")).toBe("Sat 3 Oct");
  });
});
