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

  const { data: existing } = await supabase
    .from("community_likes")
    .select("post_id")
    .eq("post_id", postId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("community_likes")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", user.id);
  } else {
    await supabase.from("community_likes").insert({
      post_id: postId,
      user_id: user.id,
    });
  }

  const { count } = await supabase
    .from("community_likes")
    .select("post_id", { count: "exact", head: true })
    .eq("post_id", postId);

  return NextResponse.json({
    liked: !existing,
    count: count ?? 0,
  });
}
