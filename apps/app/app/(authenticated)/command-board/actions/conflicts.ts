"use server";

import { headers } from "next/headers";
import type {
  ConflictDetectionRequest,
  ConflictDetectionResult,
} from "../conflict-types";
import {
  type ConflictErrorPayload,
  pickConflictErrorDetail,
} from "./conflicts-error";

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

  const response = await fetch(`${baseUrl}/api/conflicts/detect`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    cache: "no-store",
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const fallbackMessage = `Failed to detect conflicts: ${response.status} ${response.statusText}`;
    let detail: string | undefined;

    try {
      const payload = (await response.json()) as ConflictErrorPayload;
      const extracted = pickConflictErrorDetail(payload);
      detail = extracted || undefined;
    } catch {
      // Ignore JSON parse errors and fall back to status-based message.
    }

    if (response.status === 401 || response.status === 403) {
      throw new Error("Unauthorized");
    }

    throw new Error(
      detail ? `Unable to fetch conflicts: ${detail}` : fallbackMessage
    );
  }

  return (await response.json()) as ConflictDetectionResult;
}
