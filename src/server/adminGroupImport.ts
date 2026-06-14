import { promises as fs } from "fs";
import path from "path";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { syncCourtSports } from "@/server/courtSports";
import { syncCourtGroupLinks } from "@/server/groupSessions";
import { resolveThailandLocationIds } from "@/server/thailand-location";

const AUTOMATION_RUNS_DIR = path.join(
  process.cwd(),
  ".codex",
  "facebook-badminton-group-preview",
  "runs",
);

const GROUP_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_GROUP_BUCKET || "group-images";

const DAY_PATTERNS: Array<{ day: string; patterns: string[] }> = [
  {
    day: "monday",
    patterns: [
      "\u0e27\u0e31\u0e19\u0e08\u0e31\u0e19\u0e17\u0e23\u0e4c",
      "\u0e08\u0e31\u0e19\u0e17\u0e23\u0e4c",
      "monday",
      "mon",
    ],
  },
  {
    day: "tuesday",
    patterns: [
      "\u0e27\u0e31\u0e19\u0e2d\u0e31\u0e07\u0e04\u0e32\u0e23",
      "\u0e2d\u0e31\u0e07\u0e04\u0e32\u0e23",
      "tuesday",
      "tue",
    ],
  },
  {
    day: "wednesday",
    patterns: [
      "\u0e27\u0e31\u0e19\u0e1e\u0e38\u0e18",
      "\u0e1e\u0e38\u0e18",
      "wednesday",
      "wed",
    ],
  },
  {
    day: "thursday",
    patterns: [
      "\u0e27\u0e31\u0e19\u0e1e\u0e24\u0e2b\u0e31\u0e2a\u0e1a\u0e14\u0e35",
      "\u0e1e\u0e24\u0e2b\u0e31\u0e2a\u0e1a\u0e14\u0e35",
      "\u0e1e\u0e24\u0e2b\u0e31\u0e2a",
      "thursday",
      "thu",
    ],
  },
  {
    day: "friday",
    patterns: [
      "\u0e27\u0e31\u0e19\u0e28\u0e38\u0e01\u0e23\u0e4c",
      "\u0e28\u0e38\u0e01\u0e23\u0e4c",
      "friday",
      "fri",
    ],
  },
  {
    day: "saturday",
    patterns: [
      "\u0e27\u0e31\u0e19\u0e40\u0e2a\u0e32\u0e23\u0e4c",
      "\u0e40\u0e2a\u0e32\u0e23\u0e4c",
      "saturday",
      "sat",
    ],
  },
  {
    day: "sunday",
    patterns: [
      "\u0e27\u0e31\u0e19\u0e2d\u0e32\u0e17\u0e34\u0e15\u0e22\u0e4c",
      "\u0e2d\u0e32\u0e17\u0e34\u0e15\u0e22\u0e4c",
      "sunday",
      "sun",
    ],
  },
];

type PreviewCandidate = {
  groupName?: string | null;
  venue?: string[] | null;
  provinceDistrict?: string[] | null;
  schedule?: string[] | null;
  contactMethods?: string[] | null;
  sourcePostUrl?: string | null;
  cleanedDescription?: string | null;
  originalExcerpt?: string | null;
  imageFilenames?: string[] | null;
  courtMatch?: string | null;
  confidenceNotes?: string | null;
};

type PreviewPayload = {
  runDate?: string | null;
  candidates?: PreviewCandidate[] | null;
};

type ImportedGroupResult = {
  candidateIndex: number;
  name: string;
  groupId: string;
  courtId: string | null;
  courtName: string | null;
  imageCount: number;
  warnings: string[];
};

type ImportDraftGroupsInput = {
  preview: PreviewPayload;
  runDate?: string | null;
  selectedCandidateIndexes?: number[];
};

type LatestPreviewRun = {
  runDate: string;
  previewPath: string;
  previewText: string;
};

type AdminOwnerProfile = {
  id: string;
  username: string | null;
  display_name: string | null;
};

type ParsedContactDetails = {
  phone: string | null;
  lineId: string | null;
  websiteUrl: string | null;
};

type ResolvedCourt = {
  courtId: string | null;
  courtName: string | null;
  created: boolean;
  warnings: string[];
};

type ExistingGroupRow = {
  id: string;
  sport_id: string | null;
  name: string | null;
  description: string | null;
  phone: string | null;
  line_id: string | null;
  website_url: string | null;
  status: string | null;
};

