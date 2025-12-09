import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured for the verification status API.",
  );
}

const adminClient = createClient(supabaseUrl, serviceRoleKey);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json(
      { error: "Missing userId parameter." },
      { status: 400 },
    );
  }

  try {
    const { data, error } = await adminClient.auth.admin.getUserById(userId);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status ?? 500 },
      );
    }

    const verified = Boolean(data.user?.email_confirmed_at);

    return NextResponse.json({
      verified,
      email: data.user?.email ?? null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
