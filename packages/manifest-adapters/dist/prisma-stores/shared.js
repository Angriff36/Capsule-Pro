/**
 * Shared helpers for Prisma store implementations created during the
 * BROKEN_PRISMA_READ batches (batch01–batch03).
 *
 * These stores mirror the AlertsConfigPrismaStore template in
 * `packages/manifest-adapters/src/prisma-store.ts` but live in their own
 * files so the main store module stays manageable.
 */
import { Prisma } from "@repo/database/standalone";
/**
 * Report a silent store error to Sentry without blocking the return path.
 * Uses dynamic import so this module doesn't hard-depend on @sentry/nextjs.
 */
function reportStoreError(error, store, op) {
    import("@sentry/node")
        .then(({ captureException }) => {
        captureException(error, {
            tags: { source: "prisma-store", store, op },
        });
    })
        .catch(() => {
        // Sentry not available — swallow to avoid infinite loops
    });
}
/** Shorthand used inside Store classes — derives the store name from the class name. */
export function reportOp(self, op, error) {
    reportStoreError(error, self.constructor.name, op);
}
/**
 * Convert a manifest input value to a Prisma-friendly Decimal input.
 *
 * In production `Prisma.Decimal` is a real constructor and we wrap the value
 * so Prisma writes a NUMERIC. In the Vitest mock at
 * `apps/api/test/mocks/@repo/database.ts` `Prisma.Decimal` is undefined, so
 * we just pass the raw value through — the mocked Prisma model functions
 * record the input verbatim.
 *
 * The return type is widened to `unknown` at the call site via a typed
 * helper interface, allowing both real `Prisma.Decimal` instances (when
 * available) and string/number fallbacks to flow through to Prisma.
 */
export function toDecimalInput(value) {
    if (value === null || value === undefined || value === "") {
        return null;
    }
    const PrismaDecimal = Prisma.Decimal;
    if (typeof PrismaDecimal === "function") {
        try {
            // Prisma.Decimal instances are valid `DecimalInput` at runtime; the
            // generated DecimalJsLike type accepts them. We coerce here to satisfy
            // TS without introducing `any` in callers.
            return new PrismaDecimal(typeof value === "number" ? value : String(value));
        }
        catch {
            return null;
        }
    }
    if (typeof value === "number")
        return value;
    return String(value);
}
/**
 * Same as `toDecimalInput`, but the return type excludes `null` and the
 * fallback (default 0) is used when the input would otherwise become null.
 * Use for required (non-`?`) decimal columns.
 */
export function toDecimalRequired(value, fallback = 0) {
    const result = toDecimalInput(value);
    if (result === null) {
        return toDecimalInput(fallback);
    }
    return result;
}
/**
 * Coerce a manifest field to a Prisma JSON input (default `{}`).
 *
 * Return type excludes `null` so the helper is safe for required JSON
 * columns. Callers wanting NULL behavior should pass through explicitly.
 */
export function asJsonInput(value) {
    if (value === null || value === undefined) {
        return {};
    }
    return value;
}
/** Coerce a manifest field to string, returning "" for null/undefined. */
export function asString(value) {
    if (value === null || value === undefined)
        return "";
    return String(value);
}
/** Coerce a manifest field to string | null. */
export function asNullableString(value) {
    if (value === null || value === undefined || value === "")
        return null;
    return String(value);
}
/** Coerce a manifest field to number | null. */
export function asNullableNumber(value) {
    if (value === null || value === undefined || value === "")
        return null;
    const n = typeof value === "number" ? value : Number(value);
    return Number.isFinite(n) ? n : null;
}
/** Coerce a manifest field to Date | null (accepts ISO string, ms epoch, or Date). */
export function asNullableDate(value) {
    if (value === null || value === undefined || value === "")
        return null;
    if (value instanceof Date)
        return value;
    if (typeof value === "number") {
        const d = new Date(value);
        return Number.isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(String(value));
    return Number.isNaN(d.getTime()) ? null : d;
}
/** Coerce a manifest field to a string array. */
export function asStringArray(value) {
    if (Array.isArray(value)) {
        return value.filter((v) => v !== null && v !== undefined).map(String);
    }
    return [];
}
/** Coerce a manifest field to a boolean (default false). */
export function asBool(value, fallback = false) {
    if (value === true || value === false)
        return value;
    if (value === "true")
        return true;
    if (value === "false")
        return false;
    return fallback;
}
