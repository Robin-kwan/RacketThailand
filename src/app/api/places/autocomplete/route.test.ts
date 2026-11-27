import { afterEach, expect, it, vi } from "vitest";
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetModules();
});

it("restricts autocomplete to Thai establishments and treats no results as a normal empty response", async () => {
  vi.stubEnv("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY", "test-key");
  const fetcher = vi
    .fn()
    .mockResolvedValue(
      Response.json({ status: "ZERO_RESULTS", predictions: [] }),
    );
  vi.stubGlobal("fetch", fetcher);
  const { GET } = await import("./route");
  const response = await GET(
    new Request(
      "https://example.com/api/places/autocomplete?input=SB&sessiontoken=test",
    ),
  );
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ predictions: [] });
  const url = fetcher.mock.calls[0][0] as URL;
  expect(url.searchParams.get("components")).toBe("country:th");
  expect(url.searchParams.get("types")).toBe("establishment");
});

it("returns a recoverable error when Google times out", async () => {
  vi.stubEnv("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY", "test-key");
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("timeout")));
  const { GET } = await import("./route");
  const response = await GET(
    new Request(
      "https://example.com/api/places/autocomplete?input=SB&sessiontoken=test",
    ),
  );
  expect(response.status).toBe(502);
  expect(await response.json()).toEqual({
    error: "lookupFailed",
    predictions: [],
  });
});
