import { NextResponse } from "next/server";
import { detectConflicts } from "./service";
import type { ConflictDetectionRequest } from "./types";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ConflictDetectionRequest;

    const result = await detectConflicts(body);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Conflict detection failed:", error);

    return NextResponse.json(
      {
        error: "Failed to detect conflicts",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
