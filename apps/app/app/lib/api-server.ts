/**
 * Server-side API fetch — for server actions and RSCs calling apps/api.
 *
 * Unlike `apiFetch` (client), a server-side fetch carries no browser cookies,
 * so this helper forwards the incoming request's Clerk session cookies to
 * apps/api, which resolves the same user/tenant via its own auth.
 */

import { cookies } from "next/headers";
import { apiUrl } from "./api";

/** Prevent server actions from hanging indefinitely when apps/api is wedged. */
const API_SERVER_TIMEOUT_MS = 60_000;

function mergeAbortSignals(
  userSignal: AbortSignal | null | undefined,
  timeoutMs: number
): AbortSignal {
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  if (!userSignal) {
    return timeoutSignal;
  }
  return AbortSignal.any([userSignal, timeoutSignal]);
}

export async function apiFetchServer(
  path: string,
  init?: RequestInit
): Promise<Response> {
  const cookieHeader = (await cookies()).toString();

  return fetch(apiUrl(path), {
    cache: "no-store",
    ...init,
    signal: mergeAbortSignals(init?.signal, API_SERVER_TIMEOUT_MS),
    headers: {
      ...init?.headers,
      ...(cookieHeader ? { cookie: cookieHeader } : {}),
    },
  });
}

/** POST JSON to apps/api with session-cookie forwarding. */
export function apiPostJsonServer(
  path: string,
  body: unknown
): Promise<Response> {
  return apiFetchServer(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}
