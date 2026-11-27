import { afterEach, describe, expect, it, vi } from "vitest";
import {
  extractGoogleMapsTarget,
  parseGoogleMapsUrl,
  resolveGoogleMapsTarget,
  searchGooglePlaces,
} from "./google-place-search";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
const sbId = "ChIJC8af4xV_HTER6q-mq7Ma9YM";
const sbLink =
  "google.com/maps?geocode=KQvGn-MVfx0xMeqvpquzGvWD&daddr=43+Sawaipracharaj+Rd";
const place = {
  name: "SB BADMINTON",
  place_id: sbId,
  formatted_address: "ลำลูกกา ปทุมธานี ประเทศไทย",
  types: ["gym", "establishment"],
};

describe("Google Maps link identity", () => {
  it("extracts the exact SB venue from the user's directions link, not its address", () => {
    expect(extractGoogleMapsTarget(parseGoogleMapsUrl(sbLink))).toEqual({
      placeId: sbId,
    });
  });
  it("supports documented Place ID parameters and named place links", () => {
    expect(
      extractGoogleMapsTarget(
        parseGoogleMapsUrl(
          `https://www.google.com/maps/search/?api=1&query=x&query_place_id=${sbId}`,
        ),
      ),
    ).toEqual({ placeId: sbId });
    expect(
      extractGoogleMapsTarget(
        parseGoogleMapsUrl(
          "https://www.google.com/maps/place/SB+Badminton/@13.1,100.1,17z",
        ),
      ),
    ).toEqual({ query: "SB Badminton" });
  });
  it("does not treat map center coordinates as a venue", () => {
    expect(
      extractGoogleMapsTarget(
        parseGoogleMapsUrl("https://www.google.com/maps/@13.1,100.1,17z"),
      ),
    ).toEqual({});
    expect(
      extractGoogleMapsTarget(
        parseGoogleMapsUrl("https://maps.google.com/?q=13.1,100.1"),
      ),
    ).toEqual({});
  });
  it.each([
    "https://localhost/maps",
    "https://127.0.0.1/maps",
    "https://google.com.evil.test/maps",
    "https://www.google.com/url?q=https://localhost",
    "https://user:password@google.com/maps",
    "https://google.com:444/maps",
    "file:///maps",
    "http://google.com/maps",
  ])("rejects unsafe link %s", (link) => {
    expect(() => parseGoogleMapsUrl(link)).toThrow("invalidLink");
  });
  it("validates short-link redirects before following them", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        new Response(null, {
          status: 302,
          headers: { location: "https://127.0.0.1/private" },
        }),
      );
    vi.stubGlobal("fetch", fetcher);
    await expect(
      resolveGoogleMapsTarget("https://maps.app.goo.gl/example"),
    ).rejects.toThrow("invalidLink");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("resolves a short link to an exact place without reading arbitrary HTML", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        new Response(null, {
          status: 302,
          headers: { location: `https://${sbLink}` },
        }),
      );
    vi.stubGlobal("fetch", fetcher);
    expect(
      await resolveGoogleMapsTarget("https://maps.app.goo.gl/example"),
    ).toEqual({ placeId: sbId });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("bounds redirect loops", async () => {
    const fetcher = vi
      .fn()
      .mockImplementation(() =>
        Promise.resolve(
          new Response(null, {
            status: 302,
            headers: { location: "https://maps.app.goo.gl/example" },
          }),
        ),
      );
    vi.stubGlobal("fetch", fetcher);
    await expect(
      resolveGoogleMapsTarget("https://maps.app.goo.gl/example"),
    ).rejects.toThrow("unresolvedLink");
    expect(fetcher).toHaveBeenCalledTimes(5);
  });
});

describe("place search candidates", () => {
  it("verifies an extracted ID using Google before returning a selectable venue", async () => {
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY", "test-key");
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        Response.json({
          status: "OK",
          result: {
            ...place,
            address_components: [{ short_name: "TH", types: ["country"] }],
          },
        }),
      );
    vi.stubGlobal("fetch", fetcher);
    expect(await searchGooglePlaces(sbLink, true)).toEqual([
      {
        description: place.name,
        placeId: sbId,
        secondary: place.formatted_address,
      },
    ]);
    const url = fetcher.mock.calls[0][0] as URL;
    expect(url.pathname).toContain("/details/");
    expect(url.searchParams.get("place_id")).toBe(sbId);
  });
  it("filters overseas results, non-venues, and duplicates", async () => {
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json({
            status: "OK",
            results: [
              place,
              place,
              {
                ...place,
                place_id: "india",
                formatted_address: "Chennai India",
              },
              { ...place, place_id: "street", types: ["route"] },
            ],
          }),
        ),
    );
    expect(await searchGooglePlaces("SB badminton", false)).toHaveLength(1);
  });
  it("distinguishes empty results from an upstream failure", async () => {
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY", "test-key");
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({ status: "ZERO_RESULTS", results: [] }),
      )
      .mockResolvedValueOnce(
        Response.json({
          status: "REQUEST_DENIED",
          error_message: "private upstream error",
        }),
      );
    vi.stubGlobal("fetch", fetcher);
    expect(await searchGooglePlaces("missing venue", false)).toEqual([]);
    await expect(searchGooglePlaces("missing venue", false)).rejects.toThrow(
      "lookupFailed",
    );
  });
});
