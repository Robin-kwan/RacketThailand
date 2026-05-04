import { redirect } from "next/navigation";
import { buildLocalizedPath, type Locale } from "@/lib/i18n";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export type AdminProfile = {
  id: string;
  status: string | null;
  display_name: string | null;
  username: string | null;
};

export async function requireAdminPageAccess(locale: Locale) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(buildLocalizedPath("/login", locale));
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id,status,display_name,username")
    .eq("id", user.id)
    .single<AdminProfile>();

  if (profile?.status !== "admin") {
    redirect(buildLocalizedPath("/", locale));
  }

  return {
    supabase,
    user,
    profile,
  };
}
