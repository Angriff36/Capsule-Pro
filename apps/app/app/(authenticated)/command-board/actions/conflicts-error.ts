import type { ConflictApiError } from "../conflict-types";

export interface LegacyConflictErrorPayload {
  message?: string;
  error?: string;
}

export type ConflictErrorPayload =
  | ConflictApiError
  | LegacyConflictErrorPayload;

/**
 * Check if the payload is a typed API error
 */
export function isTypedApiError(
  payload: ConflictErrorPayload
): payload is ConflictApiError {
  return "code" in payload && typeof payload.code === "string";
}

/**
 * Extract a user-friendly error message from conflict API error payloads
 */
export function pickConflictErrorDetail(payload: ConflictErrorPayload): string {
  // Handle typed API errors with guidance
  if (isTypedApiError(payload)) {
    if (payload.guidance) {
      return `${payload.message} ${payload.guidance}`;
    }
    return payload.message;
  }

  // Handle legacy error format
  const error = payload.error?.trim();
  if (error) {
    return error;
  }

  const message = payload.message?.trim();
  if (message) {
    return message;
  }

  return "";
}
