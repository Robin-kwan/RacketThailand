import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ notifications: [] }, { status: 200 });
  }

  const { data, error } = await supabase
    .from("notifications")
    .select("id,type,message,metadata,created_at,read_at")
    .eq("recipient_id", user.id)
    .order("created_at", { ascending: false })
    .limit(25);

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    notifications: data ?? [],
  });
}
