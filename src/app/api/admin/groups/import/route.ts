import { NextResponse } from "next/server";
import { importDraftGroupsFromPreview } from "@/server/adminGroupImport";
import { requireAdminApiAccess } from "@/server/adminApi";

type ImportRequestPayload = {
  preview?: unknown;
  runDate?: string | null;
  sportCode?: string | null;
  selectedCandidateIndexes?: number[];
};

export async function POST(request: Request) {
  const { error } = await requireAdminApiAccess();
  if (error === "UNAUTHORIZED") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (error === "FORBIDDEN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let payload: ImportRequestPayload;
  try {
    payload = (await request.json()) as ImportRequestPayload;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload." },
      { status: 400 },
    );
  }

  if (!payload.preview) {
    return NextResponse.json(
      { error: "Preview payload is required." },
      { status: 400 },
    );
  }

  try {
    const result = await importDraftGroupsFromPreview({
      preview: payload.preview,
      runDate:
        typeof payload.runDate === "string" ? payload.runDate.trim() : null,
      sportCode:
        typeof payload.sportCode === "string" ? payload.sportCode.trim() : null,
      selectedCandidateIndexes: Array.isArray(payload.selectedCandidateIndexes)
        ? payload.selectedCandidateIndexes
        : undefined,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to import preview groups.",
      },
      { status: 500 },
    );
  }
}
