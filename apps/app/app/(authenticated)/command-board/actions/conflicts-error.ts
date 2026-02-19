export interface ConflictErrorPayload {
  message?: string;
  error?: string;
}

export function pickConflictErrorDetail(payload: ConflictErrorPayload): string {
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
