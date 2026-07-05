// @vitest-environment node
/**
 * WS5 — Manifest-governed AI actions: discover → validate → execute → verify.
 *
 * Covers the mission's acceptance cases:
 *  (a) the command tool list is derived from the compiled IR and excludes
 *      DENY-tier commands;
 *  (b) a CONFIRM-tier command returns a proposed action (no dispatch) unless the
 *      user has confirmed it, in which case it dispatches;
 *  (c) unknown command / unknown entity / invented field fail with a structured
 *      error and no verified state change;
 *  (d) a successful write includes read-back verifiedState + emitted events.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { getChatCommandAccess } from "@/app/api/command-board/chat/command-policy";
import { loadCommandCatalog } from "@/app/api/command-board/chat/manifest-command-tools";
import {
  createManifestToolRegistry,
  type ManifestAgentContext,
} from "@/app/api/command-board/chat/tool-registry";

vi.mock("@repo/database", () => ({
  database: {
    commandBoard: { findFirst: vi.fn() },
    boardProjection: { findMany: vi.fn() },
  },
}));

// Isolate from the API URL helper. NOTE: app/lib/api.ts currently fails to
// resolve `@repo/manifest-runtime/routes-manifest` (that subpath export was
// dropped from manifest/runtime/package.json in a branch merge — a pre-existing
// regression that also breaks the other command-board tool-registry test files).
// Mocking the two helpers tool-registry actually uses keeps this suite runnable
// and independent of that infra breakage.
vi.mock("@/app/lib/api", () => ({
  getApiBaseUrl: () => "http://127.0.0.1:2223",
  getDeploymentId: () => null,
}));

function baseContext(
  overrides: Partial<ManifestAgentContext> = {}
): ManifestAgentContext {
  return {
    tenantId: "tenant-1",
    userId: "user-1",
    boardId: "2957779c-9732-4060-86fd-c5b2be03cbee",
    correlationId: "corr-ws5",
    authCookie: null,
    confirmedActions: [],
    ...overrides,
  };
}

/**
 * Mock fetch that answers the dispatcher POST (text body) and the read-back GET
 * (json body). Records calls so tests can assert whether a dispatch happened.
 */
function installFetchMock(result: Record<string, unknown>) {
  const calls: Array<{ url: string; method: string; body?: unknown }> = [];
  const mock = vi.fn(
    (url: string, opts: { method?: string; body?: string }) => {
      const method = opts?.method ?? "GET";
      calls.push({
        url,
        method,
        body: opts?.body ? JSON.parse(opts.body) : undefined,
      });
      if (method === "POST") {
        return {
          ok: true,
          status: 200,
          text: () =>
            Promise.resolve(
              JSON.stringify({
                success: true,
                result,
                events: ["EntityChanged"],
              })
            ),
        };
      }
      // read-back GET /api/manifest/{entity}/{id}
      return {
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: result }),
      };
    }
  );
  global.fetch = mock as unknown as typeof fetch;
  return { mock, calls };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("(a) tool list is IR-derived and excludes DENY commands", () => {
  it("sources parameter types from the compiled IR, not the flattened route surface", () => {
    const catalog = loadCommandCatalog();
    // Route surface flattens Money to "string"; the IR types it as money → number.
    const budget = catalog.byEntityCommand
      .get("Event.create")
      ?.params.find((p) => p.name === "budget");
    expect(budget?.type).toBe("number");

    // The generated tool schema is the IR-native JSON Schema.
    const toolName = catalog.toolNameByEntityCommand.get("Event.create");
    const definition = catalog.toolDefinitions.find((d) => d.name === toolName);
    const properties = (
      definition?.parameters as {
        properties?: Record<string, { type?: string; format?: string }>;
      }
    ).properties;
    expect(properties?.budget?.type).toBe("number");
    expect(properties?.eventDate?.format).toBe("date-time");
  });

  it("excludes DENY-tier commands from every model-facing surface", () => {
    const catalog = loadCommandCatalog();
    // VendorContract.terminate is a real registered command but DENY-tier.
    expect(catalog.canonicalEntityCommandPairs).not.toContain(
      "VendorContract.terminate"
    );
    expect(catalog.byEntityCommand.has("VendorContract.terminate")).toBe(false);
    for (const [toolName, pair] of catalog.toolToEntityCommand) {
      expect(pair).not.toBe("VendorContract.terminate");
      expect(toolName).not.toContain("vendorcontract_terminate");
    }
    // An ALLOW-tier command remains available.
    expect(catalog.byEntityCommand.has("PrepTask.claim")).toBe(true);
  });
});

describe("(b) CONFIRM tier gates on explicit confirmation", () => {
  it("returns a proposed action and does NOT dispatch without confirmation", async () => {
    const { mock } = installFetchMock({ id: "evt-1", status: "cancelled" });
    const registry = createManifestToolRegistry(baseContext());

    const result = await registry.executeToolCall({
      name: "execute_manifest_command",
      argumentsJson: JSON.stringify({
        entityName: "Event",
        commandName: "cancel",
        instanceId: "evt-1",
        args: { reason: "duplicate" },
      }),
      callId: "call-confirm-1",
    });

    expect(result.ok).toBe(true);
    expect((result.data as { status?: string }).status).toBe(
      "confirmation_required"
    );
    // No dispatch POST happened.
    expect(
      mock.mock.calls.some(
        ([, opts]) => (opts as { method?: string })?.method === "POST"
      )
    ).toBe(false);
  });

  it("dispatches when the user has confirmed the exact action", async () => {
    const { calls } = installFetchMock({ id: "evt-1", status: "cancelled" });
    const registry = createManifestToolRegistry(
      baseContext({ confirmedActions: ["Event.cancel"] })
    );

    const result = await registry.executeToolCall({
      name: "execute_manifest_command",
      argumentsJson: JSON.stringify({
        entityName: "Event",
        commandName: "cancel",
        instanceId: "evt-1",
        args: { reason: "duplicate" },
      }),
      callId: "call-confirm-2",
    });

    expect(result.ok).toBe(true);
    expect(calls.some((c) => c.method === "POST")).toBe(true);
    const postCall = calls.find((c) => c.method === "POST");
    expect(postCall?.url).toContain("/api/manifest/Event/commands/cancel");
  });
});

