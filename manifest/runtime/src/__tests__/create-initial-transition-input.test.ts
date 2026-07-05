import type { RuntimeEngine } from "@angriff36/manifest";
import { describe, expect, it } from "vitest";
import {
  runManifestCommandCore,
  sanitizeCreateInitialTransitionInput,
} from "../run-manifest-command-core";

function runtimeFor(entity: unknown): RuntimeEngine {
  return {
    getEntity: () => entity,
  } as unknown as RuntimeEngine;
}

describe("sanitizeCreateInitialTransitionInput", () => {
  it("removes redundant create input that equals the transition-governed default", () => {
    const body: Record<string, unknown> = {
      name: "Route 1",
      status: "planned",
    };

    const removed = sanitizeCreateInitialTransitionInput(
      runtimeFor({
        name: "LogisticsRoute",
        properties: [
          {
            name: "status",
            defaultValue: { kind: "string", value: "planned" },
          },
        ],
        transitions: [
          {
            property: "status",
            from: "planned",
            to: ["in_progress", "cancelled"],
          },
        ],
      }),
      "LogisticsRoute",
      "create",
      body
    );

    expect(removed).toEqual(["status"]);
    expect(body).toEqual({ name: "Route 1" });
  });

  it("preserves non-default create input so real transitions still validate", () => {
    const body: Record<string, unknown> = {
      name: "Route 1",
      status: "in_progress",
    };

    const removed = sanitizeCreateInitialTransitionInput(
      runtimeFor({
        name: "LogisticsRoute",
        properties: [
          {
            name: "status",
            defaultValue: { kind: "string", value: "planned" },
          },
        ],
        transitions: [
          {
            property: "status",
            from: "planned",
            to: ["in_progress", "cancelled"],
          },
        ],
      }),
      "LogisticsRoute",
      "create",
      body
    );

    expect(removed).toEqual([]);
    expect(body.status).toBe("in_progress");
  });

  it("does not alter non-create commands", () => {
    const body: Record<string, unknown> = {
      status: "planned",
    };

    const removed = sanitizeCreateInitialTransitionInput(
      runtimeFor({
        name: "LogisticsRoute",
        properties: [
          {
            name: "status",
            defaultValue: { kind: "string", value: "planned" },
          },
        ],
        transitions: [
          {
            property: "status",
            from: "planned",
            to: ["in_progress", "cancelled"],
          },
        ],
      }),
      "LogisticsRoute",
      "update",
      body
    );

    expect(removed).toEqual([]);
    expect(body.status).toBe("planned");
  });

  it("sanitizes redundant initial transition values before runCommand", async () => {
    let inputSeenByRuntime: Record<string, unknown> | undefined;
    const entity = {
      name: "LogisticsRoute",
      properties: [
        {
          name: "status",
          defaultValue: { kind: "string", value: "planned" },
        },
      ],
      relationships: [],
      transitions: [
        {
          property: "status",
          from: "planned",
          to: ["in_progress", "cancelled"],
        },
      ],
    };

    const runtime = {
      getCommand: () => ({ parameters: [] }),
      getEntity: () => entity,
      runCommand: async (_command: string, input: Record<string, unknown>) => {
        inputSeenByRuntime = { ...input };
        return { success: true, result: { id: "route-1" } };
      },
    } as unknown as RuntimeEngine;

    // LogisticsRoute.create's generated param schema requires these fields; the
    // gate runs before the runtime, so supply them. They are not initial-transition
    // values, so they flow through unchanged — only the redundant status="planned"
    // (the entity's default) must be stripped.
    const scheduledDate = new Date(1_700_000_000_000).toISOString();
    const endTime = new Date(1_700_003_600_000).toISOString();

    const result = await runManifestCommandCore(
      {
        createRuntime: async () => runtime,
      },
      {
        entity: "LogisticsRoute",
        command: "create",
        body: {
          name: "Route 1",
          status: "planned",
          scheduledDate,
          endTime,
          totalDistance: 0,
          totalDuration: 0,
          description: "",
        },
        user: { id: "u1", tenantId: "t1", role: "admin" },
      }
    );

    expect(result.ok).toBe(true);
    expect(inputSeenByRuntime).toEqual({
      name: "Route 1",
      scheduledDate,
      endTime,
      totalDistance: 0,
      totalDuration: 0,
      description: "",
    });
  });
});
