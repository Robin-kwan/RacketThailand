import { afterEach, expect, it, vi } from "vitest";
import { trackPlayerEvent } from "./player-analytics-client";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
function browser(hostname = "racketthailand.com", consent = "accepted") {
  const target = {
    location: { hostname },
    localStorage: { getItem: vi.fn(() => consent) },
    dataLayer: [] as unknown[],
  };
  vi.stubGlobal("window", target);
  vi.stubEnv("NEXT_PUBLIC_GOOGLE_ANALYTICS_ID", "G-TEST123");
  return target;
}

it("queues only the allowlisted event name without identifying fields", () => {
  const target = browser("tabletennis.racketthailand.com");
  expect(trackPlayerEvent("request_open", "tabletennis", true)).toBe(true);
  expect(Array.from(target.dataLayer[0] as IArguments)).toEqual([
    "event",
    "player_request_open_tabletennis",
    { send_to: "G-TEST123" },
  ]);
});
it.each([
  "localhost",
  "127.0.0.1",
  "test.vercel.app",
  "evilracketthailand.com",
  "racketthailand.com.evil.com",
])("does not track tests on %s", (host) => {
  const target = browser(host);
  expect(trackPlayerEvent("view", "tennis", true)).toBe(false);
  expect(target.dataLayer).toHaveLength(0);
});
it.each(["declined", "unknown"])("respects %s consent", (consent) => {
  const target = browser("racketthailand.com", consent);
  expect(trackPlayerEvent("view", "tennis", true)).toBe(false);
  expect(target.dataLayer).toHaveLength(0);
});
it("excludes admin and designated test accounts", () => {
  const target = browser();
  expect(trackPlayerEvent("view", "tennis", false)).toBe(false);
  expect(target.dataLayer).toHaveLength(0);
});
it("does not throw when browser storage is blocked", () => {
  const target = browser();
  target.localStorage.getItem.mockImplementation(() => {
    throw new Error("blocked");
  });
  expect(trackPlayerEvent("view", "tennis", true)).toBe(false);
});
