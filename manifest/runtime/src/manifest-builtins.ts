/**
 * Project-defined custom builtin expression functions.
 *
 * These are injected into the runtime via `RuntimeOptions.customBuiltins` (see
 * `manifest-runtime-factory.ts`). They become usable inside guard, constraint,
 * policy, and computed-property expressions, exactly like core builtins. Core
 * builtins always win on name collision (enforced by the engine), so every
 * name registered here MUST stay outside the runtime's RESERVED_BUILTIN_NAMES
 * set (verified against `@angriff36/manifest` docs/spec/builtins.md — none of
 * the five below collide).
 *
 * Contract (per `@angriff36/manifest` docs/spec/builtins.md, plugin-api): each
 * custom builtin must be **pure / deterministic** — same inputs always produce
 * the same output, with no I/O, clock, or randomness. Datetimes are
 * represented as epoch-millisecond numbers throughout the manifest layer, so
 * the date helpers below are plain arithmetic over numbers (no `Date`, no
 * timezone).
 *
 * Why these exist: they replace hand-written, repeated, magic-number-laden
 * expressions across the manifest sources with named, intention-revealing
 * calls. Each replacement must be exactly behavior-preserving:
 *   - `(a - b) / 86400000`                  -> daysBetween(b, a)
 *   - `(a - b) / 3600000`                   -> hoursBetween(b, a)
 *   - `t + 30 * 86400000`                   -> addDays(t, 30)
 *   - `whole > 0 ? p / whole * 100 : 0`     -> percent(p, whole)
 *   - `f contains "a" or f contains "b"`    -> containsAny(f, ["a", "b"])
 */

export type CustomBuiltin = (...args: unknown[]) => unknown;

const MS_PER_DAY = 86_400_000;
const MS_PER_HOUR = 3_600_000;

/**
 * Coerce an evaluated argument to a finite number, or NaN. Only an actual
 * finite `number` is accepted — `null`/`undefined`/strings/objects all become
 * NaN. This makes the helpers fail closed (a missing value yields NaN, and
 * every comparison against NaN is false) rather than silently coercing via
 * `Number(...)` where `Number(null) === 0` would turn a missing date into the
 * epoch. The expressions these helpers replace keep their `!= null` guards, so
 * a valid (non-null) numeric field always produces an identical result.
 */
function toNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : Number.NaN;
}

/** Whole + fractional days from `from` to `to`: `(to - from) / 86_400_000`. */
export function daysBetween(...args: unknown[]): number {
  return (toNumber(args[1]) - toNumber(args[0])) / MS_PER_DAY;
}

/** Whole + fractional hours from `from` to `to`: `(to - from) / 3_600_000`. */
export function hoursBetween(...args: unknown[]): number {
  return (toNumber(args[1]) - toNumber(args[0])) / MS_PER_HOUR;
}

/** Epoch-millis timestamp `days` days after `timestamp`. */
export function addDays(...args: unknown[]): number {
  return toNumber(args[0]) + toNumber(args[1]) * MS_PER_DAY;
}

/** `(part / whole) * 100`, or 0 when `whole` is not positive (no divide-by-zero). */
export function percent(...args: unknown[]): number {
  const part = toNumber(args[0]);
  const whole = toNumber(args[1]);
  return whole > 0 ? (part / whole) * 100 : 0;
}

/** True when `haystack` (array or string) contains at least one of `needles`. */
export function containsAny(...args: unknown[]): boolean {
  const haystack = args[0];
  const needles = args[1];
  if (!Array.isArray(needles)) {
    return false;
  }
  if (Array.isArray(haystack)) {
    return needles.some((needle) => haystack.includes(needle));
  }
  if (typeof haystack === "string") {
    return needles.some(
      (needle) => typeof needle === "string" && haystack.includes(needle)
    );
  }
  return false;
}

/**
 * Remove a tag from a comma-separated tag string.
 * Handles tag at start, middle, or end of the string.
 * Returns the cleaned string with no leading/trailing commas and no double commas.
 * If the tag is not found, returns the original string unchanged.
 *
 * Usage in manifest: `mutate tags = removeTagFromString(self.tags, tag)`
 */
export function removeTagFromString(...args: unknown[]): string {
  const tags = typeof args[0] === "string" ? args[0] : "";
  const tag = typeof args[1] === "string" ? args[1] : "";
  if (tag === "" || tags === "") return tags;

  const parts = tags.split(",").filter((t) => t !== tag);
  return parts.join(",");
}

/**
 * Build the map of custom builtins handed to the runtime engine via
 * `RuntimeOptions.customBuiltins`. This is the single source of truth for the
 * project's custom expression functions; every runtime construction path
 * (`apps/api`, `apps/app`, the MCP server) flows through the one factory that
 * calls this, so all callers get an identical set with no drift.
 */
export function createCustomBuiltins(): Map<string, CustomBuiltin> {
  return new Map<string, CustomBuiltin>([
    ["daysBetween", daysBetween],
    ["hoursBetween", hoursBetween],
    ["addDays", addDays],
    ["percent", percent],
    ["containsAny", containsAny],
    ["removeTagFromString", removeTagFromString],
  ]);
}
