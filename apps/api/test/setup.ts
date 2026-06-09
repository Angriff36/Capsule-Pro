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
