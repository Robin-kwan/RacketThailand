import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/profile/profile-form";
import { BaseCard } from "@/components/base-card";
import { SPORT_META } from "@/data/sportMeta";
import {
  getTranslator,
  normalizeLocale,
} from "@/lib/i18n";
import { buildAuthPagePath } from "@/lib/auth-redirect";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { buildProfileDefaults } from "@/server/profile";

type SearchParams = {
  lang?: string;
};

type SportRow = {
  id: string;
  code: string;
};

type SearchParamInput = Promise<SearchParams> | undefined;

async function resolveSearchParams(
  searchParams?: SearchParamInput,
): Promise<SearchParams | undefined> {
  if (!searchParams) return undefined;
  return searchParams;
}

async function fetchOrCreateProfile(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { user: null, profile: null };
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("display_name,username,location,default_sport,avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  if (profile) {
    return { user, profile };
  }

  if (error && error.code !== "PGRST116") {
    throw new Error(error.message);
  }

  const defaults = buildProfileDefaults(user);
  const { data: inserted, error: insertError } = await supabase
    .from("profiles")
    .insert(defaults)
    .select("display_name,username,location,default_sport,avatar_url")
    .single();

  if (insertError) {
    throw new Error(insertError.message);
  }

  return { user, profile: inserted };
}

export default async function ProfileEditPage({
  searchParams,
}: {
  searchParams?: SearchParamInput;
}) {
  const resolvedParams = await resolveSearchParams(searchParams);
  const locale = normalizeLocale(resolvedParams?.lang);
  const t = await getTranslator(locale);
  const supabase = await createSupabaseServerClient();
  const { user, profile } = await fetchOrCreateProfile(supabase);
  const { data: sportRows } = await supabase
    .from("sports")
    .select("id,code")
    .order("code");

  if (!user || !profile) {
    redirect(buildAuthPagePath("/login", locale, "/profile/edit"));
  }

  const copy = {
    title: t("profile.title"),
    subtitle: t("profile.subtitle"),
    displayName: t("profile.displayName"),
    username: t("profile.username"),
    usernameHint: t("profile.usernameHint"),
    location: t("profile.location"),
    defaultSport: t("profile.defaultSport"),
    defaultSportPlaceholder: t("profile.defaultSportPlaceholder"),
    avatarLabel: t("profile.avatarLabel"),
    avatarHelper: t("profile.avatarHelper"),
    avatarLimit: t("profile.avatarLimit"),
    avatarUpload: t("profile.avatarUpload"),
    save: t("profile.save"),
    saving: t("profile.saving"),
    success: t("profile.success"),
    usernameTaken: t("profile.usernameTaken"),
    genericError: t("profile.genericError"),
  };

  const typedSports = (sportRows ?? []) as SportRow[];
  const sports = typedSports.map((sport) => ({
    id: sport.id,
    label: SPORT_META[sport.code]?.name[locale] ?? sport.code,
  }));

  return (
    <div className="rt-page">
      <main className="mx-auto flex max-w-5xl flex-col gap-8 px-6 pb-20 pt-10 md:flex-row md:px-10">
        <BaseCard
          as="section"
          className="flex-1 rounded-[32px] border border-slate-200 bg-white p-8"
        >
          <h1 className="text-xl font-semibold text-[var(--foreground)]">
            {copy.title}
          </h1>
          <p className="mt-3 text-sm text-[rgb(var(--foreground-rgb)/0.7)]">
            {copy.subtitle}
          </p>
          <ProfileForm
            userId={user.id}
            initialProfile={profile}
            sports={sports}
            copy={copy}
          />
        </BaseCard>
        <BaseCard
          as="aside"
          className="flex flex-1 flex-col gap-4 rounded-[32px] border border-slate-200 bg-white p-8"
        >
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase text-[rgb(var(--foreground-rgb)/0.6)]">
              {t("header.brand")}
            </p>
            <h2 className="text-xl font-semibold text-[var(--foreground)]">
              {t("profile.sidebarTitle")}
            </h2>
            <p className="text-sm text-[rgb(var(--foreground-rgb)/0.7)]">
              {t("profile.sidebarDescription")}
            </p>
          </div>
          <div className="rounded-3xl border border-dashed border-[rgb(var(--foreground-rgb)/0.2)] bg-[rgb(var(--foreground-rgb)/0.05)] p-6 text-sm text-[rgb(var(--foreground-rgb)/0.7)]">
            <p>{t("profile.sidebarHint")}</p>
          </div>
        </BaseCard>
      </main>
    </div>
  );
}
