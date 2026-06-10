import { vi } from "vitest";

// Mock server-only module for all tests
vi.mock("server-only", () => ({}));

// Mock observability log for all tests — 345+ source files import this transitively
// through route handlers. Without this global mock, every test hitting a route needs
// a per-file vi.mock() or it fails at import time.
// Delegates to console so tests spying on console.error/warn still pass.
vi.mock("@repo/observability/log", () => ({
  log: {
    debug: vi.fn((...a: unknown[]) => process.env.DEBUG && console.debug(...a)),
    info: vi.fn((...a: unknown[]) => console.info(...a)),
    error: vi.fn((...a: unknown[]) => console.error(...a)),
    warn: vi.fn((...a: unknown[]) => console.warn(...a)),
  },
}));

// Mock tenant context for all tests — route handlers import these to resolve
// auth context. 56/58 quarantine tests were missing resolveCurrentUser (added
// during governance migration), causing "No export" errors. Per-file mocks
// in individual tests override these global stubs automatically.
vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
  requireTenantId: vi.fn(),
  requireCurrentUser: vi.fn(),
  resolveCurrentUser: vi.fn(),
}));

// Mock Sentry for all tests — the manifest command dispatcher and execute-command
// both import captureException. Without this, route handlers crash at import time.
vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
  addBreadcrumb: vi.fn(),
}));

// Mock webhook dispatch — fire-and-forget in execute-command. Per-file mocks override.
vi.mock("@/app/lib/webhook-dispatch", () => ({
  dispatchWebhooks: vi.fn().mockResolvedValue(undefined),
}));

// Mock manifest issue log — used by execute-command for diagnostic logging.
vi.mock("@/lib/manifest/issue-log", () => ({
  logManifestIssue: vi.fn(),
}));

// Mock notifications — empty stub. Most route handlers import this transitively.
vi.mock("@repo/notifications", () => ({}));
