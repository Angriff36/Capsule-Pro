/**
 * Decimal Serialization Utilities
 *
 * Prisma Decimal objects cannot cross the Server Component → Client Component
 * boundary in Next.js. React throws: "Only plain objects can be passed to
 * Client Components from Server Components. Decimal {...}".
 *
 * Use these utilities to convert Decimal values to plain numbers/strings
 * before passing data to client components or returning from server actions.
 */

/**
 * Check if a value is a Prisma Decimal object.
 */
function isDecimal(
  value: unknown
): value is { toNumber: () => number; toString: () => string } {
  if (value == null || typeof value !== "object") {
    return false;
  }
  // Duck-type check: Prisma Decimal (decimal.js) always has { s, e, d } internals
  // plus a toNumber method. Avoid constructor.name — it gets minified to "Decimal2"
  // when @repo/database is transpiled by Turbopack/webpack (transpilePackages).
  const v = value as Record<string, unknown>;
  return (
    typeof v.toNumber === "function" &&
    "s" in v &&
    "e" in v &&
    "d" in v &&
    Array.isArray(v.d)
  );
}

/**
 * Convert a single Decimal value to a plain number.
 * Returns null/undefined as-is.
 */
export function serializeDecimal(value: unknown): number | null | undefined {
  if (value == null) {
    return value as null | undefined;
  }
  if (typeof value === "number") {
    return value;
  }
  if (isDecimal(value)) {
    return value.toNumber();
  }
  // If it's a string that looks like a number, parse it
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/**
 * Recursively serialize all Decimal values in an object to plain numbers.
 * Handles nested objects, arrays, and Date objects (leaves Dates intact).
 *
 * @example
 * ```ts
 * const event = await database.event.findFirst({ ... });
 * const safe = serializeDecimals(event); // All Decimal fields → numbers
 * return safe; // Safe to pass to client component
 * ```
 */
export function serializeDecimals<T>(obj: T): T {
  if (obj == null) {
    return obj;
  }

  if (typeof obj === "object") {
    // Handle Date objects — leave them intact
    if (obj instanceof Date) {
      return obj as T;
    }

    // Handle arrays
    if (Array.isArray(obj)) {
      return obj.map(serializeDecimals) as T;
    }

    // Handle plain objects — walk each key and convert Decimals
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(obj as Record<string, unknown>)) {
      const val = (obj as Record<string, unknown>)[key];
      if (isDecimal(val)) {
        result[key] = val.toNumber();
      } else if (
        typeof val === "object" &&
        val != null &&
        !(val instanceof Date)
      ) {
        result[key] = serializeDecimals(val);
      } else {
        result[key] = val;
      }
    }
    return result as T;
  }

  // Primitives pass through
  return obj;
}

/**
 * Serialize Decimal fields in an API response object.
 * Like serializeDecimals but specifically targets known Decimal field names
 * for better performance on large result sets.
 *
 * @param obj - The object to serialize
 * @param decimalFields - Optional list of field names that are Decimal type.
 *                        If omitted, all Decimal values are found recursively.
 */
export function serializeApiDecimalFields(
  obj: Record<string, unknown>,
  decimalFields?: string[]
): Record<string, unknown> {
  if (!obj || typeof obj !== "object") {
    return obj;
  }

  if (decimalFields && decimalFields.length > 0) {
    // Fast path: only convert known fields
    const result = { ...obj };
    for (const field of decimalFields) {
      if (field in result && isDecimal(result[field])) {
        result[field] = (
          result[field] as { toNumber: () => number }
        ).toNumber();
      }
    }
    return result;
  }

  // Slow path: recursive scan
  return serializeDecimals(obj);
}
