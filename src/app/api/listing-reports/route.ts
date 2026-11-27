import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { ensureUserProfile } from "@/server/profile";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VALID_CATEGORIES = new Set([
  "incorrect",
  "ownership_claim",
  "other",
]);

type ListingReportPayload = {
  listingType?: unknown;
  listingId?: unknown;
  category?: unknown;
  message?: unknown;
  claimContact?: unknown;
  proofUrl?: unknown;
};

function cleanString(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function isValidHttpUrl(value: string) {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user || user.is_anonymous) {
    return NextResponse.json(
      { error: "Not authenticated", code: "NOT_AUTHENTICATED" },
      { status: 401 },
    );
  }

  let payload: ListingReportPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload", code: "INVALID_PAYLOAD" },
      { status: 400 },
    );
  }

  const listingType = cleanString(payload.listingType, 10);
  const listingId = cleanString(payload.listingId, 36);
  const category = cleanString(payload.category, 40);
  const message = cleanString(payload.message, 3000);
  const claimContact = cleanString(payload.claimContact, 300);
  const proofUrl = cleanString(payload.proofUrl, 1000);

  if (
    (listingType !== "court" && listingType !== "group") ||
    !UUID_PATTERN.test(listingId) ||
    !VALID_CATEGORIES.has(category) ||
    !message
  ) {
    return NextResponse.json(
      { error: "Invalid report details", code: "INVALID_PAYLOAD" },
      { status: 400 },
    );
  }
  if (category === "ownership_claim" && !claimContact) {
    return NextResponse.json(
      { error: "Verification contact is required", code: "CONTACT_REQUIRED" },
      { status: 400 },
    );
  }
  if (!isValidHttpUrl(proofUrl)) {
    return NextResponse.json(
      { error: "Proof URL must be a valid web address", code: "INVALID_URL" },
      { status: 400 },
    );
  }

  const adminSupabase = getSupabaseAdminClient();
  const { error: profileError } = await ensureUserProfile(adminSupabase, user);
  if (profileError) {
    return NextResponse.json(
      { error: profileError.message, code: "PROFILE_ERROR" },
      { status: 500 },
    );
  }

  const listingQuery =
    listingType === "court"
      ? adminSupabase
          .from("courts")
          .select("id,name,created_by")
          .eq("id", listingId)
          .maybeSingle()
      : adminSupabase
          .from("groups")
          .select("id,name,owner_id,sport_id")
          .eq("id", listingId)
          .maybeSingle();
  const { data: listing, error: listingError } = await listingQuery;

  if (listingError || !listing) {
    return NextResponse.json(
      { error: "Listing not found", code: "LISTING_NOT_FOUND" },
      { status: 404 },
    );
  }

  const currentOwnerId =
    listingType === "court"
      ? (listing as { created_by: string | null }).created_by
      : (listing as { owner_id: string | null }).owner_id;
  if (category === "ownership_claim" && currentOwnerId === user.id) {
    return NextResponse.json(
      { error: "You already manage this listing", code: "ALREADY_OWNER" },
      { status: 409 },
    );
  }

  const reportType =
    category === "ownership_claim" ? "ownership_claim" : `listing_${category}`;

  if (category === "ownership_claim") {
    let duplicateQuery = adminSupabase
      .from("feedback")
      .select("id")
      .eq("reporter_id", user.id)
      .eq("type", reportType)
      .in("status", ["open", "in_review"])
      .limit(1);
    duplicateQuery =
      listingType === "court"
        ? duplicateQuery.eq("court_id", listingId)
        : duplicateQuery.eq("group_id", listingId);
    const { data: duplicate, error: duplicateError } =
      await duplicateQuery.maybeSingle();
    if (duplicateError) {
      return NextResponse.json(
        {
          error: "Unable to verify existing ownership claims",
          code: "DUPLICATE_CHECK_FAILED",
        },
        { status: 500 },
      );
    }
    if (duplicate) {
      return NextResponse.json(
        {
          error: "An ownership claim is already under review",
          code: "DUPLICATE_CLAIM",
        },
        { status: 409 },
      );
    }
  }

  const listingName =
    cleanString((listing as { name: string | null }).name, 120) ||
    (listingType === "court" ? "Unnamed court" : "Unnamed group");
  const categoryLabel = {
    incorrect: "Incorrect information",
    ownership_claim: "Ownership claim",
    other: "Other listing issue",
  }[category];
  const formattedMessage = [
    message,
    category === "ownership_claim"
      ? `Verification contact: ${claimContact}`
      : null,
    category === "ownership_claim" && proofUrl
      ? `Evidence URL: ${proofUrl}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  const { data: inserted, error: insertError } = await adminSupabase
    .from("feedback")
    .insert({
      reporter_id: user.id,
      court_id: listingType === "court" ? listingId : null,
      group_id: listingType === "group" ? listingId : null,
      sport_id:
        listingType === "group"
          ? (listing as { sport_id: string | null }).sport_id
          : null,
      type: reportType,
      subject: `${categoryLabel}: ${listingName}`.slice(0, 120),
      message: formattedMessage,
      status: "open",
      priority: category === "ownership_claim" ? "high" : "normal",
      checked: false,
    })
    .select("id,subject")
    .single();

  if (insertError || !inserted) {
    return NextResponse.json(
      {
        error: insertError?.message ?? "Unable to submit report",
        code: "INSERT_FAILED",
      },
      { status: 500 },
    );
  }

  const { data: adminProfiles } = await adminSupabase
    .from("profiles")
    .select("id")
    .eq("status", "admin");
  if (adminProfiles?.length) {
    const reporterName =
      cleanString(user.user_metadata?.full_name, 100) ||
      cleanString(user.user_metadata?.name, 100) ||
      user.email ||
      "Member";
    const notifications = adminProfiles.map((admin) => ({
      recipient_id: admin.id,
      type: "listing-report-submitted",
      message: `${reporterName}: ${inserted.subject}`,
      metadata: {
        feedbackId: inserted.id,
        listingType,
        listingId,
        category,
        reporterId: user.id,
      },
    }));
    await adminSupabase.from("notifications").insert(notifications);
  }

  return NextResponse.json({ ok: true, reportId: inserted.id });
}
