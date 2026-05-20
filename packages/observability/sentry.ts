/**
 * Canonical re-export of the Sentry SDK for workspace consumers.
 *
 * Use this entry point (`@repo/observability/sentry`) instead of importing
 * `@sentry/nextjs` directly from app or feature packages. It keeps a single
 * dependency on the SDK in this package and lets us swap implementations
 * (or add cross-cutting wrappers) without touching every call site.
 *
 * Note: contains both client- and server-safe APIs. Caller is responsible
 * for honoring the appropriate runtime context.
 */
export * from "@sentry/nextjs";
