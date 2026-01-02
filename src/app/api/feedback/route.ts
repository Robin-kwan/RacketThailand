import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

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

  const { error } = await supabase.from("feedback").insert({
    reporter_id: user.id,
    subject: subject || "Landing feedback",
    message,
    type,
    status: "open",
    priority: "normal",
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
