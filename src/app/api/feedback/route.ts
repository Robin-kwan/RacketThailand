import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { ensureUserProfile } from "@/server/profile";

type FeedbackPayload = {
  subject?: string;
  message?: string;
  type?: string;
};

function sanitizeInput(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const adminSupabase = getSupabaseAdminClient();
  const { error: profileError } = await ensureUserProfile(adminSupabase, user);
  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  let payload: FeedbackPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 },
    );
  }

  const subject = sanitizeInput(payload.subject).slice(0, 120);
  const message = sanitizeInput(payload.message);
  const type = sanitizeInput(payload.type) || "general";

  if (!message) {
    return NextResponse.json(
      { error: "Message is required" },
      { status: 400 },
    );
  }

  const normalizedSubject = subject || "Landing feedback";
  const { data: inserted, error } = await supabase
    .from("feedback")
    .insert({
      reporter_id: user.id,
      subject: normalizedSubject,
      message,
      type,
      status: "open",
      priority: "normal",
      checked: false,
    })
    .select("id,subject")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: adminProfiles } = await supabase
    .from("profiles")
    .select("id")
    .eq("status", "admin");

  if (adminProfiles && adminProfiles.length > 0 && inserted?.id) {
    const reporterName =
      user.user_metadata?.full_name ??
      user.user_metadata?.fullName ??
      user.email ??
      "Member";
    const notificationMessage = `${reporterName} sent feedback: ${normalizedSubject}`;
    const notificationPayload = adminProfiles.map((admin) => ({
        recipient_id: admin.id,
        type: "feedback-submitted",
        message: notificationMessage,
        metadata: {
          feedbackId: inserted.id,
          subject: normalizedSubject,
          reporterEmail: user.email ?? null,
          type,
        },
    }));
    if (notificationPayload.length > 0) {
      try {
        await adminSupabase.from("notifications").insert(notificationPayload);
      } catch {
        // Ignore notification failures so feedback submission still succeeds
      }
    }
  }

  return NextResponse.json({ ok: true });
}
