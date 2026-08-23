import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const getRequestSupabaseClient = cache(createSupabaseServerClient);

export const getRequestUser = cache(async () => {
  const supabase = await getRequestSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
});
