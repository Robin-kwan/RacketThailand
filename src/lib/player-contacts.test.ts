import { describe, expect, it } from "vitest";
import { normalizePlayerContacts, canViewPlayerContacts, buildPlayerContactHref } from "./player-contacts";

describe("player contact privacy and links", () => {
  it("withholds restricted contacts until a request is accepted", () => {
    expect(canViewPlayerContacts("accepted", false, false)).toBe(false);
    expect(canViewPlayerContacts("accepted", false, true)).toBe(true);
    expect(canViewPlayerContacts("private", false, true)).toBe(false);
    expect(canViewPlayerContacts(undefined, false, false)).toBe(false);
    expect(canViewPlayerContacts("private", true, false)).toBe(true);
  });
  it("normalizes usernames and international phone numbers", () => {
    expect(normalizePlayerContacts({line: " robin.id ", instagram: "@robin", whatsapp: "+66 81-234-5678"})).toEqual({line: "robin.id", instagram: "robin", whatsapp: "+66812345678"});
    expect(buildPlayerContactHref("whatsapp", "+66812345678")).toBe("https://wa.me/66812345678");
  });
  it("rejects unsafe protocols, deceptive domains and embedded credentials", () => {
    for (const facebook of ["javascript:alert(1)", "https://facebook.com.evil.test/person", "https://person:secret@facebook.com/person", "https://evil.test/"]) {
      expect(() => normalizePlayerContacts({facebook})).toThrow("INVALID_CONTACT");
    }
    expect(() => normalizePlayerContacts({whatsapp: "0812345678"})).toThrow("INVALID_CONTACT");
  });
  it("supports a LINE add-friend link and ignores unrelated properties", () => {
    expect(normalizePlayerContacts({line:"https://lin.ee/abc", email:"hidden@example.com"})).toEqual({line:"https://lin.ee/abc"});
    expect(normalizePlayerContacts({line:"@club"})).toEqual({line:"@club"});
  });
});
