import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type RouteContext = {
  params: Promise<{ commentId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { commentId } = await context.params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json();
  const { body } = payload;
  if (!body) {
    return NextResponse.json(
      { error: "Missing comment body" },
      { status: 400 },
    );
  }

  const { data: existingComment, error: fetchError } = await supabase
    .from("community_comments")
    .select("id,author_id")
    .eq("id", commentId)
    .maybeSingle();

  if (fetchError || !existingComment) {
    return NextResponse.json(
      { error: "Comment not found" },
      { status: 404 },
    );
  }

  if (existingComment.author_id !== user.id) {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 },
    );
  }

  const { error } = await supabase
    .from("community_comments")
    .update({
      body_text: body,
      updated_at: new Date().toISOString(),
    })
    .eq("id", commentId);

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