type ExistingGroupSessionRow = {
  group_id: string;
  court_id: string | null;
  day: string | null;
  start_time: string | null;
  end_time: string | null;
  courts?:
    | {
        name: string | null;
      }
    | Array<{
        name: string | null;
      }>
    | null;
};

type ParsedSession = {
  courtId: string | null;
  day: string;
  start: string;
  end: string;
};

type RawPostMetadata = {
  description: string | null;
  title: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function sanitizeText(value: string | null | undefined) {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

function sanitizeDescription(value: string | null | undefined) {
  return (value ?? "")
    .replace(/https?:\/\/l\.facebook\.com\/[^\s]+/gi, "")
    .replace(/https?:\/\/(?:www\.)?facebook\.com\/[^\s]+/gi, "")
    .replace(/https?:\/\/m\.me\/[^\s]+/gi, "")
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function isTruncatedDescription(value: string | null | undefined) {
  return sanitizeDescription(value).endsWith("...");
}

function normalizeDescriptionForComparison(value: string | null | undefined) {
  return sanitizeDescription(value).replace(/\s+/g, " ").trim();
}

function pickDescription(
  candidate: PreviewCandidate,
  fallbackDescription?: string | null,
) {
  const options = [
    sanitizeDescription(fallbackDescription),
    sanitizeDescription(candidate.cleanedDescription),
    sanitizeDescription(candidate.originalExcerpt),
  ].filter(Boolean);
  return options[0] || null;
}

function normalizeName(value: string) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "")
    .trim();
}

function normalizeContactValue(value: string | null | undefined) {
  return sanitizeText(value).toLowerCase();
}

function hasSupportedContactMethod(
  candidate: PreviewCandidate,
  contact: ParsedContactDetails,
) {
  if (contact.phone || contact.lineId || contact.websiteUrl) {
    return true;
  }

  return (candidate.contactMethods ?? []).some((method) =>
    /(?:line|phone|tel|qr)/i.test(method),
  );
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCodePoint(Number.parseInt(hex, 16)),
    )
    .replace(/&#([0-9]+);/g, (_, dec) =>
      String.fromCodePoint(Number.parseInt(dec, 10)),
    )
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function extractMetaContent(html: string, propertyName: string) {
  const escapedProperty = propertyName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(
      `<meta\\s+property="${escapedProperty}"\\s+content="([\\s\\S]*?)"`,
      "i",
    ),
    new RegExp(
      `<meta\\s+name="${escapedProperty}"\\s+content="([\\s\\S]*?)"`,
      "i",
    ),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return decodeHtmlEntities(match[1]);
    }
  }

  return null;
}

function extractVenueFromDescription(value: string | null | undefined) {
  const lines = (value ?? "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const venuePattern =
    /(?:\u0e2a\u0e16\u0e32\u0e19\u0e17\u0e35\u0e48|\u0e2a\u0e19\u0e32\u0e21)\s*[:：]?\s*(.+)$/;

  for (const line of lines) {
    const match = line.match(venuePattern);
    if (match?.[1]) {
      return sanitizeText(match[1]);
    }
  }

  return null;
}

function parsePhone(text: string) {
  const match = text.match(/(?:\+66|0)[0-9][0-9\-\s]{7,}[0-9]/);
  return match?.[0]?.replace(/\s+/g, "").trim() ?? null;
}

function extractFirstUrl(text: string) {
  const match = text.match(/https?:\/\/[^\s)]+/i);
  return match?.[0] ?? null;
}

function parseLineValue(text: string) {
  const colonIndex = text.indexOf(":");
  if (colonIndex >= 0) {
    const value = sanitizeText(text.slice(colonIndex + 1));
    return value || null;
  }

  if (/line/i.test(text)) {
    const url = extractFirstUrl(text);
    if (url) {
      return url;
    }
  }

  return null;
}

function parseContactDetails(
  candidate: PreviewCandidate,
  fallbackDescription?: string | null,
): ParsedContactDetails {
  const values = [
    ...(candidate.contactMethods ?? []),
    fallbackDescription ?? "",
    candidate.cleanedDescription ?? "",
    candidate.originalExcerpt ?? "",
  ]
    .map((value) => sanitizeText(value))
    .filter(Boolean);

  let phone: string | null = null;
  let lineId: string | null = null;
  let websiteUrl: string | null = null;

  for (const value of values) {
    phone ||= parsePhone(value);
    if (!lineId && /line/i.test(value)) {
      lineId = parseLineValue(value);
    }
    if (!websiteUrl) {
      const url = extractFirstUrl(value);
      if (url && !/facebook\.com/i.test(url)) {
        websiteUrl = url;
      }
    }
  }

  return {
    phone,
    lineId,
    websiteUrl,
  };
}

