/**
 * @module Pagination
 * @intent Clamp client-supplied `limit` / `offset` query parameters into a
 *         safe range before they reach Prisma / `$queryRaw` so a hostile or
 *         buggy client cannot request the entire table in one round trip.
 * @domain Shared API helpers
 *
 * Why this exists:
 *   List endpoints that pass user input straight into `take` / `skip` (or
 *   `LIMIT` / `OFFSET`) inherit the client's worst case. A request with
 *   `limit=1000000` against a multi-tenant table with millions of rows
 *   degenerates into a memory blow-up (server) and a JSON parse stall
 *   (client). Negative or non-numeric input is also a footgun — Prisma
 *   accepts `take: NaN` and silently returns zero rows, masking client bugs.
 *
 *   These two clamps centralize the policy:
 *     - Missing / non-finite / non-positive `limit` → DEFAULT_LIMIT.
 *     - `limit` greater than MAX_LIMIT → MAX_LIMIT.
 *     - Missing / non-finite / negative `offset` → 0.
 *
 *   The constants are intentionally exported so per-route overrides remain
 *   possible (a heat-map endpoint may legitimately need more rows), but the
 *   default policy stays in a single auditable place.
 */

/**
 * Default page size when the client does not supply `limit`. Sized so a
 * single page renders quickly on a typical table view without dominating
 * the wire.
 */
export const DEFAULT_LIMIT = 50;

/**
 * Hard ceiling on `limit`. Any client request above this is silently
 * clamped down. Tuned to keep the worst-case payload under a few hundred KB
 * for typical row shapes.
 */
export const MAX_LIMIT = 200;

/**
 * Parse and clamp a client-supplied `limit` query string.
 *
 * @example
 *   clampLimit("100")          // => 100
 *   clampLimit("9999")         // => 200  (MAX_LIMIT)
 *   clampLimit(null)           // => 50   (DEFAULT_LIMIT)
 *   clampLimit("not a number") // => 50   (DEFAULT_LIMIT)
 *   clampLimit("-1")           // => 50   (DEFAULT_LIMIT)
 *   clampLimit("0")            // => 50   (DEFAULT_LIMIT)
 */
export function clampLimit(raw: string | null): number {
  const parsed = Number.parseInt(raw ?? "", 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_LIMIT;
  return Math.min(parsed, MAX_LIMIT);
}

/**
 * Parse and clamp a client-supplied `offset` query string.
 *
 * @example
 *   clampOffset("100")          // => 100
 *   clampOffset(null)           // => 0
 *   clampOffset("not a number") // => 0
 *   clampOffset("-50")          // => 0
 */
export function clampOffset(raw: string | null): number {
  const parsed = Number.parseInt(raw ?? "", 10);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return parsed;
}
