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

    const result = await runManifestCommandCore(
      {
        createRuntime: async () => runtime,
      },
      {
        entity: "LogisticsRoute",
        command: "create",
        body: { name: "Route 1", status: "planned" },
        user: { id: "u1", tenantId: "t1", role: "admin" },
      }
    );

    expect(result.ok).toBe(true);
    expect(inputSeenByRuntime).toEqual({ name: "Route 1" });
  });
});
