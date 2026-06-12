/**
 * HTTP-level idempotency helper for non-manifest REST handlers.
 *
 * WHY THIS EXISTS
 * ---------------
 * The Manifest runtime already supports per-command idempotency via
 * `PrismaIdempotencyStore` (see `@repo/manifest-runtime/prisma-idempotency-store`),
 * keyed by `idempotencyKey` on `runCommand(...)`. That covers any route that
 * dispatches through `manifestCommandHandler`.
 *
 * However, several financially-sensitive routes still write to Prisma directly
 * (e.g. `POST /api/accounting/payments` creates a Payment row without going
 * through a manifest command). For those routes, a network retry that re-sends
 * the same request body will create a SECOND row — a duplicate charge once a
 * real Stripe charge call lands inside the handler.
 *
 * This module provides the thin `Idempotency-Key` header → cached-response
 * lookup that Stripe-style APIs expose, backed by the existing
 * `manifest_idempotency` table (so we don't add a second cache infrastructure
 * for the same job). Tenant scoping is preserved by composing the cache key as
 * `http:<scope>:<key>` and reusing the table's `(tenant_id, key)` PK.
 *
 * SECURITY INVARIANTS
 * -------------------
 * - The cache is keyed by `(tenantId, scope, key)`. A key sent by tenant A
 *   cannot collide with the same key sent by tenant B, and a key registered
 *   under one route's scope cannot replay against a different route.
 * - Only successful (2xx) responses are cached. Validation errors (4xx) and
 *   server errors (5xx) are NOT cached, so the client may correct the request
 *   and retry under the same key without being permanently locked into the
 *   failure.
 * - Cache lookup happens AFTER tenant resolution but BEFORE expensive work
 *   (body parsing, DB writes, gateway calls). A confirmed cache hit short-
 *   circuits straight to the cached response — that is the entire point.
 * - Lookup and store both fail OPEN: a Prisma outage on the cache table must
 *   not block a payment write. The worst-case degradation is a duplicated
 *   charge on retry, which is exactly the same risk as not having idempotency
 *   at all — so we never make availability worse by adding it.
 */

import { database, type Prisma } from "@repo/database";

/** Default TTL for cached HTTP responses: 24 hours (matches Stripe). */
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

/** Maximum byte length of an Idempotency-Key header value. */
const MAX_KEY_LENGTH = 255;

/**
 * Allowed characters in an Idempotency-Key header.
 * UUIDs, ULIDs, and Stripe-style `idemp_xxxx` keys all match.
 */
const KEY_FORMAT = /^[A-Za-z0-9_\-:.]{1,255}$/;

/**
 * Thrown when the caller supplied an `Idempotency-Key` header that we cannot
 * accept (empty, too long, invalid characters). The route handler should
 * convert this to a 400 response.
 */
export class IdempotencyKeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IdempotencyKeyError";
  }
}

/** A previously-served HTTP response, replayable on key reuse. */
export interface CachedHttpResponse {
  body: unknown;
  status: number;
}

/**
 * Extract and validate the `Idempotency-Key` header (or its `X-` alias) from
 * the incoming request.
 *
 * Returns `undefined` if the caller did NOT supply a key — idempotency is opt-
 * in via the header, so absence means "no caching, just process the request".
 *
 * Throws `IdempotencyKeyError` if the header was supplied but is malformed.
 */
export function extractIdempotencyKey(request: Request): string | undefined {
  const raw =
    request.headers.get("Idempotency-Key") ??
    request.headers.get("X-Idempotency-Key");
  if (raw === null) {
    return;
  }
  const key = raw.trim();
  if (key.length === 0) {
    throw new IdempotencyKeyError("Idempotency-Key header must not be empty");
  }
  if (key.length > MAX_KEY_LENGTH) {
    throw new IdempotencyKeyError(
      `Idempotency-Key header exceeds ${MAX_KEY_LENGTH} characters`
    );
  }
  if (!KEY_FORMAT.test(key)) {
    throw new IdempotencyKeyError(
      "Idempotency-Key header contains invalid characters; allowed: A-Z a-z 0-9 _ - : ."
    );
  }
  return key;
}

/**
 * Compose the storage key. The scope prefix prevents the same client-supplied
 * key from accidentally replaying across two unrelated routes.
 */
function compositeKey(scope: string, key: string): string {
  return `http:${scope}:${key}`;
}

/**
 * Look up a previously-cached response for `(tenantId, scope, key)`.
 *
 * Returns `null` if no entry exists, the entry is expired, or the lookup
 * itself fails (fail-open).
 */
export async function lookupIdempotentResponse(
  tenantId: string,
  scope: string,
  key: string
): Promise<CachedHttpResponse | null> {
  try {
    const entry = await database.manifestIdempotency.findUnique({
      where: { tenantId_key: { tenantId, key: compositeKey(scope, key) } },
    });
    if (!entry) {
      return null;
    }
    if (entry.expiresAt < new Date()) {
      return null;
    }
    const result = entry.result as
      | { status?: unknown; body?: unknown }
      | null
      | undefined;
    if (!result || typeof result.status !== "number") {
      return null;
    }
    return { status: result.status, body: result.body };
  } catch (error) {
    console.error(
      `[http-idempotency] lookup failed for tenant=${tenantId} scope=${scope}:`,
      error
    );
    return null;
  }
}

/**
 * Persist `response` against `(tenantId, scope, key)` for `ttlMs` milliseconds.
 *
 * Uses `upsert` so concurrent retries with the same key converge on a single
 * cached row rather than racing each other.
 *
 * Failures are swallowed — see SECURITY INVARIANTS at the top of the file.
 */
export async function storeIdempotentResponse(
  tenantId: string,
  scope: string,
  key: string,
  response: CachedHttpResponse,
  ttlMs: number = DEFAULT_TTL_MS
): Promise<void> {
  try {
    const expiresAt = new Date(Date.now() + ttlMs);
    const composite = compositeKey(scope, key);
    await database.manifestIdempotency.upsert({
      where: { tenantId_key: { tenantId, key: composite } },
      create: {
        tenantId,
        key: composite,
        result: response as unknown as Prisma.InputJsonValue,
        expiresAt,
      },
      update: {
        result: response as unknown as Prisma.InputJsonValue,
        expiresAt,
      },
    });
  } catch (error) {
    console.error(
      `[http-idempotency] store failed for tenant=${tenantId} scope=${scope}:`,
      error
    );
  }
}
