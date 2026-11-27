import { isValidElement, type ReactElement, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import en from "../messages/en.json";
import th from "../messages/th.json";
import type { LocationEntry } from "../lib/location-directory";
import type { fetchCourtDetail } from "../server/courtFinder";

const state = vi.hoisted(() => ({
  detail: vi.fn(),
  directory: vi.fn(),
  user: null as { id: string; is_anonymous: boolean } | null,
}));
vi.mock("@/lib/supabase-server", () => ({
  createSupabaseServerClient: async () => ({ auth: { getUser: async () => ({ data: { user: state.user } }) } }),
}));
vi.mock("@/server/courtFinder", () => ({ fetchCourtDetail: state.detail, fetchNearbyCourtsForDetail: async () => [] }));
vi.mock("@/server/locationDirectory", () => ({ fetchLocationNavigation: state.directory }));
vi.mock("@/server/ownedGroups", () => ({ fetchOwnedGroupSummaries: async () => [] }));
vi.mock("next/navigation", () => ({
  notFound: () => { throw new Error("not-found"); },
  redirect: (path: string) => { throw new Error(`redirect:${path}`); },
}));

import CourtPage from "./courts/[courtId]/page";
import LoginPage from "./(auth)/login/page";
import SignupPage from "./(auth)/signup/page";
import { BaseScheduleList } from "../components/base-schedule-list";
import { TrackedLink } from "../components/analytics/tracked-link";
import { LoginForm } from "../components/auth/login-form";
import { SignupForm } from "../components/auth/signup-form";

function elements(node: ReactNode): ReactElement<Record<string, unknown>>[] {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!isValidElement<Record<string, unknown>>(node)) return [];
  return [node, ...elements(node.props.children as ReactNode)];
}

const courtId = "17363947-fd5b-4108-8143-2d9a618307b6";
const badminton = { id: "sport-1", code: "badminton", name: "Badminton" };
type CourtDetail = NonNullable<Awaited<ReturnType<typeof fetchCourtDetail>>>;
function detail(locale = "th"): CourtDetail {
  return {
    court: {
      id: courtId, name: "Test court", description: null, address: null,
      district: null, province: locale === "en" ? "Bangkok" : "กรุงเทพมหานคร", province_id: 10,
      price_note: null, phone: null, line_id: null, website_url: null, created_at: null, is_active: true,
      opening_hours: [{ day: "saturday", ranges: [{ open: "09:00", close: "21:00" }] }],
    },
    sport: badminton, sports: [badminton], groups: [], upcomingEvents: [], photos: [],
  };
}
const province: LocationEntry = {
  sport: "badminton", slug: "bangkok", provinceId: 10,
  name: { th: "กรุงเทพมหานคร", en: "Bangkok" }, courtIds: [courtId], groupIds: ["group-1"],
};

beforeEach(() => {
  state.user = null;
  state.detail.mockReset().mockImplementation((_id: string, locale: string) => Promise.resolve(detail(locale)));
  state.directory.mockReset().mockResolvedValue([province]);
});
afterEach(() => vi.useRealTimers());

describe("court discovery navigation", () => {
  for (const locale of ["th", "en"] as const) {
    it(`links to the court's province groups in ${locale} while preserving sport scope`, async () => {
      const page = await CourtPage({ params: Promise.resolve({ courtId }), searchParams: Promise.resolve({ sport: "badminton", lang: locale }) });
      const link = elements(page).find((element) => element.type === TrackedLink &&
        (element.props.eventPayload as { cta?: string })?.cta === "browse_area_groups");
      expect(link?.props.href).toBe(`/badminton/group-finder/bangkok${locale === "en" ? "?lang=en" : ""}`);
      expect(link?.props.children).toContain(province.name[locale]);
    });
  }

  it.each(["empty", "other-sport", "unavailable"])("uses general group discovery when the province directory is %s", async (scenario) => {
    state.directory.mockResolvedValue(scenario === "unavailable" ? [] : [{ ...province,
      groupIds: scenario === "empty" ? [] : province.groupIds,
      sport: scenario === "other-sport" ? "tennis" : "badminton",
    }]);
    const page = await CourtPage({ params: Promise.resolve({ courtId }), searchParams: Promise.resolve({ sport: "badminton", lang: "en" }) });
    const link = elements(page).find((element) => element.type === TrackedLink &&
      (element.props.eventPayload as { cta?: string })?.cta === "browse_area_groups");
    expect(link?.props.href).toBe("/badminton/group-finder?lang=en");
    expect(link?.props.children).toBe(en.header.groupFinder);
  });

  it("highlights Saturday's opening hours after midnight in Thailand on Friday UTC", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-23T18:05:00.000Z"));
    const page = await CourtPage({ params: Promise.resolve({ courtId }), searchParams: Promise.resolve({ sport: "badminton", lang: "en" }) });
    const schedule = elements(page).find((element) => element.type === BaseScheduleList);
    const entries = schedule?.props.entries as { label: string; highlighted: boolean }[];
    expect(entries.filter((entry) => entry.highlighted).map((entry) => entry.label)).toEqual(["Saturday"]);
  });
});

for (const { page: Page, form: Form, switchPath, title } of [
  { page: LoginPage, form: LoginForm, switchPath: "/signup", title: "login" },
  { page: SignupPage, form: SignupForm, switchPath: "/login", title: "signup" },
]) {
  describe(`${title} after creating a group`, () => {
    for (const locale of ["th", "en"] as const) {
      it(`explains the intent and carries the group and court through account switching in ${locale}`, async () => {
        const redirectTo = `/groups/create?sport=badminton&court=${courtId}`;
        const page = await Page({ searchParams: Promise.resolve({ lang: locale, redirectTo }) });
        const nodes = elements(page);
        expect(nodes.find((element) => element.type === Form)?.props.redirectTo).toBe(redirectTo);
        expect(nodes.some((element) => element.props.children === (locale === "th" ? th : en).auth.createGroupIntent)).toBe(true);
        const link = nodes.find((element) => typeof element.props.href === "string" && element.props.href.startsWith(`${switchPath}?`));
        const url = new URL(String(link?.props.href), "https://racketthailand.com");
        expect(url.searchParams.get("redirectTo")).toBe(redirectTo);
        expect(url.searchParams.get("lang")).toBe(locale === "en" ? "en" : null);
      });
    }

    it("returns a signed-in user to group creation with court, sport, and locale", async () => {
      state.user = { id: "member", is_anonymous: false };
      await expect(Page({ searchParams: Promise.resolve({ lang: "en", redirectTo: `/groups/create?sport=badminton&court=${courtId}` }) }))
        .rejects.toThrow(`redirect:/groups/create?sport=badminton&court=${courtId}&lang=en`);
    });

    it("does not show group intent for an unsafe redirect", async () => {
      const page = await Page({ searchParams: Promise.resolve({ lang: "en", redirectTo: "https://example.com/groups/create" }) });
      const nodes = elements(page);
      expect(nodes.find((element) => element.type === Form)?.props.redirectTo).toBe("/");
      expect(nodes.some((element) => element.props.children === en.auth.createGroupIntent)).toBe(false);
    });
  });
}
