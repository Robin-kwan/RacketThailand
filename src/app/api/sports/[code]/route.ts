import { NextResponse, type NextRequest } from "next/server";
import { SUPPORTED_SPORTS } from "@/data/sportMeta";
import { buildSportPagePayload } from "@/server/sportContent";

type Params = {
  code: string;
};

type ParamsInput = Params | Promise<Params>;

async function resolveParams(params: ParamsInput): Promise<Params> {
  if (typeof (params as Promise<Params>).then === "function") {
    return params as Promise<Params>;
  }
  return params as Params;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: ParamsInput },
): Promise<NextResponse> {
  const resolved = await resolveParams(params);
  const payload = await buildSportPagePayload(resolved.code);

  if (!payload) {
    return NextResponse.json(
      {
        error: "Sport not found",
        supported: SUPPORTED_SPORTS,
      },
      { status: 404 },
    );
  }

  return NextResponse.json(payload);
}
