import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type Params = {
  params: { postId: string };
};

export async function PATCH(request: Request, { params }: Params) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json();
  const { title, body_text, category } = payload;
  if (!title || !body_text) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 },
    );
  }

  const { data: existingPost, error: fetchError } = await supabase
    .from("community_posts")
    .select("id,author_id")
    .eq("id", params.postId)
    .maybeSingle();

  if (fetchError || !existingPost) {
    return NextResponse.json(
      { error: "Post not found" },
      { status: 404 },
    );
  }

  if (existingPost.author_id !== user.id) {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 },
    );
  }

  const { error } = await supabase
    .from("community_posts")
    .update({
      title,
      body_text,
      category,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.postId);

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
