import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type Params = {
  params: { postId: string };
};

export async function POST(request: Request, { params }: Params) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { postId } = params;
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
