/**
 * Tests that ManifestRuntimeEngine invokes the telemetry onCommandExecuted
 * hook after a successful runCommand that emits events.
 *
 * This is the critical bridge between the runtime engine and the outbox
 * persistence logic wired up in manifest-runtime-factory.ts.
 *
 * @vitest-environment node
 */

import type { CommandResult } from "@angriff36/manifest";
import type { IR, IRCommand } from "@angriff36/manifest/ir";
import { describe, expect, it, vi } from "vitest";
import { ManifestRuntimeEngine } from "../src/runtime-engine";

// ---------------------------------------------------------------------------
// Minimal IR fixture: one entity, one command that emits one event.
// ---------------------------------------------------------------------------

function createMinimalIR(): IR {
  return {
    version: "1.0",
    provenance: {
      contentHash: "test-hash",
      compilerVersion: "0.0.0-test",
      schemaVersion: "1.0",
      compiledAt: new Date().toISOString(),
    },
    modules: [],
    entities: [
      {
        name: "Task",
        properties: [
          {
            name: "id",
            type: { name: "string", nullable: false },
            modifiers: ["required"],
          },
          {
            name: "status",
            type: { name: "string", nullable: false },
            defaultValue: { kind: "string", value: "open" },
            modifiers: [],
          },
        ],
        computedProperties: [],
        relationships: [],
        commands: ["claim"],
        constraints: [],
        policies: [],
      },
    ],
    stores: [
      {
        entity: "Task",
        target: "memory",
        config: {},
      },
    ],
    events: [
      {
        name: "TaskClaimed",
        channel: "task.claimed",
        payload: { name: "object", nullable: false },
      },
    ],
    commands: [
      {
        name: "claim",
        entity: "Task",
        parameters: [
          {
            name: "userId",
            type: { name: "string", nullable: false },
            required: true,
          },
        ],
        guards: [],
        actions: [
          {
            kind: "mutate",
            target: "status",
            expression: {
              kind: "literal",
              value: { kind: "string", value: "in_progress" },
            },
          },
        ],
        emits: ["TaskClaimed"],
      },
    ],
    policies: [],
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ManifestRuntimeEngine telemetry hook", () => {
  it("calls onCommandExecuted after a successful command that emits events", async () => {
    const onCommandExecuted = vi.fn(async () => {});

    const ir = createMinimalIR();
    const engine = new ManifestRuntimeEngine(
      ir,
      {
        user: { id: "user-1", role: "admin" },
        telemetry: { onCommandExecuted },
      },
      { requireValidProvenance: false }
    );

    // Seed an instance so the command has something to mutate
    await engine.createInstance("Task", { id: "task-1", status: "open" });

    const result = await engine.runCommand(
      "claim",
      { userId: "user-1" },
      { entityName: "Task", instanceId: "task-1" }
    );

    // Verify the command itself succeeded and emitted
    expect(result.success).toBe(true);
    expect(result.emittedEvents).toHaveLength(1);
    expect(result.emittedEvents[0].name).toBe("TaskClaimed");

    // Verify the telemetry hook was called exactly once
    expect(onCommandExecuted).toHaveBeenCalledTimes(1);

    // Verify the hook received the correct arguments
    const call = onCommandExecuted.mock.calls[0] as unknown as [
      Readonly<IRCommand>,
      Readonly<CommandResult>,
      string | undefined,
    ];

    expect(call[0].name).toBe("claim");
    expect(call[0].entity).toBe("Task");
    expect(call[1].success).toBe(true);
    expect(call[1].emittedEvents).toHaveLength(1);
    expect(call[2]).toBe("Task");
  });

  it("does NOT call onCommandExecuted when the command fails (guard denial)", async () => {
    const onCommandExecuted = vi.fn(async () => {});

    const ir = createMinimalIR();

    // Add a guard that always fails: userId must not be empty
    ir.commands[0].guards = [
      {
        kind: "binary",
        operator: "!=",
        left: { kind: "identifier", name: "userId" },
        right: { kind: "literal", value: { kind: "string", value: "" } },
      },
    ];

    const engine = new ManifestRuntimeEngine(
      ir,
      {
        user: { id: "user-1", role: "admin" },
        telemetry: { onCommandExecuted },
      },
      { requireValidProvenance: false }
    );

    await engine.createInstance("Task", { id: "task-1", status: "open" });

    // Pass empty userId to trigger guard failure
    const result = await engine.runCommand(
      "claim",
      { userId: "" },
      { entityName: "Task", instanceId: "task-1" }
    );

    expect(result.success).toBe(false);
    expect(onCommandExecuted).not.toHaveBeenCalled();
  });

  it("does NOT call onCommandExecuted when no events are emitted", async () => {
    const onCommandExecuted = vi.fn(async () => {});

    const ir = createMinimalIR();

    // Remove the emits from the command so it succeeds but emits nothing
    ir.commands[0].emits = [];

    const engine = new ManifestRuntimeEngine(
      ir,
      {
        user: { id: "user-1", role: "admin" },
        telemetry: { onCommandExecuted },
      },
      { requireValidProvenance: false }
    );

    await engine.createInstance("Task", { id: "task-1", status: "open" });

    const result = await engine.runCommand(
      "claim",
      { userId: "user-1" },
      { entityName: "Task", instanceId: "task-1" }
    );

    expect(result.success).toBe(true);
    expect(result.emittedEvents).toHaveLength(0);
    expect(onCommandExecuted).not.toHaveBeenCalled();
  });

  it("does NOT call onCommandExecuted when no telemetry is in context", async () => {
    const ir = createMinimalIR();

    // No telemetry in context at all
    const engine = new ManifestRuntimeEngine(
      ir,
      { user: { id: "user-1", role: "admin" } },
      { requireValidProvenance: false }
    );

    await engine.createInstance("Task", { id: "task-1", status: "open" });

    // Should not throw — just silently skip the hook
    const result = await engine.runCommand(
      "claim",
      { userId: "user-1" },
      { entityName: "Task", instanceId: "task-1" }
    );

    expect(result.success).toBe(true);
    expect(result.emittedEvents).toHaveLength(1);
  });

  it("preserves the original result even when the hook is called", async () => {
    const onCommandExecuted = vi.fn(async () => {});

    const ir = createMinimalIR();
    const engine = new ManifestRuntimeEngine(
      ir,
      {
        user: { id: "user-1", role: "admin" },
        telemetry: { onCommandExecuted },
      },
      { requireValidProvenance: false }
    );

    await engine.createInstance("Task", { id: "task-1", status: "open" });

    const result = await engine.runCommand(
      "claim",
      { userId: "user-1" },
      { entityName: "Task", instanceId: "task-1" }
    );

    // The result returned to the caller must be the same object the engine
    // produced — the hook must not mutate or replace it.
    expect(result.success).toBe(true);
    expect(result.emittedEvents[0].name).toBe("TaskClaimed");
    expect(result.emittedEvents[0].channel).toBe("task.claimed");

    // Verify the instance was actually mutated
    const instance = await engine.getInstance("Task", "task-1");
    expect(instance?.status).toBe("in_progress");
  });
});
