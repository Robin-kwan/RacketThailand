import { FEATURE_DESCRIPTIONS, getSportMeta } from "@/data/sportMeta";
import type { Locale } from "@/lib/i18n";
import { supabaseSelect } from "@/lib/supabaseRest";
import { fetchCourtIdsBySportId } from "@/server/courtSports";
import { localizeThailandLocation } from "@/server/thailand-location";
import type {
  SportFeatureCard,
  SportFeatureGroup,
  SportPagePayload,
} from "@/types/sports";

type PhotoRow = {
  image_url: string | null;
  is_primary: boolean | null;
};

type CourtRow = {
  id: string;
  name: string | null;
  description: string | null;
  address: string | null;
  district: string | null;
  province: string | null;
  district_id?: number | null;
  province_id?: number | null;
  price_note: string | null;
  phone: string | null;
  line_id: string | null;
  website_url: string | null;
  created_at: string | null;
  court_photos?: PhotoRow[] | null;
};

type GroupRow = {
  id: string;
  name: string | null;
  description: string | null;
  created_at: string | null;
  play_format?: "single" | "double" | null;
  allow_walk_in: boolean | null;
  group_photos?: PhotoRow[] | null;
  group_sessions?: {
    day: string;
    start_time: string | null;
    end_time: string | null;
    courts?: { id: string | null; name: string | null } | null;
  }[] | null;
};

type PostRow = {
  id: string;
  title: string | null;
  type: string | null;
  group_id: string | null;
  created_at: string | null;
};

type ProfileSportRow = {
  skill_level: string | null;
  preference: number | null;
  is_primary: boolean | null;
  created_at: string | null;
  profiles: {
    id: string;
    username: string | null;
    display_name: string | null;
    location: string | null;
    default_sport: string | null;
  } | null;
};

type FeedbackRow = {
  id: string;
  type: string | null;
  subject: string | null;
  status: string | null;
  priority: string | null;
  created_at: string | null;
};

const FINDER_PREVIEW_LIMIT = "12";

const DATE_FORMAT: Intl.DateTimeFormatOptions = {
  month: "short",
  day: "numeric",
};

function formatDate(dateString: string | null | undefined) {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", DATE_FORMAT);
}

function formatCount(count?: number | null) {
  if (count == null) return "0";
  return count.toLocaleString("en-US");
}

function compactDetails(details: Array<string | null | undefined>): string[] {
  return details.filter((item): item is string => Boolean(item && item.trim()));
}

function pickPrimaryPhoto(
  photos: PhotoRow[] | null | undefined,
  fallback: string,
) {
  if (!photos || photos.length === 0) {
    return fallback;
  }
  return (
    photos.find((photo) => photo.is_primary)?.image_url ??
    photos[0]?.image_url ??
    fallback
  );
}

function mapCourts(
  rows: CourtRow[],
  fallbackImage: string,
  sportCode: string,
): SportFeatureCard[] {
  return rows.map((court) => {
    const location = compactDetails([court.province, court.district]).join(" · ");
    const imageUrl = pickPrimaryPhoto(court.court_photos, fallbackImage);
    return {
      title: court.name ?? "Unnamed court",
      subtitle: location || "",
      details: compactDetails([
        court.description,
        court.line_id ? `Line: ${court.line_id}` : null,
      ]),
      imageUrl,
      location,
      badgeLabel: court.province ?? undefined,
      href: `/courts/${court.id}?sport=${encodeURIComponent(sportCode)}`,
    };
  });
}

function mapGroups(
  rows: GroupRow[],
  fallbackImage: string,
): SportFeatureCard[] {
  return rows.map((group) => {
    const imageUrl = pickPrimaryPhoto(group.group_photos, fallbackImage);
    const sessions =
      group.group_sessions?.map((session) => ({
        day: session.day,
        start_time: session.start_time,
        end_time: session.end_time,
        courts: session.courts
          ? { id: session.courts.id, name: session.courts.name }
          : null,
      })) ?? [];
    return {
      title: group.name ?? "Untitled group",
      subtitle: "",
      details: compactDetails([group.description]),
      imageUrl,
      location: undefined,
      badgeLabel: "COMMUNITY",
      href: `/groups/${group.id}`,
      playFormat: group.play_format ?? null,
      allowWalkIn: group.allow_walk_in,
      sessions,
    };
  });
}

function mapPosts(rows: PostRow[]): SportFeatureCard[] {
  return rows.map((post) => ({
    title: post.title ?? "Untitled post",
    subtitle: compactDetails([
      post.type ? post.type.toUpperCase() : null,
      post.group_id ? `Group ${post.group_id.slice(0, 6)}` : null,
    ]).join(" · "),
    details: compactDetails([
      post.created_at ? `Published ${formatDate(post.created_at)}` : null,
      post.group_id ? `Linked group ID ${post.group_id}` : null,
    ]),
  }));
}

function mapProfiles(rows: ProfileSportRow[]): SportFeatureCard[] {
  return rows.map((profileSport) => {
    const profile = profileSport.profiles;
    const name =
      profile?.display_name ??
      profile?.username ??
      `Profile ${profile?.id.slice(0, 6)}`;
    return {
      title: name ?? "Community member",
      subtitle: compactDetails([
        profile?.location,
        profileSport.is_primary ? "Primary sport" : "Multi-sport",
      ]).join(" · "),
      details: compactDetails([
        profileSport.skill_level
          ? `Skill level: ${profileSport.skill_level}`
          : null,
        profileSport.preference
          ? `Preference: ${profileSport.preference}/5`
          : null,
        profile?.default_sport
          ? `Default sport: ${profile?.default_sport}`
          : null,
        profileSport.created_at
          ? `Updated ${formatDate(profileSport.created_at)}`
          : null,
      ]),
    };
  });
}