function looksCorruptedText(value: string | null | undefined) {
  const text = sanitizeText(value);
  if (!text) {
    return true;
  }

  const questionMarkCount = (text.match(/\?/g) ?? []).length;
  return questionMarkCount >= Math.ceil(text.length * 0.3);
}

function cleanRawPostTitle(value: string | null | undefined) {
  const title = sanitizeText(value)
    .replace(/\|\s*facebook$/i, "")
    .replace(/^หาเพื่อนตีแบด\s*\|\s*/i, "")
    .trim();

  return title || null;
}

function normalizeRecoveredGroupName(value: string | null | undefined) {
  const prefix = "หาเพื่อนตีแบด | ";
  let name = cleanRawPostTitle(value);
  if (name?.startsWith(prefix)) {
    name = name.slice(prefix.length).trim();
  }
  return name || null;
}

function looksLikeHeadlineInsteadOfGroupName(value: string | null | undefined) {
  const name = sanitizeText(value);
  if (!name) {
    return true;
  }

  if (name.endsWith("...")) {
    return true;
  }

  const wordCount = name.split(/\s+/).filter(Boolean).length;
  const hasMarketingKeywords =
    /(เปิดก๊วน|รับสมาชิก|วันนี้ยังว่าง|ขออนุญาต|หาเพื่อน|กลับมาจัดก๊วน|เวลา\s*\d|ทุกวัน|วันอาทิตย์|วันเสาร์|วันศุกร์|วันพฤหัส|วันพุธ|วันอังคาร|วันจันทร์)/i.test(
      name,
    );

  return wordCount >= 6 && hasMarketingKeywords;
}

function buildExistingGroupFingerprint(group: ExistingGroupRow) {
  return {
    normalizedName: normalizeName(group.name ?? ""),
    normalizedDescription: normalizeDescriptionForComparison(group.description),
    normalizedPhone: normalizeContactValue(group.phone),
    normalizedLineId: normalizeContactValue(group.line_id),
    normalizedWebsiteUrl: normalizeContactValue(group.website_url),
  };
}

function buildSessionFingerprint(session: {
  courtId?: string | null;
  courtName?: string | null;
  day?: string | null;
  start?: string | null;
  end?: string | null;
}) {
  const normalizedCourtName = normalizeName(session.courtName ?? "");
  const courtKey = session.courtId?.trim()
    ? `id:${session.courtId.trim()}`
    : `name:${normalizedCourtName}`;

  return `${courtKey}:${session.day ?? ""}:${session.start ?? ""}:${session.end ?? ""}`;
}

function buildScheduleFingerprint(session: {
  day?: string | null;
  start?: string | null;
  end?: string | null;
}) {
  return `${session.day ?? ""}:${session.start ?? ""}:${session.end ?? ""}`;
}

function getSessionCourtName(
  session: Pick<ExistingGroupSessionRow, "courts">,
): string | null {
  if (!session.courts) {
    return null;
  }

  return Array.isArray(session.courts)
    ? session.courts[0]?.name ?? null
    : session.courts.name ?? null;
}

