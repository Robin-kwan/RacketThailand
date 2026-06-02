import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type RouteContext = {
  params: Promise<{ postId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { postId } = await context.params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("status")
    .eq("id", user.id)
    .single();
  const isAdmin = profile?.status === "admin";

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
    .eq("id", postId)
    .maybeSingle();

  if (fetchError || !existingPost) {
    return NextResponse.json(
      { error: "Post not found" },
      { status: 404 },
    );
  }

  if (!isAdmin && existingPost.author_id !== user.id) {
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
    .eq("id", postId);

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { postId } = await context.params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("status")
    .eq("id", user.id)
    .single();
  const isAdmin = profile?.status === "admin";

  const { data: existingPost, error: fetchError } = await supabase
    .from("community_posts")
    .select("id,author_id")
    .eq("id", postId)
    .maybeSingle();

  if (fetchError || !existingPost) {
    return NextResponse.json(
      { error: "Post not found" },
      { status: 404 },
    );
  }

  if (!isAdmin && existingPost.author_id !== user.id) {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 },
    );
  }

  const adminSupabase = getSupabaseAdminClient();
  const { error: commentsError } = await adminSupabase
    .from("community_comments")
    .delete()
    .eq("post_id", postId);
  if (commentsError) {
    return NextResponse.json(
      { error: commentsError.message },
      { status: 500 },
    );
  }

  const { error: likesError } = await adminSupabase
    .from("community_likes")
    .delete()
    .eq("post_id", postId);
  if (likesError) {
    return NextResponse.json(
      { error: likesError.message },
      { status: 500 },
    );
  }

  const { error } = await adminSupabase
    .from("community_posts")
    .delete()
    .eq("id", postId);

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
