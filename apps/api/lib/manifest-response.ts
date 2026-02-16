/**
 * Response helpers for generated command handlers.
 *
 * Wraps the kitchen-ops api-response utilities into the simple
 * `manifestSuccessResponse` / `manifestErrorResponse` interface
 * that the generated handlers call.
 */

import { NextResponse } from "next/server";

export function manifestSuccessResponse(data: unknown, status = 200): Response {
  return NextResponse.json(
    {
      success: true,
      ...(typeof data === "object" && data !== null ? data : { data }),
    },
    { status }
  );
}

export function manifestErrorResponse(
  message: string,
  status: number
): Response {
  return NextResponse.json({ success: false, message }, { status });
}
