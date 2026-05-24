import { NextResponse, type NextRequest } from "next/server";
import { SUPPORTED_SPORTS } from "@/data/sportMeta";
import { normalizeLocale } from "@/lib/i18n";
import { buildSportPagePayload } from "@/server/sportContent";

type Params = {
  code: string;
};

type ParamsInput = Promise<Params>;

async function resolveParams(params: ParamsInput): Promise<Params> {
  return params;
}

export async function GET(
  request: NextRequest,
  { params }: { params: ParamsInput },
): Promise<NextResponse> {
  const resolved = await resolveParams(params);
  const locale = normalizeLocale(request.nextUrl.searchParams.get("lang"));
  const payload = await buildSportPagePayload(resolved.code, locale);

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
