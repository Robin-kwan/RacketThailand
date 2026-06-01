import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { ensureUserProfile } from "@/server/profile";

type RouteContext = {
  params: Promise<{ postId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { postId } = await context.params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { error: profileError } = await ensureUserProfile(
    getSupabaseAdminClient(),
    user,
  );
  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  const payload = await request.json();
  const { body } = payload;
  if (!body || typeof body !== "string") {
    return NextResponse.json(
      { error: "Missing comment body" },
      { status: 400 },
    );
  }

  const { error } = await supabase.from("community_comments").insert({
    post_id: postId,
    author_id: user.id,
    body_text: body,
  });

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