function findDuplicateGroup(
  groups: ExistingGroupRow[],
  sessionsByGroupId: Map<string, ExistingGroupSessionRow[]>,
  candidate: {
    sportId: string;
    name: string;
    description: string | null;
    phone: string | null;
    lineId: string | null;
    websiteUrl: string | null;
    sessions: ParsedSession[];
    venueNames: string[];
  },
) {
  const normalizedName = normalizeName(candidate.name);
  const normalizedDescription = normalizeDescriptionForComparison(
    candidate.description,
  );
  const normalizedPhone = normalizeContactValue(candidate.phone);
  const normalizedLineId = normalizeContactValue(candidate.lineId);
  const normalizedWebsiteUrl = normalizeContactValue(candidate.websiteUrl);
  const candidateSessionFingerprints = new Set(
    candidate.sessions.map((session) =>
      buildSessionFingerprint({
        courtId: session.courtId,
        day: session.day,
        start: session.start,
        end: session.end,
      }),
    ),
  );
  const candidateScheduleFingerprints = new Set(
    candidate.sessions.map((session) =>
      buildScheduleFingerprint({
        day: session.day,
        start: session.start,
        end: session.end,
      }),
    ),
  );
  const candidateVenueFingerprints = new Set(
    candidate.venueNames
      .map((venueName) => normalizeName(venueName))
      .filter(Boolean)
      .map((venueName) => `name:${venueName}`),
  );

  if (!normalizedName) {
    return null;
  }

  return (
    groups.find((group) => {
      if (group.sport_id !== candidate.sportId) {
        return false;
      }

      const existing = buildExistingGroupFingerprint(group);
      if (existing.normalizedName !== normalizedName) {
        return false;
      }

      const existingSessions = sessionsByGroupId.get(group.id) ?? [];
      if (candidateSessionFingerprints.size > 0 && existingSessions.length > 0) {
        const existingSessionFingerprints = new Set(
          existingSessions.map((session) =>
            buildSessionFingerprint({
              courtId: session.court_id,
              courtName: getSessionCourtName(session),
              day: session.day,
              start: session.start_time,
              end: session.end_time,
            }),
          ),
        );
        const existingScheduleFingerprints = new Set(
          existingSessions.map((session) =>
            buildScheduleFingerprint({
              day: session.day,
              start: session.start_time,
              end: session.end_time,
            }),
          ),
        );

        if (
          Array.from(candidateSessionFingerprints).some((fingerprint) =>
            existingSessionFingerprints.has(fingerprint),
          )
        ) {
          return true;
        }

        if (
          Array.from(candidateScheduleFingerprints).some((fingerprint) =>
            existingScheduleFingerprints.has(fingerprint),
          )
        ) {
          return true;
        }
      }

      if (candidateVenueFingerprints.size > 0 && existingSessions.length > 0) {
        const existingVenueFingerprints = new Set(
          existingSessions
            .map((session) => normalizeName(getSessionCourtName(session) ?? ""))
            .filter(Boolean)
            .map((venueName) => `name:${venueName}`),
        );

        if (
          candidateSessionFingerprints.size === 0 &&
          Array.from(candidateVenueFingerprints).some((fingerprint) =>
            existingVenueFingerprints.has(fingerprint),
          )
        ) {
          return true;
        }
      }

      const sharedContact =
        (normalizedPhone &&
          existing.normalizedPhone &&
          existing.normalizedPhone === normalizedPhone) ||
        (normalizedLineId &&
          existing.normalizedLineId &&
          existing.normalizedLineId === normalizedLineId) ||
        (normalizedWebsiteUrl &&
          existing.normalizedWebsiteUrl &&
          existing.normalizedWebsiteUrl === normalizedWebsiteUrl);

      if (sharedContact) {
        return true;
      }

      return (
        Boolean(normalizedDescription) &&
        Boolean(existing.normalizedDescription) &&
        existing.normalizedDescription === normalizedDescription
      );
    }) ?? null
  );
}

function parseProvinceDistrict(value: string[] | null | undefined) {
  const first = value?.map((entry) => sanitizeText(entry)).find(Boolean);
  if (!first) {
    return { province: null, district: null };
  }

  const parts = first
    .split(/[|/]/)
    .map((entry) => sanitizeText(entry))
    .filter(Boolean);

  if (parts.length >= 2) {
    return {
      province: parts[0] || null,
      district: parts[1] || null,
    };
  }

  return {
    province: parts[0] || null,
    district: null,
  };
}

function parseDetectedDays(value: string) {
  const normalized = value.toLowerCase();
  const matchedDays = DAY_PATTERNS.filter(({ patterns }) =>
    patterns.some((pattern) => normalized.includes(pattern.toLowerCase())),
  ).map(({ day }) => day);

  if (matchedDays.length > 0) {
    return Array.from(new Set(matchedDays));
  }

  if (
    normalized.includes("\u0e17\u0e38\u0e01\u0e27\u0e31\u0e19") ||
    normalized.includes("daily")
  ) {
    return DAY_PATTERNS.map(({ day }) => day);
  }

  return [];
}

function normalizeTimePart(hours: string, minutes: string) {
  return `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}`;
}

