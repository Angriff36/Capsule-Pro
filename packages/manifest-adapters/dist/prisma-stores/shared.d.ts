/**
 * Shared helpers for Prisma store implementations created during the
 * BROKEN_PRISMA_READ batches (batch01–batch03).
 *
 * These stores mirror the AlertsConfigPrismaStore template in
 * `packages/manifest-adapters/src/prisma-store.ts` but live in their own
 * files so the main store module stays manageable.
 */
/**
 * Manifest runtime entity shape — opaque bag of fields with a string id.
 * Re-declared locally so each store file can stand on its own without
 * pulling the base export through a long import chain.
 */
export interface EntityInstance {
    id: string;
    [key: string]: unknown;
}
/** Shorthand used inside Store classes — derives the store name from the class name. */
export declare function reportOp(self: {
    constructor: {
        name: string;
    };
}, op: string, error: unknown): void;
/**
 * Permissive Decimal input type compatible with Prisma's generated
 * `Decimal | DecimalJsLike | string | number | null` union for decimal
 * columns. We type the helper this way so call sites don't have to cast.
 */
export type DecimalInput = string | number | null;
/** Non-nullable Decimal input — for required (non-`?`) decimal columns. */
export type DecimalRequired = string | number;
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
export declare function toDecimalInput(value: unknown): DecimalInput;
/**
 * Same as `toDecimalInput`, but the return type excludes `null` and the
 * fallback (default 0) is used when the input would otherwise become null.
 * Use for required (non-`?`) decimal columns.
 */
export declare function toDecimalRequired(value: unknown, fallback?: number | string): DecimalRequired;
/** JSON value compatible with Prisma's `Json` column input. */
export type JsonInput = string | number | boolean | null | {
    [k: string]: JsonInput;
} | JsonInput[];
/**
 * Coerce a manifest field to a Prisma JSON input (default `{}`).
 *
 * Return type excludes `null` so the helper is safe for required JSON
 * columns. Callers wanting NULL behavior should pass through explicitly.
 */
export declare function asJsonInput(value: unknown): Exclude<JsonInput, null>;
/** Coerce a manifest field to string, returning "" for null/undefined. */
export declare function asString(value: unknown): string;
/** Coerce a manifest field to string | null. */
export declare function asNullableString(value: unknown): string | null;
/** Coerce a manifest field to number | null. */
export declare function asNullableNumber(value: unknown): number | null;
/** Coerce a manifest field to Date | null (accepts ISO string, ms epoch, or Date). */
export declare function asNullableDate(value: unknown): Date | null;
/** Coerce a manifest field to a string array. */
export declare function asStringArray(value: unknown): string[];
/** Coerce a manifest field to a boolean (default false). */
export declare function asBool(value: unknown, fallback?: boolean): boolean;
//# sourceMappingURL=shared.d.ts.map