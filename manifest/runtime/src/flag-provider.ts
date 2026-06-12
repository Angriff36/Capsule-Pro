/**
 * Feature-flag provider for Manifest runtime.
 *
 * Resolves `flag("name")` calls in guards, constraints, and computed
 * properties by reading environment variables with a `MANIFEST_FLAG_` prefix.
 *
 * Flag name resolution:
 *   flag("events.advanced_pricing") → MANIFEST_FLAG_EVENTS_ADVANCED_PRICING
 *
 * Value parsing (case-insensitive):
 *   - "true" / "1" / "yes" → true
 *   - "false" / "0" / "no" → false
 *   - Numeric strings        → number
 *   - Everything else         → the raw string
 *   - Missing / empty         → false (safe default — features off)
 *
 * @packageDocumentation
 */

/**
 * Create a flag provider that reads from environment variables.
 *
 * Zero-dependency: no DB lookup, no external service. Fast enough for
 * every-expression evaluation. For per-tenant overrides, wrap this
 * provider in a higher-order function that checks tenant context first.
 */
export function createEnvFlagProvider(): (name: string) => unknown {
  return (name: string): unknown => {
    const envKey = `MANIFEST_FLAG_${name.toUpperCase().replace(/\./g, "_")}`;
    const value = process.env[envKey];

    if (value === undefined || value === "") {
      return false;
    }

    const lower = value.toLowerCase();
    if (lower === "true" || lower === "1" || lower === "yes") {
      return true;
    }
    if (lower === "false" || lower === "0" || lower === "no") {
      return false;
    }

    const num = Number(value);
    if (!isNaN(num) && value.trim() !== "") {
      return num;
    }

    return value;
  };
}