function parseScheduleSessions(
  scheduleSources: string[],
  courtId: string | null,
): ParsedSession[] {
  if (!courtId) {
    return [];
  }

  const sessions = scheduleSources.flatMap((entry) => {
    const text = sanitizeText(entry);
    if (!text) {
      return [] as ParsedSession[];
    }

    const timeMatch = text.match(
      /(\d{1,2})[:.](\d{2})\s*[-–—]\s*(\d{1,2})[:.](\d{2})/,
    );
    if (!timeMatch) {
      return [] as ParsedSession[];
    }

    const days = parseDetectedDays(text);
    if (days.length === 0) {
      return [] as ParsedSession[];
    }

    const start = normalizeTimePart(timeMatch[1], timeMatch[2]);
    const end = normalizeTimePart(timeMatch[3], timeMatch[4]);

    return days.map((day) => ({
      courtId,
      day,
      start,
      end,
    }));
  });

  return Array.from(
    new Map(
      sessions.map((session) => [
        `${session.courtId}:${session.day}:${session.start}:${session.end}`,
        session,
      ]),
    ).values(),
  );
}

async function loadRawPostMetadata(
  runDate: string | null | undefined,
  sourcePostUrl: string | null | undefined,
): Promise<RawPostMetadata | null> {
  if (!runDate || !sourcePostUrl) {
    return null;
  }

  const postId = sourcePostUrl.match(/posts\/(\d+)/)?.[1];
  if (!postId) {
    return null;
  }

  const rawPostPath = path.join(
    AUTOMATION_RUNS_DIR,
    runDate,
    "raw",
    `post-${postId}.html`,
  );

  try {
    const html = await fs.readFile(rawPostPath, "utf8");
    return {
      description:
        extractMetaContent(html, "og:description") ??
        extractMetaContent(html, "description"),
      title: extractMetaContent(html, "og:title"),
    };
  } catch {
    return null;
  }
}

async function resolveRunImagesDirectory(runDate: string | null | undefined) {
  if (!runDate) {
    return null;
  }

  const imageDirectory = path.join(AUTOMATION_RUNS_DIR, runDate, "images");
  try {
    await fs.access(imageDirectory);
    return imageDirectory;
  } catch {
    return null;
  }
}

function getContentType(filename: string) {
  const extension = path.extname(filename).toLowerCase();
  switch (extension) {
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    case ".jpeg":
    case ".jpg":
    default:
      return "image/jpeg";
  }
}

