/**
 * API Key Self-Revocation Prevention Tests (P1.BX)
 *
 * Why this matters: revoking the API key that authenticated the current
 * request would terminate the caller's session mid-flight (especially for
 * non-interactive integrations). Revoking a key you personally created via
 * the session UI is also blocked so that the action goes through a different
 * identity — this avoids accidental self-DoS and keeps an audit trail with a
 * distinct actor. Both conditions return 403.
 *
 * Tests live alongside settings.test.ts but are isolated so the existing
 * suite's mock defaults (which would otherwise trip the new guard) stay
 * intact.
 */

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@repo/database", () => ({
  database: {
    apiKey: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findFirst: vi.fn(),
    },
  },
}));
vi.mock("@repo/observability/log", () => ({
  log: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));
vi.mock("@/middleware/rate-limiter", () => ({
  withRateLimit: (handler: Function) => handler,
}));
vi.mock("@/middleware/dual-auth", () => ({
  requireDualAuth: vi.fn(),
}));
vi.mock("@/lib/api-scopes", () => ({
  API_SCOPES: { ADMIN: "admin" },
}));
vi.mock("@/lib/manifest/execute-command", () => ({
  runManifestCommand: vi.fn(),
}));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

const { auth } = await import("@repo/auth/server");
const { requireDualAuth } = await import("@/middleware/dual-auth");

const _revokeRoute = await import(
  "@/app/api/settings/api-keys/[id]/revoke/route"
);
const revokeApiKey = _revokeRoute.POST;

const { database } = await import("@repo/database");
const { runManifestCommand } = await import("@/lib/manifest/execute-command");

const TENANT = "tenant-001";
const SELF_INTERNAL = "user-self-001";
const OTHER_INTERNAL = "user-other-002";
const CLERK = "clerk_user_001";

function baseKey(overrides: Record<string, unknown> = {}) {
  return {
    id: "key-001",
    tenantId: TENANT,
    name: "Test key",
    keyPrefix: "cp_live_",
    revokedAt: null,
    deletedAt: null,
    createdByUserId: OTHER_INTERNAL,
    ...overrides,
  };
}

function req(id: string) {
  return {
    request: new NextRequest(
      `http://localhost/api/settings/api-keys/${id}/revoke`,
      { method: "POST" }
    ),
    context: { params: Promise.resolve({ id }) },
  };
}

describe("POST /api/settings/api-keys/[id]/revoke — self-revocation guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({
      orgId: "org",
      userId: CLERK,
    } as any);
    vi.mocked(database.apiKey.update).mockResolvedValue({
      id: "key-001",
      name: "Test key",
      keyPrefix: "cp_live_",
      revokedAt: new Date(),
    } as never);
  });

  it("blocks revoking the API key currently in use (api_key auth path)", async () => {
    vi.mocked(requireDualAuth).mockResolvedValue({
      authenticated: true,
      authMethod: "api_key",
      tenantId: TENANT,
      userId: SELF_INTERNAL,
      apiKeyContext: { id: "key-001" } as any,
    } as any);
    vi.mocked(database.apiKey.findUnique).mockResolvedValue(
      baseKey({ createdByUserId: OTHER_INTERNAL }) as never
    );

    const { request, context } = req("key-001");
    const res = await revokeApiKey(request, context);

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(String(body.message)).toMatch(/currently in use/i);
    expect(runManifestCommand).not.toHaveBeenCalled();
  });

  it("blocks revoking a key the caller created (session auth path)", async () => {
    vi.mocked(requireDualAuth).mockResolvedValue({
      authenticated: true,
      authMethod: "session",
      tenantId: TENANT,
      userId: CLERK, // session = clerk id
    } as any);
    vi.mocked(database.apiKey.findUnique).mockResolvedValue(
      baseKey({ createdByUserId: SELF_INTERNAL }) as never
    );
    vi.mocked(database.user.findFirst).mockResolvedValue({
      id: SELF_INTERNAL,
    } as never);

    const { request, context } = req("key-001");
    const res = await revokeApiKey(request, context);

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(String(body.message)).toMatch(/you created/i);
    expect(runManifestCommand).not.toHaveBeenCalled();
  });

  it("allows revoking another user's key (session auth)", async () => {
    vi.mocked(requireDualAuth).mockResolvedValue({
      authenticated: true,
      authMethod: "session",
      tenantId: TENANT,
      userId: CLERK,
    } as any);
    vi.mocked(database.apiKey.findUnique).mockResolvedValue(
      baseKey({ createdByUserId: OTHER_INTERNAL }) as never
    );
    vi.mocked(database.user.findFirst).mockResolvedValue({
      id: SELF_INTERNAL,
    } as never);
    vi.mocked(runManifestCommand).mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const { request, context } = req("key-001");
    const res = await revokeApiKey(request, context);

    expect(res.status).toBe(200);
    expect(runManifestCommand).toHaveBeenCalled();
  });

  it("allows revoking a different key under api_key auth when not the caller's key", async () => {
    vi.mocked(requireDualAuth).mockResolvedValue({
      authenticated: true,
      authMethod: "api_key",
      tenantId: TENANT,
      userId: SELF_INTERNAL,
      apiKeyContext: { id: "key-999" } as any,
    } as any);
    vi.mocked(database.apiKey.findUnique).mockResolvedValue(
      baseKey({ id: "key-001", createdByUserId: OTHER_INTERNAL }) as never
    );
    vi.mocked(runManifestCommand).mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const { request, context } = req("key-001");
    const res = await revokeApiKey(request, context);

    expect(res.status).toBe(200);
    expect(runManifestCommand).toHaveBeenCalled();
  });
});