describe("policy is DENY / CONFIRM / ALLOW via the shared map", () => {
  it("refuses DENY commands without dispatching", async () => {
    const { calls } = installFetchMock({ id: "x" });
    const registry = createManifestToolRegistry(baseContext());

    const result = await registry.executeToolCall({
      name: "execute_manifest_command",
      argumentsJson: JSON.stringify({
        entityName: "VendorContract",
        commandName: "terminate",
        instanceId: "vc-1",
      }),
      callId: "call-deny-1",
    });

    expect(result.ok).toBe(false);
    expect(result.error).toBe("POLICY_DENIED");
    expect((result.data as { status?: string }).status).toBe("denied");
    expect(calls.length).toBe(0);
  });

  it("chat surface defaults unlisted commands to ALLOW; map carries the exceptions", () => {
    expect(getChatCommandAccess("Event", "cancel")).toBe("CONFIRM");
    expect(getChatCommandAccess("VendorContract", "terminate")).toBe("DENY");
    expect(getChatCommandAccess("PrepTask", "claim")).toBe("ALLOW");
    // Unlisted command → ALLOW on the chat surface.
    expect(getChatCommandAccess("Event", "create")).toBe("ALLOW");
  });
});

describe("(c) invalid inputs fail with a structured error and no state change", () => {
  it("unknown command name → not supported, no dispatch", async () => {
    const { calls } = installFetchMock({ id: "x" });
    const registry = createManifestToolRegistry(baseContext());

    const result = await registry.executeToolCall({
      name: "execute_manifest_command",
      argumentsJson: JSON.stringify({
        entityName: "Event",
        commandName: "explodeEverything",
        args: {},
      }),
      callId: "call-unknown-cmd",
    });

    expect(result.ok).toBe(false);
    expect(result.error).toContain("Not supported");
    expect(calls.length).toBe(0);
  });

  it("unknown entity → not supported, no dispatch", async () => {
    const { calls } = installFetchMock({ id: "x" });
    const registry = createManifestToolRegistry(baseContext());

    const result = await registry.executeToolCall({
      name: "execute_manifest_command",
      argumentsJson: JSON.stringify({
        entityName: "Wizard",
        commandName: "create",
        args: {},
      }),
      callId: "call-unknown-entity",
    });

    expect(result.ok).toBe(false);
    expect(result.error).toContain("Not supported");
    expect(calls.length).toBe(0);
  });

  it("invented field → dispatcher rejects (zod pre-flight); no verified state attached", async () => {
    // Dispatcher validation rejects the unknown field with a 4xx; the chat layer
    // must surface it structurally and must NOT claim a verified state change.
    const mock = vi.fn((_url: string, _opts: { method?: string }) => ({
      ok: false,
      status: 400,
      text: () =>
        Promise.resolve(
          JSON.stringify({
            success: false,
            error: "Unknown parameter: madeUpField",
          })
        ),
    }));
    global.fetch = mock as unknown as typeof fetch;

    const registry = createManifestToolRegistry(baseContext());
    const result = await registry.executeToolCall({
      name: "execute_manifest_command",
      argumentsJson: JSON.stringify({
        entityName: "CommandBoardCard",
        commandName: "create",
        args: { title: "ok", madeUpField: "nope" },
      }),
      callId: "call-invented-field",
    });

    expect(result.ok).toBe(false);
    expect(
      (result.data as { verifiedState?: unknown }).verifiedState
    ).toBeUndefined();
    // A single dispatch attempt, no read-back GET (never verify a failed write).
    expect(
      mock.mock.calls.every(
        ([, opts]) => (opts as { method?: string })?.method === "POST"
      )
    ).toBe(true);
  });
});

describe("(d) successful write is verified by reading state back", () => {
  it("attaches verifiedState + emitted events from a read-back GET", async () => {
    const { calls } = installFetchMock({
      id: "card-1",
      title: "Prep Board",
      status: "active",
    });
    const registry = createManifestToolRegistry(baseContext());

    const result = await registry.executeToolCall({
      name: "execute_manifest_command",
      argumentsJson: JSON.stringify({
        entityName: "CommandBoardCard",
        commandName: "create",
        args: { title: "Prep Board" },
      }),
      callId: "call-write-verify",
    });

    expect(result.ok).toBe(true);
    const data = result.data as {
      status?: string;
      verifiedState?: { id?: string; fields?: Record<string, unknown> };
      emittedEvents?: string[];
    };
    expect(data.status).toBe("verified");
    expect(data.verifiedState?.id).toBe("card-1");
    expect(data.verifiedState?.fields?.title).toBe("Prep Board");
    expect(data.verifiedState?.fields?.status).toBe("active");
    expect(data.emittedEvents).toContain("EntityChanged");

    // Exactly one dispatch POST followed by one read-back GET.
    expect(calls.filter((c) => c.method === "POST")).toHaveLength(1);
    const getCall = calls.find((c) => c.method === "GET");
    expect(getCall?.url).toContain("/api/manifest/CommandBoardCard/card-1");
  });
});