async function uploadGroupImages(
  groupId: string,
  imageDirectory: string | null,
  imageFilenames: string[] | null | undefined,
) {
  if (!imageDirectory || !imageFilenames || imageFilenames.length === 0) {
    return { count: 0, warnings: [] as string[] };
  }

  const supabase = getSupabaseAdminClient();
  const warnings: string[] = [];
  let uploadedCount = 0;

  for (const [index, filename] of imageFilenames.entries()) {
    const sourcePath = path.join(imageDirectory, filename);
    try {
      const buffer = await fs.readFile(sourcePath);
      const extension = path.extname(filename) || ".jpg";
      const storagePath = `${groupId}/${Date.now()}-${index}${extension}`;
      const contentType = getContentType(filename);

      const { error: uploadError } = await supabase.storage
        .from(GROUP_BUCKET)
        .upload(storagePath, buffer, {
          contentType,
          upsert: true,
        });

      if (uploadError) {
        warnings.push(`Failed to upload ${filename}: ${uploadError.message}`);
        continue;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from(GROUP_BUCKET).getPublicUrl(storagePath);

      const { error: insertPhotoError } = await supabase
        .from("group_photos")
        .insert({
          group_id: groupId,
          image_url: publicUrl,
          is_primary: index === 0,
        });

      if (insertPhotoError) {
        warnings.push(
          `Uploaded ${filename} but could not save photo row: ${insertPhotoError.message}`,
        );
        continue;
      }

      uploadedCount += 1;
    } catch {
      warnings.push(`Image file not found: ${filename}`);
    }
  }

  return { count: uploadedCount, warnings };
}

async function findExistingCourt(venueNames: string[]) {
  const supabase = getSupabaseAdminClient();

  for (const venueName of venueNames) {
    const normalizedVenueName = normalizeName(venueName);
    if (!normalizedVenueName) {
      continue;
    }

    const { data, error } = await supabase
      .from("courts")
      .select("id,name")
      .ilike("name", `%${venueName}%`)
      .limit(10);

    if (error) {
      throw new Error(error.message);
    }

    const exactMatch =
      (data ?? []).find(
        (court) =>
          court.name && normalizeName(court.name) === normalizedVenueName,
      ) ?? data?.[0];

    if (exactMatch) {
      return {
        courtId: exactMatch.id,
        courtName: exactMatch.name ?? venueName,
      };
    }
  }

  return null;
}

async function createCourtStub(
  venueName: string,
  province: string | null,
  district: string | null,
  sportId: string,
  ownerId: string,
) {
  const supabase = getSupabaseAdminClient();
  const resolvedLocation = await resolveThailandLocationIds({
    province,
    district,
  });

  const address = [district, province].filter(Boolean).join(", ") || venueName;

  const { data: insertedCourt, error: insertCourtError } = await supabase
    .from("courts")
    .insert({
      name: venueName,
      address,
      district: resolvedLocation.districtNameTh ?? district,
      province: resolvedLocation.provinceNameTh ?? province,
      district_id: resolvedLocation.districtId,
      province_id: resolvedLocation.provinceId,
      lat: null,
      lng: null,
      is_active: false,
      created_by: ownerId,
      updated_at: new Date().toISOString(),
    })
    .select("id,name")
    .single();

  if (insertCourtError || !insertedCourt) {
    throw new Error(insertCourtError?.message ?? "Unable to create court.");
  }

  const { error: syncError } = await syncCourtSports(
    supabase,
    insertedCourt.id,
    [sportId],
  );
  if (syncError) {
    throw new Error(syncError.message);
  }

  return {
    courtId: insertedCourt.id,
    courtName: insertedCourt.name ?? venueName,
  };
}

async function resolveCourtForCandidate(
  candidate: PreviewCandidate,
  sportId: string,
  ownerId: string,
  fallbackVenue?: string | null,
): Promise<ResolvedCourt> {
  const venueNames = Array.from(
    new Set(
      [fallbackVenue, ...(candidate.venue ?? [])]
        .map((entry) => sanitizeText(entry))
        .filter(Boolean),
    ),
  );

  if (venueNames.length === 0) {
    return {
      courtId: null,
      courtName: null,
      created: false,
      warnings: ["No venue name found in preview data."],
    };
  }

  const existingCourt = await findExistingCourt(venueNames);
  if (existingCourt) {
    return {
      courtId: existingCourt.courtId,
      courtName: existingCourt.courtName,
      created: false,
      warnings: [],
    };
  }

  const { province, district } = parseProvinceDistrict(candidate.provinceDistrict);
  try {
    const createdCourt = await createCourtStub(
      venueNames[0],
      province,
      district,
      sportId,
      ownerId,
    );
    return {
      courtId: createdCourt.courtId,
      courtName: createdCourt.courtName,
      created: true,
      warnings: [
        "Created a hidden court stub because no existing court matched the venue.",
      ],
    };
  } catch (error) {
    return {
      courtId: null,
      courtName: venueNames[0],
      created: false,
      warnings: [
        error instanceof Error
          ? `Could not create court stub: ${error.message}`
          : "Could not create court stub.",
      ],
    };
  }
}

async function fetchBadmintonSportId() {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("sports")
    .select("id")
    .eq("code", "badminton")
    .single();

  if (error || !data?.id) {
    throw new Error(error?.message ?? "Badminton sport not found.");
  }

  return data.id as string;
}

async function fetchRacketThailandAdminOwner(): Promise<AdminOwnerProfile> {
  const supabase = getSupabaseAdminClient();
  const { data: usernameMatch, error: usernameError } = await supabase
    .from("profiles")
    .select("id,username,display_name,status")
    .eq("username", "racketthailand")
    .eq("status", "admin")
    .limit(1)
    .maybeSingle();

  if (usernameError) {
    throw new Error(usernameError.message);
  }

  if (usernameMatch?.id) {
    return {
      id: usernameMatch.id,
      username: usernameMatch.username,
      display_name: usernameMatch.display_name,
    };
  }

  const { data: displayNameMatch, error: displayNameError } = await supabase
    .from("profiles")
    .select("id,username,display_name,status")
    .ilike("display_name", "racketthailand")
    .eq("status", "admin")
    .limit(1)
    .maybeSingle();

  if (displayNameError) {
    throw new Error(displayNameError.message);
  }

  if (!displayNameMatch?.id) {
    throw new Error(
      'Admin profile "racketthailand" was not found. Create that admin profile first.',
    );
  }

  return {
    id: displayNameMatch.id,
    username: displayNameMatch.username,
    display_name: displayNameMatch.display_name,
  };
}

function normalizePreview(input: unknown): PreviewPayload {
  if (typeof input === "string") {
    return normalizePreview(JSON.parse(input));
  }

  if (!isRecord(input)) {
    throw new Error("Preview payload must be a JSON object.");
  }

  const candidates = Array.isArray(input.candidates)
    ? (input.candidates as PreviewCandidate[])
    : [];

  return {
    runDate: typeof input.runDate === "string" ? input.runDate.trim() : null,
    candidates,
  };
}

export async function loadLatestGroupPreviewRun(): Promise<LatestPreviewRun | null> {
  try {
    const entries = await fs.readdir(AUTOMATION_RUNS_DIR, {
      withFileTypes: true,
    });
    const runDirectories = entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort((a, b) => b.localeCompare(a));

    for (const runDate of runDirectories) {
      const previewPath = path.join(AUTOMATION_RUNS_DIR, runDate, "preview.json");
      try {
        const previewText = await fs.readFile(previewPath, "utf8");
        return {
          runDate,
          previewPath,
          previewText,
        };
      } catch {
        continue;
      }
    }

    return null;
  } catch {
    return null;
  }
}

export async function importDraftGroupsFromPreview(
  input: ImportDraftGroupsInput,
) {
  const preview = normalizePreview(input.preview);
  const candidates = preview.candidates ?? [];
  if (candidates.length === 0) {
    throw new Error("Preview does not contain any candidates.");
  }

  const selectedIndexes =
    input.selectedCandidateIndexes && input.selectedCandidateIndexes.length > 0
      ? Array.from(
          new Set(
            input.selectedCandidateIndexes.filter(
              (index) =>
                Number.isInteger(index) &&
                index >= 0 &&
                index < candidates.length,
            ),
          ),
        )
      : candidates.map((_, index) => index);

  if (selectedIndexes.length === 0) {
    throw new Error("No valid candidates were selected.");
  }

  const sportId = await fetchBadmintonSportId();
  const ownerProfile = await fetchRacketThailandAdminOwner();
  const ownerId = ownerProfile.id;
  const resolvedRunDate = input.runDate ?? preview.runDate;
  const imageDirectory = await resolveRunImagesDirectory(resolvedRunDate);
  const supabase = getSupabaseAdminClient();
  const imported: ImportedGroupResult[] = [];
  const skipped: Array<{
    candidateIndex: number;
    name: string;
    existingGroupId: string;
    reason: string;
  }> = [];

  const { data: existingGroups, error: existingGroupsError } = await supabase
    .from("groups")
    .select("id,sport_id,name,description,phone,line_id,website_url,status")
    .eq("sport_id", sportId)
    .limit(5000);

  if (existingGroupsError) {
    throw new Error(existingGroupsError.message);
  }

  const knownGroups = [...(existingGroups ?? [])];
  const sessionsByGroupId = new Map<string, ExistingGroupSessionRow[]>();
  const existingGroupIds = knownGroups.map((group) => group.id);

  if (existingGroupIds.length > 0) {
    const { data: existingSessions, error: existingSessionsError } = await supabase
      .from("group_sessions")
      .select("group_id,court_id,day,start_time,end_time,courts(name)")
      .in("group_id", existingGroupIds);

    if (existingSessionsError) {
      throw new Error(existingSessionsError.message);
    }

    for (const session of (existingSessions ?? []) as ExistingGroupSessionRow[]) {
      const groupSessions = sessionsByGroupId.get(session.group_id) ?? [];
      groupSessions.push(session);
      sessionsByGroupId.set(session.group_id, groupSessions);
    }
  }

  for (const candidateIndex of selectedIndexes) {
    const candidate = candidates[candidateIndex];
    const rawPostMetadata = await loadRawPostMetadata(
      resolvedRunDate,
      candidate.sourcePostUrl,
    );
    const rawPostDescription = rawPostMetadata?.description ?? null;
    const extractedVenue = extractVenueFromDescription(rawPostDescription);
    const recoveredName = normalizeRecoveredGroupName(rawPostMetadata?.title);
    const name = looksCorruptedText(candidate.groupName)
      ? recoveredName || `Imported group ${candidateIndex + 1}`
      : sanitizeText(candidate.groupName) || recoveredName || `Imported group ${candidateIndex + 1}`;
    const description = pickDescription(candidate, rawPostDescription);
    const contact = parseContactDetails(candidate, rawPostDescription);

    if (looksLikeHeadlineInsteadOfGroupName(name)) {
      skipped.push({
        candidateIndex,
        name,
        existingGroupId: "",
        reason:
          "Skipped because the detected group name looks like a post headline or promotional sentence, not a stable group name.",
      });
      continue;
    }

    if (
      isTruncatedDescription(rawPostDescription) ||
      isTruncatedDescription(description)
    ) {
      skipped.push({
        candidateIndex,
        name,
        existingGroupId: "",
        reason:
          "Skipped because the available public post description is truncated and missing details.",
      });
      continue;
    }

    if (!hasSupportedContactMethod(candidate, contact)) {
      skipped.push({
        candidateIndex,
        name,
        existingGroupId: "",
        reason:
          "Skipped because the post does not provide any usable public contact method.",
      });
      continue;
    }

    const resolvedCourt = await resolveCourtForCandidate(
      candidate,
      sportId,
      ownerId,
      extractedVenue,
    );

    if (!resolvedCourt.courtId) {
      skipped.push({
        candidateIndex,
        name,
        existingGroupId: "",
        reason:
          "Skipped because the venue could not be matched to an existing court or created as a new hidden court.",
      });
      continue;
    }

    const scheduleSources = [
      ...(candidate.schedule ?? []),
      ...((rawPostDescription ?? "").split(/\n+/)),
    ];
    const sessions = parseScheduleSessions(scheduleSources, resolvedCourt.courtId);

    const duplicateGroup = findDuplicateGroup(knownGroups, sessionsByGroupId, {
      sportId,
      name,
      description,
      phone: contact.phone,
      lineId: contact.lineId,
      websiteUrl: contact.websiteUrl,
      sessions,
      venueNames: [resolvedCourt.courtName, extractedVenue, ...(candidate.venue ?? [])]
        .map((value) => sanitizeText(value))
        .filter(Boolean),
    });

    if (duplicateGroup) {
      skipped.push({
        candidateIndex,
        name,
        existingGroupId: duplicateGroup.id,
        reason: `Skipped because an existing group already matches this automation item (${duplicateGroup.id}).`,
      });
      continue;
    }

    const { data: insertedGroup, error: insertGroupError } = await supabase
      .from("groups")
      .insert({
        sport_id: sportId,
        owner_id: ownerId,
        name,
        description,
        play_format: "double",
        allow_walk_in: true,
        phone: contact.phone,
        line_id: contact.lineId,
        website_url: contact.websiteUrl,
        status: "draft",
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (insertGroupError || !insertedGroup) {
      throw new Error(
        `Failed to import "${name}": ${insertGroupError?.message ?? "Unknown error"}`,
      );
    }

    if (sessions.length > 0) {
      const { error: sessionError } = await supabase
        .from("group_sessions")
        .insert(
          sessions.map((session) => ({
            group_id: insertedGroup.id,
            court_id: session.courtId,
            day: session.day,
            start_time: session.start,
            end_time: session.end,
          })),
        );

      if (sessionError) {
        throw new Error(
          `Imported "${name}" but failed to save sessions: ${sessionError.message}`,
        );
      }
    }

    await syncCourtGroupLinks(
      supabase,
      insertedGroup.id,
      [resolvedCourt.courtId],
      ownerId,
    );

    const uploadedImages = await uploadGroupImages(
      insertedGroup.id,
      imageDirectory,
      candidate.imageFilenames,
    );

    imported.push({
      candidateIndex,
      name,
      groupId: insertedGroup.id,
      courtId: resolvedCourt.courtId,
      courtName: resolvedCourt.courtName,
      imageCount: uploadedImages.count,
      warnings: [...resolvedCourt.warnings, ...uploadedImages.warnings],
    });

    knownGroups.push({
      id: insertedGroup.id,
      sport_id: sportId,
      name,
      description,
      phone: contact.phone,
      line_id: contact.lineId,
      website_url: contact.websiteUrl,
      status: "draft",
    });

    sessionsByGroupId.set(
      insertedGroup.id,
      sessions.map((session) => ({
        group_id: insertedGroup.id,
        court_id: session.courtId,
        day: session.day,
        start_time: session.start,
        end_time: session.end,
        courts: {
          name: resolvedCourt.courtName,
        },
      })),
    );
  }

  return {
    importedCount: imported.length,
    imported,
    skippedCount: skipped.length,
    skipped,
    runDate: input.runDate ?? preview.runDate ?? null,
    ownerProfile: {
      id: ownerProfile.id,
      username: ownerProfile.username,
      displayName: ownerProfile.display_name,
    },
  };
}
