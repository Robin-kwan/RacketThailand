import { NextResponse } from "next/server";

const GOOGLE_MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

type Prediction = {
  description: string;
  place_id: string;
  structured_formatting?: {
    main_text?: string;
    secondary_text?: string;
  };
};

type AutocompleteResponse = {
  predictions: Array<{
    description: string;
    placeId: string;
    secondary?: string;
  }>;
};

export async function GET(request: Request) {
  if (!GOOGLE_MAPS_KEY) {
    return NextResponse.json(
      { error: "Google Maps API key is not configured." },
      { status: 500 },
    );
  }

  const { searchParams } = new URL(request.url);
  const input = searchParams.get("input")?.trim();
  const sessionToken = searchParams.get("sessiontoken")?.trim();
  if (
    !input ||
    input.length > 300 ||
    !sessionToken ||
    sessionToken.length > 100
  ) {
    return NextResponse.json(
      { error: "Missing input or session token." },
      { status: 400 },
    );
  }

  const endpoint = new URL(
    "https://maps.googleapis.com/maps/api/place/autocomplete/json",
  );
  endpoint.searchParams.set("input", input);
  endpoint.searchParams.set("sessiontoken", sessionToken);
  endpoint.searchParams.set("language", "th");
  endpoint.searchParams.set("types", "establishment");
  endpoint.searchParams.set("components", "country:th");
  endpoint.searchParams.set("key", GOOGLE_MAPS_KEY);

  try {
    const response = await fetch(endpoint, {
      signal: AbortSignal.timeout(8000),
    });
    const data = (await response.json()) as {
      status: string;
      predictions?: Prediction[];
      error_message?: string;
    };

    if (data.status === "ZERO_RESULTS") {
      return NextResponse.json({ predictions: [] });
    }
    if (!response.ok || data.status !== "OK" || !data.predictions) {
      return NextResponse.json(
        {
          error: "lookupFailed",
          predictions: [],
        },
        { status: 502 },
      );
    }

    const predictions = data.predictions.map((prediction) => ({
      description: prediction.description,
      placeId: prediction.place_id,
      secondary: prediction.structured_formatting?.secondary_text,
    }));

    return NextResponse.json<AutocompleteResponse>({ predictions });
  } catch {
    return NextResponse.json(
      { error: "lookupFailed", predictions: [] },
      { status: 502 },
    );
  }
}
