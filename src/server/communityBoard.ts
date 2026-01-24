import { supabaseSelect } from "@/lib/supabaseRest";
import { fetchSportRow } from "@/server/courtFinder";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUuid(value: string) {
  return UUID_PATTERN.test(value);
}

type ProfilePreview = {
  display_name: string | null;
  avatar_url: string | null;
};

type RelationshipCount = { count: number }[];

export type CommunityPost = {
  id: string;
  title: string;
  body_text: string;
  category: string;
  pinned: boolean;
  status: string;
  created_at: string;
  updated_at: string;
  sport_id?: string | null;
  author_id?: string | null;
  author?: ProfilePreview | null;
  likesCount: number;
  commentsCount: number;
};

type CommunityPostRow = {
  id: string;
  title: string;
  body_text: string;
  category: string;
  pinned: boolean;
  status: string;
  created_at: string;
  updated_at: string;
  sport_id?: string | null;
  author_id?: string | null;
  profiles?: ProfilePreview | null;
  community_likes?: RelationshipCount;
  community_comments?: RelationshipCount;
};

export async function fetchCommunityPosts(
  sportCode: string,
  limit = 20,
) {
  const sportRow = await fetchSportRow(sportCode);
  if (!sportRow) {
    return { sport: null, posts: [] as CommunityPost[] };
  }

  const { data } = await supabaseSelect<CommunityPostRow>(
    "community_posts",
    {
      select:
        "id,title,body_text,category,pinned,status,created_at,updated_at,author_id,profiles:author_id(display_name,avatar_url),community_likes(count),community_comments(count)",
      sport_id: `eq.${sportRow.id}`,
      status: "eq.published",
      order: "pinned.desc,created_at.desc",
      limit: String(limit),
    },
  );

  const posts: CommunityPost[] =
    data?.map((row) => ({
      id: row.id,
      title: row.title,
      body_text: row.body_text,
      category: row.category,
      pinned: row.pinned,
      status: row.status,
      created_at: row.created_at,
      author: row.profiles ?? null,
      author_id: row.author_id,
      updated_at: row.updated_at,
      likesCount: row.community_likes?.[0]?.count ?? 0,
      commentsCount: row.community_comments?.[0]?.count ?? 0,
    })) ?? [];

  return { sport: sportRow, posts };
}

export async function fetchCommunityPostsByAuthor(
  sportCode: string,
  authorId: string,
) {
  const sportRow = await fetchSportRow(sportCode);
  if (!sportRow) {
    return { sport: null, posts: [] as CommunityPost[] };
  }

  const { data } = await supabaseSelect<CommunityPostRow>(
    "community_posts",
    {
      select:
        "id,title,body_text,category,pinned,status,created_at,updated_at,author_id,profiles:author_id(display_name,avatar_url),community_likes(count),community_comments(count)",
      sport_id: `eq.${sportRow.id}`,
      author_id: `eq.${authorId}`,
      status: "eq.published",
      order: "created_at.desc",
      limit: "20",
    },
  );

  const posts: CommunityPost[] =
    data?.map((row) => ({
      id: row.id,
      title: row.title,
      body_text: row.body_text,
      category: row.category,
      pinned: row.pinned,
      status: row.status,
      created_at: row.created_at,
      author: row.profiles ?? null,
      author_id: row.author_id,
      updated_at: row.updated_at,
      likesCount: row.community_likes?.[0]?.count ?? 0,
      commentsCount: row.community_comments?.[0]?.count ?? 0,
    })) ?? [];

  return { sport: sportRow, posts };
}

export async function fetchCommunityPostDetail(postId: string) {
  if (!isValidUuid(postId)) {
    return null;
  }
  const { data } = await supabaseSelect<CommunityPostRow>(
    "community_posts",
    {
      select:
        "id,title,body_text,category,pinned,status,created_at,updated_at,sport_id,author_id,profiles:author_id(display_name,avatar_url),community_likes(count),community_comments(count)",
      id: `eq.${postId}`,
      limit: "1",
    },
  );
  const postRow = data?.[0];
  if (!postRow) {
    return null;
  }
  return {
    id: postRow.id,
    title: postRow.title,
    body_text: postRow.body_text,
    category: postRow.category,
    pinned: postRow.pinned,
    status: postRow.status,
    created_at: postRow.created_at,
    sport_id: postRow.sport_id,
    author: postRow.profiles ?? null,
    updated_at: postRow.updated_at,
    author_id: postRow.author_id,
    likesCount: postRow.community_likes?.[0]?.count ?? 0,
    commentsCount: postRow.community_comments?.[0]?.count ?? 0,
  };
}

type CommentRow = {
  id: string;
  body_text: string;
  created_at: string;
  updated_at: string;
  profiles?: ProfilePreview | null;
  author_id?: string | null;
};

export type CommunityComment = {
  id: string;
  body_text: string;
  created_at: string;
  updated_at: string;
  author_id?: string | null;
  author?: ProfilePreview | null;
};

export async function fetchCommunityComments(postId: string) {
  if (!isValidUuid(postId)) {
    return [];
  }
  const { data } = await supabaseSelect<CommentRow>(
    "community_comments",
    {
      select:
        "id,body_text,created_at,updated_at,author_id,profiles:author_id(display_name,avatar_url)",
      post_id: `eq.${postId}`,
      order: "created_at.asc",
    },
    { preferCount: false },
  );

  return (
    data?.map((row) => ({
      id: row.id,
      body_text: row.body_text,
      created_at: row.created_at,
      updated_at: row.updated_at,
      author_id: row.author_id ?? undefined,
      author: row.profiles ?? null,
    })) ?? []
  );
}
