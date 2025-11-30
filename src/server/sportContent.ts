import { getSportMeta } from "@/data/sportMeta";
import { supabaseSelect } from "@/lib/supabaseRest";
import type {
  SportFeatureCard,
  SportFeatureGroup,
  SportPagePayload,
} from "@/types/sports";

const FEATURE_DESCRIPTIONS: Record<
  string,
  {
    labelTh: string;
    labelEn: string;
    table: string;
    descriptionTh: string;
    descriptionEn: string;
  }
> = {
  courts: {
    labelTh: "ระบบค้นหาคอร์ท",
    labelEn: "Court Finder",
    table: "`courts` + `court_photos`",
    descriptionTh:
      "ข้อมูลคอร์ทแบบมีพิกัด ราคา และรูปภาพ เพื่อให้ผู้เล่นกรองตามจังหวัด/เขตได้ทันที",
    descriptionEn:
      "Unified venue data with geo, pricing, and media so sport seekers can filter by district instantly.",
  },
  groups: {
    labelTh: "ค้นหากลุ่ม/พาร์ทเนอร์",
    labelEn: "Group Finder",
    table: "`groups` + `group_members`",
    descriptionTh:
      "ค้นหากลุ่มแบบสาธารณะ/ส่วนตัว พร้อมระดับฝีมือและบทบาทเจ้าของกลุ่ม",
    descriptionEn:
      "Community discovery with owner/admin roles, visibility toggles, and skill filters.",
  },
  community: {
    labelTh: "กระดานคอมมูนิตี้",
    labelEn: "Community Board",
    table: "`posts` + `comments`",
    descriptionTh:
      "โพสต์คำถาม ข่าว และรีวิวที่ผูกกับกีฬา/กลุ่ม พร้อมระบบคอมเมนต์ภายใต้บัญชีเดียว",
    descriptionEn:
      "Discussions, news, and reviews moderated by shared Supabase Auth sessions.",
  },
  matches: {
    labelTh: "แมตช์ & สกอร์บอร์ด",
    labelEn: "Matches & Scoreboard",
    table: "`matches` + `match_participants` + `match_games`",
    descriptionTh:
      "สร้างแมตช์ กำหนดทีม และบันทึกสกอร์รายเกม พร้อมเชื่อมโยงคอร์ท/กลุ่ม",
    descriptionEn:
      "Team assignments, score-by-score tracking, and lifecycle statuses tied to each sport.",
  },
  profiles: {
    labelTh: "โปรไฟล์หลายกีฬา",
    labelEn: "Multi-sport Profiles",
    table: "`profiles` + `profile_sports`",
    descriptionTh:
      "บัญชีเดียวสำหรับทุกกีฬา เก็บระดับฝีมือและความชอบต่อกีฬาแต่ละประเภท",
    descriptionEn:
      "One identity across all subdomains with per-sport skills and preferences.",
  },
  feedback: {
    labelTh: "ศูนย์แจ้งปัญหา/ข้อเสนอแนะ",
    labelEn: "Feedback & Reports",
    table: "`feedback`",
    descriptionTh:
      "ระบบทิกเก็ตสำหรับแจ้งบั๊ก ฟีดแบ็ก หรือรายงานผู้ใช้ ให้แอดมินติดตามสถานะได้",
    descriptionEn:
      "Trust desk pipeline for bugs, feature ideas, and community safety reports.",
  },
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
};

type GroupRow = {
  id: string;
  name: string | null;
  description: string | null;
  location: string | null;
  skill_min: string | null;
  skill_max: string | null;
  is_public: boolean | null;
  owner_id: string | null;
  created_at: string | null;
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

function mapCourts(rows: CourtRow[]): SportFeatureCard[] {
  return rows.map((court) => {
    const location = compactDetails([court.province, court.district]).join(" · ");
    return {
      title: court.name ?? "Unnamed court",
      subtitle: location || "Location coming soon",
      details: compactDetails([
        court.address,
        court.price_note ? `Price: ${court.price_note}` : null,
        court.phone ? `Phone: ${court.phone}` : null,
        court.line_id ? `Line: ${court.line_id}` : null,
        court.website_url ? `Website: ${court.website_url}` : null,
        court.created_at
          ? `Updated ${formatDate(court.created_at)}`
          : null,
      ]),
    };
  });
}

function mapGroups(rows: GroupRow[]): SportFeatureCard[] {
  return rows.map((group) => ({
    title: group.name ?? "Untitled group",
    subtitle: compactDetails([
      group.location,
      group.is_public ? "Public" : "Private",
    ]).join(" · "),
    details: compactDetails([
      group.description,
      group.skill_min || group.skill_max
        ? `Skill: ${group.skill_min ?? "Any"} – ${group.skill_max ?? "Any"}`
        : null,
      group.created_at ? `Started ${formatDate(group.created_at)}` : null,
    ]),
  }));
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
        "id,name,address,district,province,price_note,phone,line_id,website_url,created_at",
      sport_id: `eq.${sportId}`,
      order: "created_at.desc",
      limit: "4",
    });

    const groupsPromise = supabaseSelect<GroupRow>("groups", {
      select:
        "id,name,description,location,skill_min,skill_max,is_public,owner_id,created_at",
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

    const courts = mapCourts(courtsRes.data ?? []);
    const groups = mapGroups(groupsRes.data ?? []);
    const posts = mapPosts(postsRes.data ?? []);
    const matches = mapMatches(matchesRes.data ?? []);
    const profiles = mapProfiles(profilesRes.data ?? []);
    const feedback = mapFeedback(feedbackRes.data ?? []);

    const features: SportFeatureGroup[] = [
      {
        ...FEATURE_DESCRIPTIONS.courts,
        cards: courts,
      },
      {
        ...FEATURE_DESCRIPTIONS.groups,
        cards: groups,
      },
      {
        ...FEATURE_DESCRIPTIONS.community,
        cards: posts,
      },
      {
        ...FEATURE_DESCRIPTIONS.matches,
        cards: matches,
      },
      {
        ...FEATURE_DESCRIPTIONS.profiles,
        cards: profiles,
      },
      {
        ...FEATURE_DESCRIPTIONS.feedback,
        cards: feedback,
      },
    ];

    return {
      code: sportRow.code,
      name: sportRow.name ?? meta.name,
      accent: meta.accent,
      gradient: meta.gradient,
      hero: {
        kicker: `${sportRow.code}.racketthailand.com`,
        headlineTh: meta.heroHeadlineTh,
        headlineEn: meta.heroHeadlineEn,
        descriptionTh: meta.heroDescriptionTh,
        descriptionEn: meta.heroDescriptionEn,
        stats: [
          { key: "courts" as const, value: formatCount(courtsRes.count) },
          { key: "groups" as const, value: formatCount(groupsRes.count) },
          { key: "matches" as const, value: formatCount(matchesRes.count) },
        ],
      },
      features,
      closing: {
        titleTh: meta.closingTitleTh,
        titleEn: meta.closingTitleEn,
        detailTh: meta.closingDetailTh,
        detailEn: meta.closingDetailEn,
        actions: meta.closingActions,
      },
    };
  } catch (error) {
    console.error(`Failed to build sport payload for ${code}`, error);
    return null;
  }
}
