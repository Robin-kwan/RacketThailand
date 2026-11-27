import { describe, expect, it } from "vitest";
import { courtPriceSummary } from "./court-price-summary";

describe("courtPriceSummary", () => {
  it("keeps formatted prices readable in a card", () => {
    expect(courtPriceSummary("<p>200&nbsp;บาท/ชั่วโมง</p><p>หลัง 18:00<br>250 บาท</p>"))
      .toBe("200 บาท/ชั่วโมง หลัง 18:00 250 บาท");
  });
  it("preserves plain-text comparisons and decodes quoted and numeric characters", () => {
    expect(courtPriceSummary("ราคา < 300 บาท &amp; &#xE3F;200 &#47; &#34;court&#34;"))
      .toBe('ราคา < 300 บาท & ฿200 / "court"');
  });
  it("omits non-display content and empty editor markup", () => {
    expect(courtPriceSummary("<!-- note --><style>p{color:red}</style><script>alert(1)</script><p><br></p>"))
      .toBe("");
    expect(courtPriceSummary(null)).toBe("");
    expect(courtPriceSummary(undefined)).toBe("");
  });
  it("does not crash on invalid numeric entities", () => {
    expect(courtPriceSummary("&#x110000; &#xD800; &#0;" )).toBe("\ufffd \ufffd \ufffd");
  });
});
