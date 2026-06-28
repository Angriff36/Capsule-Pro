import { invariant } from "@/app/lib/invariant";

/**
 * Shared plain-record guards. IMPORT THESE — do not redefine local
 * `isRecord` / `expectRecord` / `assertRecord` helpers. The CI gate
 * `pnpm check:no-local-isrecord` (scripts/check-no-local-isrecord.mjs)
 * fails on any new local definition outside this file.
 *
 * "Plain record" = a non-null object that is NOT an array. Arrays are
 * intentionally excluded: a `Record<string, unknown>` is a string-keyed
 * dictionary, and treating `[]` as one is a latent bug (it previously
 * slipped past the looser `typeof === "object" && !== null` check).
 */

/** True for a plain object (non-null, non-array). Narrows to `Record<string, unknown>`. */
export function isPlainRecord(
  value: unknown
): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Asserts `value` is a plain record via the app's `invariant` (throws
 * `InvariantError` with `${path} must be an object` otherwise) and returns
 * the narrowed record. Mirrors the former local `expectRecord(value, path)`.
 */
export function assertRecord(
  value: unknown,
  path: string
): Record<string, unknown> {
  invariant(isPlainRecord(value), `${path} must be an object`);
  return value;
}
