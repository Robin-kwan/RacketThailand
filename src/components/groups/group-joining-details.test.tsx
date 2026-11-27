// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import th from "../../messages/th.json";
import { GroupJoiningDetails } from "./group-joining-details";

afterEach(cleanup);
for (const [locale, messages] of [["th", th], ["en", en]] as const) {
  const copy = messages.groups.detail;
  describe(`joining guidance in ${locale}`, () => {
    it("does not advertise walk-ins when the stored value is unknown", () => {
      render(<GroupJoiningDetails allowWalkIn={null} hasContact copy={copy} />);
      expect(screen.getByText(copy.walkInsUnknown)).toBeTruthy();
      expect(screen.queryByText(copy.walkInsWelcome)).toBeNull();
      expect(screen.getByText(copy.joiningHint)).toBeTruthy();
    });
    it.each([true, false])("uses the recorded walk-in value %s", (allowWalkIn) => {
      render(<GroupJoiningDetails allowWalkIn={allowWalkIn} hasContact copy={copy} />);
      expect(screen.getByText(allowWalkIn ? copy.walkInsWelcome : copy.walkInsClosed)).toBeTruthy();
      expect(screen.queryByText(copy.walkInsUnknown)).toBeNull();
    });
    it("omits the contact instruction when no contact channel is available", () => {
      render(<GroupJoiningDetails allowWalkIn={null} hasContact={false} copy={copy} />);
      expect(screen.queryByText(copy.joiningHint)).toBeNull();
    });
  });
}
