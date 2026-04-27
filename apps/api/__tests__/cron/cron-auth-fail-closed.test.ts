/**
 * Cron Authentication Fail-Closed Test Suite
 *
 * Regression tests for IMPLEMENTATION_PLAN items E2-2 and E2-3 (and the
 * adjacent `keep-alive` route discovered during the same audit).
 *
 * WHY THIS MATTERS
 * ----------------
 * The original `verifyCronAuth` helpers in:
 *   - apps/api/app/api/cron/email-reminders/route.ts
 *   - apps/api/app/api/cron/contract-expiration-alerts/route.ts
 *   - apps/api/app/cron/keep-alive/route.ts
 * returned `true` (or skipped the auth check entirely) when `CRON_SECRET`
 * was unset. That is a fail-OPEN posture: a production deploy that simply
 * forgot the env var would expose the cron endpoints to anonymous callers
 * on the public internet.
 *
 * The risk is real:
 *   - email-reminders fans out to `triggerEmailWorkflows` for every active
 *     tenant — anonymous traffic can spam reminder emails on demand.
 *   - contract-expiration-alerts does the same for contract emails.
 *   - keep-alive runs an unbounded `database.tenant.count()` — a cheap DB
 *     amplification + tenant-enumeration signal for an attacker.
 *
 * The fix flipped the helpers to fail-CLOSED: when CRON_SECRET is missing
 * the route logs `console.error` and rejects the request. These tests pin
 * that behavior so a future refactor can't silently revert it.
 *
 * @vitest-environment node
 */

import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Keep-alive imports `@/env` (validated env) — stub it so we can flip
// CRON_SECRET per-test without rebuilding the module graph.
const envHolder: { CRON_SECRET: string | undefined } = {
  CRON_SECRET: undefined,
};
vi.mock("@/env", () => ({
  get env() {
    return envHolder;
  },
}));

