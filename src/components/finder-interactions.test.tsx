// @vitest-environment jsdom

import type { ComponentProps, ImgHTMLAttributes, AnchorHTMLAttributes } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { hydrateRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import en from "../messages/en.json";
import th from "../messages/th.json";
import type { CourtRecord } from "../server/courtFinder";
import type { GroupRecord } from "../server/groupFinder";

vi.mock("next/navigation", () => ({ usePathname: () => window.location.pathname }));
vi.mock("next/link", () => ({
  default: ({ children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props}>{children}</a>,
}));
vi.mock("next/image", () => ({
  default: ({ src, alt, className }: ImgHTMLAttributes<HTMLImageElement>) => (
    // Image loading is outside these interaction tests.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={className} />
  ),
}));
vi.mock("@vercel/analytics", () => ({ track: vi.fn() }));
vi.mock("@/components/nearby-map", () => ({ NearbyMap: () => null }));

import { CourtFinder } from "./court-finder";
import { GroupFinder } from "./group-finder";

const feedback = {
  searchError: en.finderFeedback.searchError,
  loadMoreError: en.finderFeedback.loadMoreError,
  retryLabel: en.finderFeedback.retry,
  loadingLabel: en.finderFeedback.loading,
};
const courtCopy: ComponentProps<typeof CourtFinder>["copy"] = {
  ...en.courtFinder,
  ...feedback,
  allProvincesLabel: en.courtFinder.allProvinces,
  resetFilters: en.courtFinder.reset,
  addCourtCta: en.courtSubmission.submit,
  loadMoreLabel: en.courtFinder.loadMore,
  loadingMoreLabel: en.courtFinder.loadingMore,
  noPhotoLabel: en.courtFinder.noPhoto,
  priceLabel: en.courtFinder.price,
};
const groupCopy: ComponentProps<typeof GroupFinder>["copy"] = {
  ...en.groupFinder,
  ...feedback,
  playFormatSingle: en.groups.form.playFormatSingle,
  playFormatDouble: en.groups.form.playFormatDouble,
  walkInsWelcome: en.groups.detail.walkInsWelcome,
  walkInsClosed: en.groups.detail.walkInsClosed,
  playerAmountLabel: en.groups.detail.playerAmount,
  phoneLabel: en.groups.detail.phone,
  lineLabel: en.groups.detail.line,
  createGroupCta: en.header.createGroup,
  playerFinderCta: en.header.playerFinder,
  loadMoreLabel: en.groupFinder.loadMore,
  loadingMoreLabel: en.groupFinder.loadingMore,
};
const thaiFeedback = {
  searchError: th.finderFeedback.searchError,
  loadMoreError: th.finderFeedback.loadMoreError,
  retryLabel: th.finderFeedback.retry,
  loadingLabel: th.finderFeedback.loading,
};
const thaiCourtCopy = {
  ...courtCopy, ...th.courtFinder, ...thaiFeedback,
  allProvincesLabel: th.courtFinder.allProvinces,
  resetFilters: th.courtFinder.reset,
  addCourtCta: th.courtSubmission.submit,
  loadMoreLabel: th.courtFinder.loadMore,
  loadingMoreLabel: th.courtFinder.loadingMore,
  noPhotoLabel: th.courtFinder.noPhoto,
  priceLabel: th.courtFinder.price,
};
const thaiGroupCopy = {
  ...groupCopy, ...th.groupFinder, ...thaiFeedback,
  createGroupCta: th.header.createGroup,
  playerFinderCta: th.header.playerFinder,
  loadMoreLabel: th.groupFinder.loadMore,
  loadingMoreLabel: th.groupFinder.loadingMore,
};

function court(id: string): CourtRecord {
  return {
    id, name: `Court ${id}`, description: null, address: null,
    district: "Bang Kapi", province: "Bangkok", price_note: "<p>200&nbsp;THB/hour</p>",
    opening_hours: null, phone: null, line_id: null, website_url: null, created_at: null,
  };
}
function group(id: string): GroupRecord {
  return {
    id, name: `Group ${id}`, description: null, updated_at: null,
    group_sessions: [{
      day: "friday", start_time: "18:00", end_time: "20:00",
      courts: { id: "venue", name: "Test venue", district: "Bang Kapi", province: "Bangkok", latitude: null, longitude: null },
    }],
  };
}

const fetchMock = vi.fn<typeof fetch>();
function deferredResponse() {
  let resolve!: (response: Response) => void;
  const promise = new Promise<Response>((done) => { resolve = done; });
  return { promise, resolve };
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  window.history.replaceState(null, "", "/badminton/group-finder?lang=en");
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("shows the matched date and court instead of the group's next overall session", () => {
  const result = group("date match");
  result.matched_sessions = [{
    day: "saturday",
    date: "2026-10-24",
    start_time: "10:00",
    end_time: "12:00",
    courts: { id: "saturday-venue", name: "Saturday venue", province: "Bangkok", latitude: null, longitude: null },
  }];
  render(
    <GroupFinder sportCode="badminton" locale="en" fallbackImage="/sports/badminton.png" copy={groupCopy}
      dayLabels={{ friday: "Friday", saturday: "Saturday" }} initialGroups={[result]}
      initialDate="2026-10-24" initialNow="2026-10-23T09:00:00.000Z"
      total={1} groupActionHref="/groups/create?sport=badminton&lang=en" groupActionKind="create_group" />,
  );
  const card = screen.getByText("Group date match").closest("a")!;
  expect(within(card).getByText(/10:00/)).toBeTruthy();
  expect(within(card).getByText("Saturday venue")).toBeTruthy();
  expect(within(card).queryByText("Test venue")).toBeNull();
});

for (const kind of ["courts", "groups"] as const) {
  const copy = kind === "courts" ? courtCopy : groupCopy;
  const name = (id: string) => `${kind === "courts" ? "Court" : "Group"} ${id}`;
  const response = (ids: string[], count = ids.length) => Response.json({
    [kind]: ids.map((id) => kind === "courts" ? court(id) : group(id)), count,
  });
  const finder = (ids = ["original"], total = ids.length, locale: "th" | "en" = "en") => kind === "courts" ? (
    <CourtFinder sportCode="badminton" locale={locale} copy={locale === "th" ? thaiCourtCopy : courtCopy} initialCourts={ids.map(court)} provinces={[]} total={total} />
  ) : (
    <GroupFinder sportCode="badminton" locale={locale} fallbackImage="/sports/badminton.png" copy={locale === "th" ? thaiGroupCopy : groupCopy}
      dayLabels={{ friday: "Friday" }} initialGroups={ids.map(group)} initialNow="2026-10-23T09:00:00.000Z"
      total={total} groupActionHref="/groups/create?sport=badminton&lang=en" groupActionKind="create_group" />
  );
  const search = (value: string) => {
    fireEvent.change(screen.getByRole("searchbox"), { target: { value } });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
  };

  describe(`${kind} finder interactions`, () => {
    it.each(["network", "http", "invalid-json", "invalid-shape"])("recovers from a %s search failure without losing existing cards", async (failure) => {
      render(finder());
      if (failure === "network") fetchMock.mockRejectedValueOnce(new TypeError("Offline"));
      else if (failure === "http") fetchMock.mockResolvedValueOnce(Response.json({ error: "Unavailable" }, { status: 500 }));
      else if (failure === "invalid-json") fetchMock.mockResolvedValueOnce(new Response("not json"));
      else fetchMock.mockResolvedValueOnce(Response.json({ count: 0 }));
      search("new search");
      const alert = await screen.findByRole("alert");
      expect(alert.textContent).toContain(feedback.searchError);
      expect(screen.getByText(name("original"))).toBeTruthy();
      fetchMock.mockResolvedValueOnce(response(["retried"]));
      fireEvent.click(within(alert).getByRole("button", { name: feedback.retryLabel }));
      await screen.findByText(name("retried"));
      expect(screen.queryByText(name("original"))).toBeNull();
      expect(screen.queryByRole("alert")).toBeNull();
      expect(String(fetchMock.mock.calls[1][0])).toContain("search=new+search");
    });

    it("clears an empty search from its empty-state action and restores results", async () => {
      render(finder());
      fetchMock.mockResolvedValueOnce(response([]));
      search("no matches");
      const emptyTitle = await screen.findByText(copy.emptyTitle);
      const emptyState = emptyTitle.parentElement!;
      fetchMock.mockResolvedValueOnce(response(["restored"]));
      fireEvent.click(within(emptyState).getByRole("button", { name: en.groupFinder.reset }));
      await screen.findByText(name("restored"));
      expect((screen.getByRole("searchbox") as HTMLInputElement).value).toBe("");
      expect(new URL(String(fetchMock.mock.calls[1][0]), window.location.origin).searchParams.has("search")).toBe(false);
    });

    it("keeps existing cards after a pagination failure and retries the same page", async () => {
      const initial = Array.from({ length: 12 }, (_, index) => String(index));
      render(finder(initial, 13));
      fetchMock.mockRejectedValueOnce(new TypeError("Offline"));
      fireEvent.click(screen.getByRole("button", { name: copy.loadMoreLabel }));
      const alert = await screen.findByRole("alert");
      expect(alert.textContent).toContain(feedback.loadMoreError);
      expect(screen.getByText(name("0"))).toBeTruthy();
      fetchMock.mockResolvedValueOnce(response(["12"], 13));
      fireEvent.click(within(alert).getByRole("button", { name: feedback.retryLabel }));
      await screen.findByText(name("12"));
      expect(screen.getByText(name("0"))).toBeTruthy();
      expect(String(fetchMock.mock.calls[1][0])).toBe(String(fetchMock.mock.calls[0][0]));
      expect(screen.queryByRole("alert")).toBeNull();
      expect(screen.queryByRole("button", { name: copy.loadMoreLabel })).toBeNull();
    });

    it("ignores an older search response arriving after the latest result", async () => {
      render(finder());
      const pending = deferredResponse();
      fetchMock.mockReturnValueOnce(pending.promise).mockResolvedValueOnce(response(["latest"]));
      search("old search");
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
      const oldSignal = fetchMock.mock.calls[0][1]?.signal;
      search("latest search");
      await screen.findByText(name("latest"));
      expect(oldSignal?.aborted).toBe(true);
      await act(async () => pending.resolve(response(["stale"])));
      expect(screen.queryByText(name("stale"))).toBeNull();
      expect(screen.getByText(name("latest"))).toBeTruthy();
    });

    it("cancels in-flight pagination when a new search replaces the list", async () => {
      render(finder(Array.from({ length: 12 }, (_, index) => String(index)), 13));
      const pending = deferredResponse();
      fetchMock.mockReturnValueOnce(pending.promise).mockResolvedValueOnce(response(["filtered"]));
      fireEvent.click(screen.getByRole("button", { name: copy.loadMoreLabel }));
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
      const oldSignal = fetchMock.mock.calls[0][1]?.signal;
      search("another area");
      await screen.findByText(name("filtered"));
      expect(oldSignal?.aborted).toBe(true);
      await act(async () => pending.resolve(response(["old-page"], 13)));
      expect(screen.queryByText(name("old-page"))).toBeNull();
      expect(screen.queryByText(name("0"))).toBeNull();
      expect(screen.getByText(name("filtered"))).toBeTruthy();
    });

    it("shows loading rather than a premature empty state while searching", async () => {
      render(finder([], 0));
      const pending = deferredResponse();
      fetchMock.mockReturnValueOnce(pending.promise);
      search("new area");
      expect(await screen.findByText(feedback.loadingLabel)).toBeTruthy();
      expect(screen.queryByText(copy.emptyTitle)).toBeNull();
      await act(async () => pending.resolve(response(["found"])));
      expect(screen.getByText(name("found"))).toBeTruthy();
    });

    it.each(["th", "en"] as const)("hydrates server-rendered %s finder controls without recoverable errors", async (locale) => {
      const element = finder(["original"], 1, locale);
      const container = document.createElement("div");
      container.innerHTML = renderToString(element);
      document.body.appendChild(container);
      const onRecoverableError = vi.fn();
      let root!: Root;
      try {
        await act(async () => { root = hydrateRoot(container, element, { onRecoverableError }); });
        expect(onRecoverableError).not.toHaveBeenCalled();
        expect(within(container).getByRole("searchbox")).toBeTruthy();
      } finally {
        await act(async () => root?.unmount());
        container.remove();
      }
    });

    it("recovers with Thai labels on the default-language experience", async () => {
      render(finder(["original"], 1, "th"));
      fetchMock.mockRejectedValueOnce(new TypeError("Offline"));
      fireEvent.change(screen.getByRole("searchbox"), { target: { value: "ลาดพร้าว" } });
      fireEvent.click(screen.getByRole("button", { name: "ค้นหา" }));
      const alert = await screen.findByRole("alert");
      expect(alert.textContent).toContain(th.finderFeedback.searchError);
      fetchMock.mockResolvedValueOnce(response(["thai-retry"]));
      fireEvent.click(within(alert).getByRole("button", { name: th.finderFeedback.retry }));
      const card = (await screen.findByText(name("thai-retry"))).closest("a")!;
      expect(card.getAttribute("href")).not.toContain("lang=en");
      expect(screen.queryByRole("alert")).toBeNull();
    });

    it("preserves English locale on result links and displays useful card details", () => {
      render(finder());
      const card = screen.getByText(name("original")).closest("a")!;
      expect(card.getAttribute("href")).toContain("lang=en");
      if (kind === "courts") {
        expect(within(card).getByText(en.courtFinder.noPhoto)).toBeTruthy();
        expect(within(card).getByText("Price: 200 THB/hour")).toBeTruthy();
        expect(card.getAttribute("href")).toContain("sport=badminton");
      } else {
        expect(within(card).getByText("Bang Kapi, Bangkok")).toBeTruthy();
        expect(within(card).getByText("Test venue")).toBeTruthy();
      }
    });
  });
}