function mapFeedback(rows: FeedbackRow[]): SportFeatureCard[] {
  return rows.map((feedback) => ({
    title: feedback.subject ?? "Feedback item",
    subtitle: compactDetails([
      feedback.type,
      feedback.status ? `Status: ${feedback.status}` : null,
    ]).join(" · "),
    details: compactDetails([
      feedback.priority ? `Priority: ${feedback.priority}` : null,
      feedback.created_at ? `Submitted ${formatDate(feedback.created_at)}` : null,
      `Ticket ID: ${feedback.id.slice(0, 8)}`,
    ]),
  }));
}

export async function buildSportPagePayload(
  code: string,
  locale: Locale = "th",
): Promise<SportPagePayload | null> {
  const meta = getSportMeta(code);
  if (!meta) {
    return null;
  }

  try {
    const { data: sports } = await supabaseSelect<{
      id: string;
      name: string;
      code: string;
    }>("sports", {
      select: "id,code,name",
      code: `eq.${code}`,
      limit: "1",
    });

    const sportRow = sports[0];

    if (!sportRow) {
      return null;
    }

    const sportId = sportRow.id;
    const multiSportCourtIds = await fetchCourtIdsBySportId(sportId);

    const courtParams: Record<string, string> = {
      select:
        "id,name,description,address,district,province,district_id,province_id,price_note,phone,line_id,website_url,created_at,court_photos(image_url,is_primary)",
      is_active: "eq.true",
      order: "created_at.desc",
      limit: FINDER_PREVIEW_LIMIT,
    };
    if (multiSportCourtIds.length > 0) {
      courtParams.id = `in.(${multiSportCourtIds.join(",")})`;
    } else {
      courtParams.id = "eq.00000000-0000-0000-0000-000000000000";
    }

    const courtsPromise = supabaseSelect<CourtRow>("courts", courtParams);

    const groupsPromise = supabaseSelect<GroupRow>("groups", {
      select:
        "id,name,description,created_at,play_format,allow_walk_in,group_photos(image_url,is_primary),group_sessions(day,start_time,end_time,courts(id,name))",
      sport_id: `eq.${sportId}`,
      order: "updated_at.desc.nullslast",
      limit: FINDER_PREVIEW_LIMIT,
    });

    const postsPromise = supabaseSelect<PostRow>("posts", {
      select: "id,title,type,group_id,created_at",
      sport_id: `eq.${sportId}`,
      order: "created_at.desc",
      limit: "4",
    });

    const profilesPromise = supabaseSelect<ProfileSportRow>("profile_sports", {
      select:
        "skill_level,preference,is_primary,created_at,profiles(id,username,display_name,location,default_sport)",
      sport_id: `eq.${sportId}`,
      order: "created_at.desc",
      limit: "4",
    });

    const feedbackPromise = supabaseSelect<FeedbackRow>("feedback", {
      select: "id,type,subject,status,priority,created_at",
      sport_id: `eq.${sportId}`,
      order: "created_at.desc",
      limit: "4",
    });

    const [
      courtsRes,
      groupsRes,
      postsRes,
      profilesRes,
      feedbackRes,
    ] = await Promise.all([
      courtsPromise,
      groupsPromise,
      postsPromise,
      profilesPromise,
      feedbackPromise,
    ]);

    const fallbackImage = meta.coverImage;
    const localizedCourtRows = await Promise.all(
      (courtsRes.data ?? []).map(async (court) => {
        const localized = await localizeThailandLocation(court, locale);
        return {
          ...court,
          district: localized.district,
          province: localized.province,
        };
      }),
    );
    const courts = mapCourts(localizedCourtRows, fallbackImage, sportRow.code);
    const groups = mapGroups(groupsRes.data ?? [], fallbackImage);
    const posts = mapPosts(postsRes.data ?? []);
    const profiles = mapProfiles(profilesRes.data ?? []);
    const feedback = mapFeedback(feedbackRes.data ?? []);

    const features: SportFeatureGroup[] = [
      {
        key: "courts",
        ...FEATURE_DESCRIPTIONS.courts,
        cards: courts,
      },
      {
        key: "groups",
        ...FEATURE_DESCRIPTIONS.groups,
        cards: groups,
      },
      {
        key: "community",
        ...FEATURE_DESCRIPTIONS.community,
        cards: posts,
      },
      {
        key: "profiles",
        ...FEATURE_DESCRIPTIONS.profiles,
        cards: profiles,
      },
      {
        key: "feedback",
        ...FEATURE_DESCRIPTIONS.feedback,
        cards: feedback,
      },
    ];

    return {
      code: sportRow.code,
      name: meta.name,
      accent: meta.accent,
      gradient: meta.gradient,
      hero: {
        kicker: sportRow.code,
        headline: meta.heroHeadline,
        description: meta.heroDescription,
        stats: [
          { key: "courts" as const, value: formatCount(courtsRes.count) },
          { key: "groups" as const, value: formatCount(groupsRes.count) },
        ],
      },
      features,
      closing: {
        title: meta.closingTitle,
        detail: meta.closingDetail,
        actions: meta.closingActions,
      },
    };
  } catch (error) {
    console.error(`Failed to build sport payload for ${code}`, error);
    return null;
  }
}