// Database is touched by the routes we exercise. We don't care about the
// downstream behavior in these tests — only that the auth check rejects
// before any DB call would matter — but we still mock it so a failed auth
// path that leaks through is loud (the mocks throw if called when they
// shouldn't be).
vi.mock("@repo/database", () => ({
  database: {
    tenant: {
      count: vi.fn().mockResolvedValue(0),
    },
    emailWorkflow: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    eventContract: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
}));

vi.mock("@repo/notifications", () => ({
  triggerEmailWorkflows: vi.fn().mockResolvedValue({ triggered: 0 }),
  buildContractRecipients: vi.fn().mockReturnValue([]),
  buildContractTemplateData: vi.fn().mockReturnValue({}),
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

// Imported lazily inside `it()` blocks so the env stub above is in place
// before the route module evaluates its `process.env.CRON_SECRET` reads.
async function importEmailRemindersPOST() {
  const mod = await import("../../app/api/cron/email-reminders/route");
  return mod.POST;
}

async function importContractAlertsPOST() {
  const mod = await import(
    "../../app/api/cron/contract-expiration-alerts/route"
  );
  return mod.POST;
}

async function importKeepAliveGET() {
  const mod = await import("../../app/cron/keep-alive/route");
  return mod.GET;
}

const ORIGINAL_CRON_SECRET = process.env.CRON_SECRET;

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
  process.env.CRON_SECRET = ORIGINAL_CRON_SECRET;
  envHolder.CRON_SECRET = undefined;
});

describe("cron/email-reminders auth (E2-2 fail-closed regression)", () => {
  it("rejects with 401 when CRON_SECRET is not configured", async () => {
    // Empty string (not `undefined`) because `process.env.X = undefined`
    // coerces to the literal string "undefined" — which is truthy. An empty
    // string mirrors the runtime behavior of an unset env var for the
    // `if (!cronSecret)` check.
    process.env.CRON_SECRET = "";
    const POST = await importEmailRemindersPOST();

    const req = new NextRequest(
      new URL("http://test/api/cron/email-reminders"),
      { method: "POST" }
    );
    const res = await POST(req);

    expect(res.status).toBe(401);
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("CRON_SECRET is not configured")
    );
  });

  it("rejects with 401 when authorization header is missing and secret is set", async () => {
    process.env.CRON_SECRET = "test-secret";
    const POST = await importEmailRemindersPOST();

    const req = new NextRequest(
      new URL("http://test/api/cron/email-reminders"),
      { method: "POST" }
    );
    const res = await POST(req);

    expect(res.status).toBe(401);
  });

  it("rejects with 401 when authorization header has the wrong secret", async () => {
    process.env.CRON_SECRET = "test-secret";
    const POST = await importEmailRemindersPOST();

    const req = new NextRequest(
      new URL("http://test/api/cron/email-reminders"),
      {
        method: "POST",
        headers: { authorization: "Bearer wrong-secret" },
      }
    );
    const res = await POST(req);

    expect(res.status).toBe(401);
  });

  it("authorizes when authorization header matches the configured secret", async () => {
    process.env.CRON_SECRET = "test-secret";
    const POST = await importEmailRemindersPOST();

    const req = new NextRequest(
      new URL("http://test/api/cron/email-reminders"),
      {
        method: "POST",
        headers: { authorization: "Bearer test-secret" },
      }
    );
    const res = await POST(req);

    // Body is checked for `success: true` — the no-workflows happy path.
    expect(res.status).toBe(200);
    const body = (await res.json()) as { success: boolean };
    expect(body.success).toBe(true);
  });
});

describe("cron/contract-expiration-alerts auth (E2-3 fail-closed regression)", () => {
  it("rejects with 401 when CRON_SECRET is not configured", async () => {
    // See note in email-reminders test about empty-string vs undefined.
    process.env.CRON_SECRET = "";
    const POST = await importContractAlertsPOST();

    const req = new NextRequest(
      new URL("http://test/api/cron/contract-expiration-alerts"),
      { method: "POST" }
    );
    const res = await POST(req);

    expect(res.status).toBe(401);
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("CRON_SECRET is not configured")
    );
  });

  it("rejects with 401 when authorization header has the wrong secret", async () => {
    process.env.CRON_SECRET = "test-secret";
    const POST = await importContractAlertsPOST();

    const req = new NextRequest(
      new URL("http://test/api/cron/contract-expiration-alerts"),
      {
        method: "POST",
        headers: { authorization: "Bearer wrong-secret" },
      }
    );
    const res = await POST(req);

    expect(res.status).toBe(401);
  });

  it("authorizes when authorization header matches the configured secret", async () => {
    process.env.CRON_SECRET = "test-secret";
    const POST = await importContractAlertsPOST();

    const req = new NextRequest(
      new URL("http://test/api/cron/contract-expiration-alerts"),
      {
        method: "POST",
        headers: { authorization: "Bearer test-secret" },
      }
    );
    const res = await POST(req);

    // No active workflows → returns 200 with success:true and the
    // "No active contract expiration workflows found" body.
    expect(res.status).toBe(200);
  });
});

describe("cron/keep-alive auth (fail-closed regression)", () => {
  it("rejects with 503 when CRON_SECRET is not configured", async () => {
    envHolder.CRON_SECRET = undefined;
    const GET = await importKeepAliveGET();

    const req = new Request("http://test/api/cron/keep-alive");
    const res = await GET(req);

    expect(res.status).toBe(503);
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("CRON_SECRET is not configured")
    );
  });

  it("rejects with 401 when x-cron-secret header is missing", async () => {
    envHolder.CRON_SECRET = "test-secret";
    const GET = await importKeepAliveGET();

    const req = new Request("http://test/api/cron/keep-alive");
    const res = await GET(req);

    expect(res.status).toBe(401);
  });

  it("rejects with 401 when x-cron-secret header has the wrong value", async () => {
    envHolder.CRON_SECRET = "test-secret";
    const GET = await importKeepAliveGET();

    const req = new Request("http://test/api/cron/keep-alive", {
      headers: { "x-cron-secret": "wrong-secret" },
    });
    const res = await GET(req);

    expect(res.status).toBe(401);
  });

  it("authorizes when x-cron-secret header matches the configured secret", async () => {
    envHolder.CRON_SECRET = "test-secret";
    const GET = await importKeepAliveGET();

    const req = new Request("http://test/api/cron/keep-alive", {
      headers: { "x-cron-secret": "test-secret" },
    });
    const res = await GET(req);

    expect(res.status).toBe(200);
  });
});
