import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json();
  const { sport, title, body_text, category = "event" } = payload;
  if (!sport || !title || !body_text) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 },
    );
  }

  const { data: sportRow, error: sportError } = await supabase
    .from("sports")
    .select("id,code")
    .eq("code", sport)
    .maybeSingle();
  if (sportError || !sportRow) {
    return NextResponse.json(
      { error: "Sport not found" },
      { status: 404 },
    );
  }

  const { error } = await supabase.from("community_posts").insert({
    sport_id: sportRow.id,
    author_id: user.id,
    title,
    body_text,
    category,
    status: "published",
  });

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
