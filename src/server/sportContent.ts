import { FEATURE_DESCRIPTIONS, getSportMeta } from "@/data/sportMeta";
import { supabaseSelect } from "@/lib/supabaseRest";
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
  address: string | null;
  district: string | null;
  province: string | null;
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

type MatchRow = {
  id: string;
  status: string | null;
  scheduled_at: string | null;
  court_id: string | null;
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
): SportFeatureCard[] {
  return rows.map((court) => {
    const location = compactDetails([court.province, court.district]).join(" · ");
    const imageUrl = pickPrimaryPhoto(court.court_photos, fallbackImage);
    return {
      title: court.name ?? "Unnamed court",
      subtitle: location || "",
      details: compactDetails([
        court.line_id ? `Line: ${court.line_id}` : null,
      ]),
      imageUrl,
      location,
      badgeLabel: court.province ?? undefined,
      href: `/courts/${court.id}`,
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

function mapMatches(rows: MatchRow[]): SportFeatureCard[] {
  return rows.map((match) => ({
    title: `Match ${match.id.slice(0, 8)}`,
    subtitle: compactDetails([
      match.status ? match.status.toUpperCase() : null,
      match.scheduled_at ? formatDate(match.scheduled_at) : null,
    ]).join(" · "),
    details: compactDetails([
      match.court_id ? `Court ID: ${match.court_id}` : null,
      match.group_id ? `Group ID: ${match.group_id}` : null,
      match.created_at ? `Created ${formatDate(match.created_at)}` : null,
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

    const courtsPromise = supabaseSelect<CourtRow>("courts", {
      select:
        "id,name,address,district,province,price_note,phone,line_id,website_url,created_at,court_photos(image_url,is_primary)",
      sport_id: `eq.${sportId}`,
      order: "created_at.desc",
      limit: "4",
    });

    const groupsPromise = supabaseSelect<GroupRow>("groups", {
      select:
        "id,name,description,created_at,group_photos(image_url,is_primary),group_sessions(day,start_time,end_time,courts(id,name))",
      sport_id: `eq.${sportId}`,
      order: "created_at.desc",
      limit: "4",
    });

    const postsPromise = supabaseSelect<PostRow>("posts", {
      select: "id,title,type,group_id,created_at",
      sport_id: `eq.${sportId}`,
      order: "created_at.desc",
      limit: "4",
    });

    const matchesPromise = supabaseSelect<MatchRow>("matches", {
      select: "id,status,scheduled_at,court_id,group_id,created_at",
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
      matchesRes,
      profilesRes,
      feedbackRes,
    ] = await Promise.all([
      courtsPromise,
      groupsPromise,
      postsPromise,
      matchesPromise,
      profilesPromise,
      feedbackPromise,
    ]);

    const fallbackImage = meta.coverImage;
    const courts = mapCourts(courtsRes.data ?? [], fallbackImage);
    const groups = mapGroups(groupsRes.data ?? [], fallbackImage);
    const posts = mapPosts(postsRes.data ?? []);
    const matches = mapMatches(matchesRes.data ?? []);
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
        key: "matches",
        ...FEATURE_DESCRIPTIONS.matches,
        cards: matches,
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
