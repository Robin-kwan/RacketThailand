import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/profile/profile-form";
import { BaseCard } from "@/components/base-card";
import { PlayerProfileForm } from "@/components/player-finder/player-profile-form";
import { SPORT_META } from "@/data/sportMeta";
import {
  getTranslator,
  normalizeLocale,
} from "@/lib/i18n";
import { buildAuthPagePath } from "@/lib/auth-redirect";
import {
  PLAYER_AVAILABILITY_DAYS,
  PLAYER_PLAY_FORMATS,
  PLAYER_SKILL_LEVELS,
  PLAYER_TIME_PREFERENCES,
} from "@/lib/player-finder";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { buildProfileDefaults } from "@/server/profile";

type SearchParams = {
  lang?: string;
  sport?: string;
};

type SportRow = {
  id: string;
  code: string;
  name: string | null;
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
    .select("display_name,username,avatar_url")
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
    .select("display_name,username,avatar_url")
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

  if (!user || !profile || user.is_anonymous) {
    const redirectPath = resolvedParams?.sport
      ? `/profile/edit?sport=${encodeURIComponent(resolvedParams.sport)}`
      : "/profile/edit";
    redirect(buildAuthPagePath("/login", locale, redirectPath));
  }

  const adminSupabase = getSupabaseAdminClient();
  const [{ data: sportRows }, { data: sportProfiles, error: profilesError }] =
    await Promise.all([
      adminSupabase.from("sports").select("id,code,name").order("code"),
      adminSupabase
        .from("profile_sports")
        .select(
          "profile_id,sport_id,skill_level,rating_system,rating_value,area,availability_days,time_preference,play_format,looking_note,looking_until,allow_group_invites",
        )
        .eq("profile_id", user.id),
    ]);

  const copy = {
    title: t("profile.title"),
    subtitle: t("profile.subtitle"),
    displayName: t("profile.displayName"),
    username: t("profile.username"),
    usernameHint: t("profile.usernameHint"),
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
    code: sport.code,
    label: SPORT_META[sport.code]?.name[locale] ?? sport.name ?? sport.code,
  }));
  const requestedSport = sports.find(
    (sport) => sport.code === resolvedParams?.sport,
  );
  const initialSportId = requestedSport?.id ?? sports[0]?.id ?? "";
  const sportProfileCopy = {
    sport: t("playerFinder.profile.sport"),
    skillLevel: t("playerFinder.profile.skillLevel"),
    ratingSystem: t("playerFinder.profile.ratingSystem"),
    ratingSystemPlaceholder: t("playerFinder.profile.ratingSystemPlaceholder"),
    ratingValue: t("playerFinder.profile.ratingValue"),
    area: t("playerFinder.profile.area"),
    areaPlaceholder: t("playerFinder.profile.areaPlaceholder"),
    availabilityDays: t("playerFinder.profile.availabilityDays"),
    timePreference: t("playerFinder.profile.timePreference"),
    playFormat: t("playerFinder.profile.playFormat"),
    lookingNote: t("playerFinder.profile.lookingNote"),
    lookingNotePlaceholder: t("playerFinder.profile.lookingNotePlaceholder"),
    looking: t("playerFinder.profile.looking"),
    lookingHelp: t("playerFinder.profile.lookingHelp"),
    allowGroupInvites: t("playerFinder.profile.allowGroupInvites"),
    save: t("playerFinder.profile.save"),
    saving: t("playerFinder.profile.saving"),
    success: t("playerFinder.profile.success"),
    schemaRequired: t("playerFinder.profile.schemaRequired"),
    genericError: t("playerFinder.genericError"),
    add: t("playerFinder.profile.add"),
    addTitle: t("playerFinder.profile.addTitle"),
    edit: t("playerFinder.profile.edit"),
    viewProfile: t("playerFinder.profile.viewProfile"),
    editTitle: t("playerFinder.profile.editTitle"),
    active: t("playerFinder.profile.active"),
    inactive: t("playerFinder.profile.inactive"),
    statusUpdated: t("playerFinder.profile.statusUpdated"),
    emptyTitle: t("playerFinder.profile.emptyTitle"),
    emptyDescription: t("playerFinder.profile.emptyDescription"),
    allSportsAdded: t("playerFinder.profile.allSportsAdded"),
    notSet: t("playerFinder.profile.notSet"),
    yes: t("playerFinder.profile.yes"),
    no: t("playerFinder.profile.no"),
    cancel: t("playerFinder.profile.cancel"),
  };

  return (
    <div className="rt-page">
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 pb-20 pt-10 md:px-10">
        <BaseCard
          as="section"
          className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm md:p-8"
        >
          <div className="border-b border-slate-100 pb-6">
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">
              {copy.title}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[rgb(var(--foreground-rgb)/0.68)]">
              {copy.subtitle}
            </p>
          </div>
          <ProfileForm
            userId={user.id}
            initialProfile={profile}
            copy={copy}
          />
        </BaseCard>

        <section
          id="sport-profile"
          className="scroll-mt-24 py-4"
        >
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-[var(--foreground)]">
              {t("playerFinder.profile.title")}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[rgb(var(--foreground-rgb)/0.68)]">
              {t("playerFinder.profile.subtitle")}
            </p>
          </div>

          {profilesError && (
            <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {sportProfileCopy.schemaRequired}
            </div>
          )}

          <div className="mt-6">
            <PlayerProfileForm
              sports={sports}
              initialSportId={initialSportId}
              existingProfiles={sportProfiles ?? []}
              skillOptions={PLAYER_SKILL_LEVELS.map((value) => ({
                value,
                label: t(`playerFinder.skills.${value}`),
              }))}
              timeOptions={PLAYER_TIME_PREFERENCES.map((value) => ({
                value,
                label: t(`playerFinder.times.${value}`),
              }))}
              formatOptions={PLAYER_PLAY_FORMATS.map((value) => ({
                value,
                label: t(`playerFinder.formats.${value}`),
              }))}
              dayOptions={PLAYER_AVAILABILITY_DAYS.map((value) => ({
                value,
                label: t(`groups.days.${value}`),
              }))}
              copy={sportProfileCopy}
            />
          </div>
        </section>
      </main>
    </div>
  );
}
