import { afterEach, expect, it, vi } from "vitest";
const { from } = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdminClient: () => ({ from }),
}));
vi.mock("@/data/playerAnalyticsExclusions", () => ({
  PLAYER_ANALYTICS_EXCLUDED_PROFILE_IDS: ["test"],
}));
vi.mock(
  "@/lib/player-analytics",
  async () => import("../lib/player-analytics"),
);
import { fetchPlayerOutcomes, playerTrackingAllowed } from "./playerAnalytics";

afterEach(() => vi.resetAllMocks());
function query(data: unknown[], error: unknown = null) {
  const builder = {
    select: vi.fn(),
    eq: vi.fn(),
    gte: vi.fn(),
    lte: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    gt: vi.fn(),
    then: (resolve: (value: unknown) => unknown) =>
      Promise.resolve({ data, error }).then(resolve),
  };
  for (const method of [
    builder.select,
    builder.eq,
    builder.gte,
    builder.lte,
    builder.order,
    builder.limit,
    builder.gt,
  ])
    method.mockReturnValue(builder);
  return builder;
}
it("loads only metadata, applies exclusions and maps invitation sports", async () => {
  const profiles = query([{ id: "admin" }]);
  const requests = query([
    {
      id: "1",
      sender_id: "person",
      recipient_id: "other",
      status: "pending",
      sports: { code: "tennis" },
    },
    {
      id: "2",
      sender_id: "admin",
      recipient_id: "other",
      status: "accepted",
      sports: { code: "tennis" },
    },
  ]);
  const invites = query([
    {
      id: "3",
      invited_by: "person",
      recipient_id: "other",
      status: "accepted",
      groups: { sports: { code: "tennis" } },
    },
  ]);
  from.mockImplementation((name) =>
    name === "profiles"
      ? profiles
      : name === "player_play_requests"
        ? requests
        : invites,
  );
  const result = await fetchPlayerOutcomes(7, "tennis");
  expect(result.requests.sent).toBe(1);
  expect(result.invitations.accepted).toBe(1);
  expect(requests.select.mock.calls[0][0]).not.toContain("message");
  expect(requests.gte).toHaveBeenCalledWith("created_at", result.window.start);
  expect(requests.lte).toHaveBeenCalledWith("created_at", result.window.end);
});
it("continues beyond a full page", async () => {
  const first = query(
    Array.from({ length: 1000 }, (_, i) => ({
      id: `${i}`,
      sender_id: "a",
      recipient_id: "b",
      status: "pending",
      sports: { code: "tennis" },
    })),
  );
  const second = query([
    {
      id: "next",
      sender_id: "c",
      recipient_id: "b",
      status: "pending",
      sports: { code: "tennis" },
    },
  ]);
  let reads = 0;
  from.mockImplementation((name) =>
    name === "player_play_requests"
      ? ++reads === 1
        ? first
        : second
      : query([]),
  );
  const result = await fetchPlayerOutcomes(30, "all");
  expect(result.requests.sent).toBe(1001);
  expect(second.gt).toHaveBeenCalledWith("id", "999");
});
it("does not turn database errors into zero", async () => {
  from.mockReturnValue(query([], { message: "unavailable" }));
  await expect(fetchPlayerOutcomes(7, "all")).rejects.toThrow();
  expect(await playerTrackingAllowed("person")).toBe(false);
});
