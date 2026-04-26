import { getSupabaseAdminClient } from "@/lib/supabase-admin";

const COURT_SUBMISSION_SETTING_KEY = "allow_public_court_publish";

type CourtSubmissionSettingRow = {
  key: string;
  enabled: boolean | null;
};

function isMissingSettingsTableError(error: { code?: string; message?: string }) {
  if (error.code === "42P01") {
    return true;
  }
  const message = error.message?.toLowerCase() ?? "";
  return message.includes("platform_settings");
}

export async function getAllowPublicCourtPublish() {
  const adminClient = getSupabaseAdminClient();
  const { data, error } = await adminClient
    .from("platform_settings")
    .select("key,enabled")
    .eq("key", COURT_SUBMISSION_SETTING_KEY)
    .maybeSingle<CourtSubmissionSettingRow>();

  if (error) {
    if (isMissingSettingsTableError(error)) {
      return true;
    }
    console.error("Failed to fetch court submission policy", error);
    return true;
  }

  return typeof data?.enabled === "boolean" ? data.enabled : true;
}

export async function setAllowPublicCourtPublish(
  enabled: boolean,
  updatedBy: string | null,
) {
  const adminClient = getSupabaseAdminClient();
  const { error } = await adminClient
    .from("platform_settings")
    .upsert(
      {
        key: COURT_SUBMISSION_SETTING_KEY,
        enabled,
        updated_by: updatedBy,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" },
    );

  if (error) {
    if (isMissingSettingsTableError(error)) {
      return {
        ok: false as const,
        error:
          "Missing table `platform_settings`. Run the SQL setup in docs before changing this toggle.",
      };
    }
    return {
      ok: false as const,
      error: error.message,
    };
  }

  return { ok: true as const };
}

