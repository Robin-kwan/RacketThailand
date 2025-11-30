import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SUPPORTED_SPORTS = [
  "badminton",
  "padel",
  "pickleball",
  "tennis",
  "tabletennis",
];

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const subdomain = host.split(".")[0]?.toLowerCase();

  if (SUPPORTED_SPORTS.includes(subdomain)) {
    const url = request.nextUrl.clone();
    url.pathname = `/${subdomain}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}
