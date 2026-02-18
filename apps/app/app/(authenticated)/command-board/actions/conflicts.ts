"use server";

import { headers } from "next/headers";
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
  const requestHeaders = await headers();
  const cookie = requestHeaders.get("cookie");

  const response = await fetch(`${baseUrl}/conflicts/detect`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const fallbackMessage = `Failed to detect conflicts: ${response.status} ${response.statusText}`;
    try {
      const payload = (await response.json()) as {
        message?: string;
        error?: string;
      };
      const detail = payload.message ?? payload.error;
      if (response.status === 401 || response.status === 403) {
        throw new Error("Unauthorized");
      }
      throw new Error(
        detail ? `Unable to fetch conflicts: ${detail}` : fallbackMessage
      );
    } catch {
      if (response.status === 401 || response.status === 403) {
        throw new Error("Unauthorized");
      }
      throw new Error(fallbackMessage);
    }
  }

  return (await response.json()) as ConflictDetectionResult;
}
