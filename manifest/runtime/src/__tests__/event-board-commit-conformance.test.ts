/**
 * Event Tree Command Board — commit path conformance.
 *
 * WHY: The board commit path relies on three governed commands executing
 * correctly against the compiled IR:
 *   1. EventStaff.create — auto-creates and persists a new event_staff row
 *   2. CommandBoardCard.create — auto-persists a draft card with metadata envelope
 *   3. CommandBoardCard.update — flips the envelope to draftState "committed"
 *
 * The Manifest engine auto-instantiates ONLY commands named `create`
 * (runtime-engine.js: shouldAutoCreateInstance = commandName === 'create').
 * EventStaff.assign was create-semantics but never persisted a new row — a
 * silent no-op without an existing instance. Test A pins the fix: running
 * `create` with NO seeded row and NO instanceId must persist the row.
 *
 * An additional negative test pins the `validCardType` constraint that forced
 * the metadata-envelope design (i.e. "event-tree-draft" is NOT a valid cardType).
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Store } from "@angriff36/manifest";
import { describe, expect, it } from "vitest";
import { createCustomBuiltins } from "../manifest-builtins.js";
import { runManifestCommandCore } from "../run-manifest-command-core.js";
import { ManifestRuntimeEngine } from "../runtime-engine.js";

const here = dirname(fileURLToPath(import.meta.url));
const irPath = join(here, "..", "..", "..", "ir", "kitchen.ir.json");
// biome-ignore lint/suspicious/noExplicitAny: IR is structural JSON.
const ir: any = JSON.parse(readFileSync(irPath, "utf8"));

const TENANT = "t-board-commit";
const USER = { id: "u-board-commit", tenantId: TENANT, role: "admin" } as const;

const EVENT_ID = "evt-11111111-1111-1111-1111-111111111111";
const STAFF_MEMBER_ID = "staff-22222222-2222-2222-2222-222222222222";
const BOARD_ID = "board-33333333-3333-3333-3333-333333333333";
const ENTITY_ID = "user-44444444-4444-4444-4444-444444444444";

// Engine datetime contract = epoch milliseconds (runtime-engine validateDateTimeTypes:
// `typeof value === 'number'`). ISO strings are REJECTED with E_TYPE_DATETIME at create
// validation — callers must Date.parse() before building command bodies.
const SHIFT_START = Date.parse("2026-06-28T16:00:00.000Z");
const SHIFT_END = Date.parse("2026-06-28T23:00:00.000Z");

const DRAFT_METADATA = JSON.stringify({
  eventBoardDraft: {
    draftAction: {
      kind: "assign-staff",
      entityType: "User",
      entityId: ENTITY_ID,
      params: {
        role: "server",
        shiftStart: "2026-06-28T16:00:00.000Z",
        shiftEnd: "2026-06-28T23:00:00.000Z",
      },
    },
    draftState: "draft",
    committedRecordId: null,
  },
});

const COMMITTED_METADATA = JSON.stringify({
  eventBoardDraft: {
    draftAction: {
      kind: "assign-staff",
      entityType: "User",
      entityId: ENTITY_ID,
      params: {
        role: "server",
        shiftStart: "2026-06-28T16:00:00.000Z",
        shiftEnd: "2026-06-28T23:00:00.000Z",
      },
    },
    draftState: "committed",
    committedRecordId: "es-1",
  },
});

class Mem implements Store {
  private readonly items = new Map<string, Record<string, unknown>>();
  // biome-ignore lint/suspicious/noExplicitAny: structural rows.
  async getAll(): Promise<any[]> {
    return Array.from(this.items.values()) as never;
  }
  // biome-ignore lint/suspicious/noExplicitAny: structural rows.
  async getById(id: string): Promise<any> {
    return this.items.get(id) as never;
  }
  // biome-ignore lint/suspicious/noExplicitAny: structural rows.
  async create(data: any): Promise<any> {
    const id = (data.id as string) ?? crypto.randomUUID();
    const row = { ...data, id };
    this.items.set(id, row);
    return row as never;
  }
  // biome-ignore lint/suspicious/noExplicitAny: structural rows.
  async update(id: string, data: any): Promise<any> {
    const existing = this.items.get(id);
    if (!existing) return undefined as never;
    const row = { ...existing, ...data, id };
    this.items.set(id, row);
    return row as never;
  }
  async delete(id: string): Promise<boolean> {
    return this.items.delete(id);
  }
  async clear(): Promise<void> {
    this.items.clear();
  }
}

function makeProvider(): (entity: string) => Store & { getAll(): Promise<Record<string, unknown>[]> } {
  const stores = new Map<string, Mem>();
  return (entity: string) => {
    let store = stores.get(entity);
    if (!store) {
      store = new Mem();
      stores.set(entity, store);
    }
    return store;
  };
}

describe("Event board commit path — IR conformance", () => {
  it("Test A: EventStaff.create auto-creates and persists the row with status 'assigned'", async () => {
    // No seeded row and no instanceId: the engine must auto-instantiate
    // (shouldAutoCreateInstance fires only for commands named `create`) and
    // persist the new row. status is NOT mutated by the command — the body
    // seed applies the schema default "assigned" (mutating it would trip the
    // no-op self-transition bug on the status state machine).
    const provider = makeProvider();
    const engine = new ManifestRuntimeEngine(
      ir,
      { tenantId: USER.tenantId, user: { id: USER.id, tenantId: USER.tenantId, role: USER.role } },
      { storeProvider: provider, customBuiltins: createCustomBuiltins() },
    );

    const result = await runManifestCommandCore(
      { createRuntime: async () => engine },
      {
        entity: "EventStaff",
        command: "create",
        body: {
          eventId: EVENT_ID,
          staffMemberId: STAFF_MEMBER_ID,
          role: "server",
          notes: "",
          shiftStart: SHIFT_START,
          shiftEnd: SHIFT_END,
        },
        user: { ...USER },
      },
    );

    expect(result.ok, result.ok ? "" : (result as { message?: string }).message).toBe(true);

    // The result must carry the created instance id.
    const created = result.ok ? (result.result as { id?: string }) : null;
    expect(created?.id).toBeTruthy();

    // Read back the persisted row via the store: the engine auto-created it.
    const rows = await provider("EventStaff").getAll();
    expect(rows).toHaveLength(1);
    const stored = rows[0];
    expect(stored?.id).toBe(created?.id);
    expect(stored?.status).toBe("assigned");
    expect(stored?.staffMemberId).toBe(STAFF_MEMBER_ID);
    expect(stored?.eventId).toBe(EVENT_ID);
    expect(stored?.role).toBe("server");
  });

  it("Test B: CommandBoardCard.create draft then update flips draftState to 'committed'", async () => {
    const provider = makeProvider();
    const engine = new ManifestRuntimeEngine(
      ir,
      { tenantId: USER.tenantId, user: { id: USER.id, tenantId: USER.tenantId, role: USER.role } },
      { storeProvider: provider, customBuiltins: createCustomBuiltins() },
    );

    // Step 1: Create the draft card — engine auto-persists for `create` commands
    const createResult = await runManifestCommandCore(
      { createRuntime: async () => engine },
      {
        entity: "CommandBoardCard",
        command: "create",
        body: {
          boardId: BOARD_ID,
          title: "Maria R.",
          content: "",
          cardType: "entity",
          status: "pending",
          positionX: 0,
          positionY: 0,
          width: 200,
          height: 150,
          color: "#6366f1",
          metadata: DRAFT_METADATA,
          groupId: "",
          entityId: ENTITY_ID,
          entityType: "User",
        },
        user: { ...USER },
      },
    );

    expect(createResult.ok, createResult.ok ? "" : (createResult as { message?: string }).message).toBe(true);

    // result.result carries { id } for a create
    const createdCard = createResult.ok ? (createResult.result as { id: string }) : null;
    expect(createdCard?.id).toBeTruthy();
    const cardId = createdCard!.id;

    // Step 2: Update the card — flip draftState to "committed"
    const updateResult = await runManifestCommandCore(
      { createRuntime: async () => engine },
      {
        entity: "CommandBoardCard",
        command: "update",
        body: {
          newTitle: "Maria R.",
          newContent: "",
          newCardType: "entity",
          newStatus: "pending",
          newColor: "#6366f1",
          newGroupId: "",
          newMetadata: COMMITTED_METADATA,
        },
        user: { ...USER },
        instanceId: cardId,
      },
    );

    expect(updateResult.ok, updateResult.ok ? "" : (updateResult as { message?: string }).message).toBe(true);

    // Read back from the store to verify persisted state
    const cards = await provider("CommandBoardCard").getAll();
    expect(cards).toHaveLength(1);
    const stored = cards[0];

    // Verify the metadata envelope was flipped to draftState "committed"
    const parsed = JSON.parse(stored!.metadata as string);
    expect(parsed.eventBoardDraft.draftState).toBe("committed");
    expect(parsed.eventBoardDraft.committedRecordId).toBe("es-1");

    // Verify the status and cardType block constraints are untouched by the flip
    expect(stored?.status).toBe("pending");
    expect(stored?.cardType).toBe("entity");
  });

  it("Test C: CommandBoardCard.create rejects cardType 'event-tree-draft' (validCardType block)", async () => {
    const provider = makeProvider();
    const engine = new ManifestRuntimeEngine(
      ir,
      { tenantId: USER.tenantId, user: { id: USER.id, tenantId: USER.tenantId, role: USER.role } },
      { storeProvider: provider, customBuiltins: createCustomBuiltins() },
    );

    const result = await runManifestCommandCore(
      { createRuntime: async () => engine },
      {
        entity: "CommandBoardCard",
        command: "create",
        body: {
          boardId: BOARD_ID,
          title: "Draft Card",
          content: "",
          cardType: "event-tree-draft",
          status: "pending",
          positionX: 0,
          positionY: 0,
          width: 200,
          height: 150,
          color: "#6366f1",
          metadata: "{}",
          groupId: "",
          entityId: ENTITY_ID,
          entityType: "User",
        },
        user: { ...USER },
      },
    );

    expect(result.ok).toBe(false);
    // Expect the validCardType block constraint to be the cause
    const failure = result as {
      kind?: string;
      constraintOutcomes?: Array<{ code?: string; passed?: boolean }>;
    };
    expect(failure.kind).toBe("constraint_blocked");
    const blockedConstraint = failure.constraintOutcomes?.find(
      (o) => !o.passed && o.code === "validCardType",
    );
    expect(blockedConstraint).toBeDefined();
  });
});
