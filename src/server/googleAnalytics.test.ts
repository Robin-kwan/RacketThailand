import { afterEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock(
  "@/lib/player-analytics",
  async () => import("../lib/player-analytics"),
);
vi.mock("google-auth-library", () => ({
  JWT: class {
    async getAccessToken() {
      return { token: "fake" };
    }
  },
}));
import { fetchPlayerFunnel } from "./googleAnalytics";
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
function configure() {
  vi.stubEnv("GOOGLE_ANALYTICS_PROPERTY_ID", "123");
  vi.stubEnv("GOOGLE_ANALYTICS_CLIENT_EMAIL", "test@example.com");
  vi.stubEnv("GOOGLE_ANALYTICS_PRIVATE_KEY", "fake");
}
it("asks GA to deduplicate each action across all sports in batches of at most five", async () => {
  configure();
  const calls: {
    requests: {
      dimensions?: unknown;
      dimensionFilter: unknown;
      metrics: unknown[];
    }[];
  }[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url, options) => {
      const body = JSON.parse(options.body);
      calls.push(body);
      return Response.json({
        reports: body.requests.map(() => ({
          rows: [{ metricValues: [{ value: "9" }, { value: "3" }] }],
        })),
      });
    }),
  );
  const result = await fetchPlayerFunnel(7, "all");
  expect(calls.map((call) => call.requests.length)).toEqual([5, 2]);
  expect(calls[0].requests[0].dimensions).toBeUndefined();
  expect(JSON.stringify(calls[0].requests[0].dimensionFilter)).toContain(
    "player_view_tabletennis",
  );
  expect(result.metrics.view).toEqual({ events: 9, users: 3 });
});
it("does not silently zero an incomplete GA response", async () => {
  configure();
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json({ reports: [] })),
  );
  await expect(fetchPlayerFunnel(7, "tennis")).rejects.toThrow(
    "INCOMPLETE_REPORT",
  );
});
it("reports measured empty responses and privacy limits distinctly", async () => {
  configure();
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url, options) =>
      Response.json({
        reports: JSON.parse(options.body).requests.map(() => ({
          rows: [],
          metadata: { subjectToThresholding: true },
        })),
      }),
    ),
  );
  const result = await fetchPlayerFunnel(7, "tennis");
  expect(result.metrics.view).toEqual({ events: 0, users: 0 });
  expect(result.limited).toBe(true);
});
