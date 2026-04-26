import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

const parsePositiveInt = (value: string | null, fallback: number) => {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 0) {
    return fallback;
  }
  return parsed;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const rawLimit = parsePositiveInt(url.searchParams.get("limit"), DEFAULT_LIMIT);
  const limit = Math.min(Math.max(rawLimit, 1), MAX_LIMIT);
  const offset = Math.max(
    parsePositiveInt(url.searchParams.get("offset"), 0),
    0,
  );
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      {
        notifications: [],
        pagination: {
          limit,
          offset,
          nextOffset: offset,
          hasMore: false,
        },
      },
      { status: 200 },
    );
  }

  const { data, error } = await supabase
    .from("notifications")
    .select("id,type,message,metadata,created_at,read_at")
    .eq("recipient_id", user.id)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 },
    );
  }

  const notifications = data ?? [];
  const nextOffset = offset + notifications.length;
  const hasMore = notifications.length === limit;

  return NextResponse.json({
    notifications,
    pagination: {
      limit,
      offset,
      nextOffset,
      hasMore,
    },
  });
}
