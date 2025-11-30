import { NextResponse } from "next/server";
import { SUPPORTED_SPORTS } from "@/data/sportMeta";
import { buildSportPagePayload } from "@/server/sportContent";

type Params = {
  code: string;
};

export async function GET(
  _request: Request,
  { params }: { params: Params },
): Promise<NextResponse> {
  const payload = await buildSportPagePayload(params.code);

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
