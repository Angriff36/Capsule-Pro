"use server";

import type {
  ConflictDetectionRequest,
  ConflictDetectionResult,
} from "../conflict-types";

export type {
  Conflict,
  ConflictDetectionRequest,
  ConflictDetectionResult,
} from "../conflict-types";

export async function detectConflicts(
  request: ConflictDetectionRequest
): Promise<ConflictDetectionResult> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:2223";

  const response = await fetch(`${baseUrl}/conflicts/detect`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`Failed to detect conflicts: ${response.statusText}`);
  }

  return (await response.json()) as ConflictDetectionResult;
}
