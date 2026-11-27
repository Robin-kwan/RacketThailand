import { describe, expect, it } from "vitest";
import {
  getGroupContributionAction,
  type OwnedGroupSummary,
} from "./group-contribution";

const group = (
  id: string,
  sportCode: string,
): OwnedGroupSummary => ({
  id,
  name: `Group ${id}`,
  sportCode,
  sportId: `${sportCode}-id`,
  status: "published",
  updatedAt: null,
});

describe("getGroupContributionAction", () => {
  it("keeps create group for guests or users without a group", () => {
    expect(
      getGroupContributionAction({
        ownedGroups: [],
        locale: "th",
        sportCode: "badminton",
        courtId: "court-1",
      }),
    ).toEqual({
      kind: "create_group",
      href: "/groups/create?sport=badminton&court=court-1",
    });
  });

  it("opens the session form when one group exists for the sport", () => {
    expect(
      getGroupContributionAction({
        ownedGroups: [group("one", "badminton")],
        locale: "en",
        sportCode: "badminton",
        courtId: "court-1",
      }),
    ).toEqual({
      kind: "add_session",
      href:
        "/groups/one?sport=badminton&court=court-1&lang=en#add-session",
    });
  });

  it("opens a group chooser when several groups exist for the sport", () => {
    expect(
      getGroupContributionAction({
        ownedGroups: [
          group("one", "badminton"),
          group("two", "badminton"),
          group("tennis", "tennis"),
        ],
        locale: "th",
        sportCode: "badminton",
      }),
    ).toEqual({
      kind: "choose_group",
      href: "/groups/create?sport=badminton",
    });
  });

  it("does not reuse a group from another sport", () => {
    expect(
      getGroupContributionAction({
        ownedGroups: [group("tennis", "tennis")],
        locale: "th",
        sportCode: "badminton",
      }).kind,
    ).toBe("create_group");
  });
});
