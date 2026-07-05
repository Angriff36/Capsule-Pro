import { RuntimeEngine } from "@angriff36/manifest";
import { compileToIR } from "@angriff36/manifest/ir-compiler";
import { beforeEach, describe, expect, it } from "vitest";
import { resolveParentContext } from "../parent-context-resolver.js";
import { runManifestCommandCore } from "../run-manifest-command-core.js";

// ---------------------------------------------------------------------------
// Parent-context propagation: a child created from a parent must inherit the
// parent-owned fields it declares but does NOT accept as create-command input,
// so callers supply only the parent id + child-specific overrides.
//
// WHY this matters (not just WHAT it does): if a child create silently drops
// parent context, every downstream surface (board, sheet, forecast) drifts from
// the Event and users re-type the same date/client/venue/guest data. These
// tests pin the inheritance contract so a future change that stops copying a
// field, or starts demanding it as user input, fails here.
// ---------------------------------------------------------------------------

const EVENT_DATE = 1_750_000_000_000;

// Event (parent) owns context; BattleBoard (child) declares snapshot fields that
// mirror the parent by name+type but are NOT create params — only inheritance
// can populate them. `notes`/`tags` ARE board create params (board-specific
// user input) and must therefore NEVER be inherited even though Event has them.
const SOURCE = `
entity Event {
  property required id: string
  property required tenantId: string
  property clientId: string = ""
  property eventDate: datetime
  property guestCount: int = 0
  property venueName: string = ""
  property venueAddress: string = ""
  property locationId: string = ""
  property notes: string = ""
  property tags: string[] = []
  property status: string = "confirmed"

  command create(id: string, clientId: string) {
    mutate clientId = clientId
  }
}

entity BattleBoard {
  property required id: string
  property required tenantId: string
  property eventId: string = ""
  property boardName: string = ""
  property boardType: string = "event-specific"
  property notes: string = ""
  property tags: string = ""
  property status: string = "draft"
  property eventDate: datetime
  property clientId: string = ""
  property guestCount: int = 0
  property venueName: string = ""
  property venueAddress: string = ""
  property locationId: string = ""
  property inheritedContext: string = "{}"

  relationship belongsTo event: Event fields [tenantId, eventId] references [tenantId, id]

  command create(boardName: string, boardType: string, eventId: string, notes: string, tags: string) {
    mutate boardName = boardName
    mutate boardType = boardType
    mutate eventId = eventId
    mutate notes = notes
    mutate tags = tags
    mutate status = "draft"
  }
}
`;

// biome-ignore lint/suspicious/noExplicitAny: IR type is structural; engine accepts it.
let ir: any;

beforeEach(async () => {
  const result = await compileToIR(SOURCE);
  expect(result.ir).toBeTruthy();
  ir = result.ir;
});

function newEngine(): RuntimeEngine {
  return new RuntimeEngine(ir, { user: { id: "u1", tenantId: "t1" } });
}

async function seedEvent(
  engine: RuntimeEngine,
  overrides: Record<string, unknown> = {}
): Promise<void> {
  await engine.createInstance("Event", {
    id: "e1",
    tenantId: "t1",
    clientId: "client-123",
    eventDate: EVENT_DATE,
    guestCount: 150,
    venueName: "Grand Hall",
    venueAddress: "123 Main St",
    locationId: "loc-9",
    notes: "event-level notes",
    status: "confirmed",
    ...overrides,
  } as never);
}

describe("resolveParentContext — direct enrichment", () => {
  it("fills parent-owned snapshot fields from only the FK", async () => {
    const engine = newEngine();
    await seedEvent(engine);

    const { body, inheritedFields } = await resolveParentContext(engine, {
      entity: "BattleBoard",
      command: "create",
      body: {
        boardName: "Smith Wedding Board",
        boardType: "event-specific",
        eventId: "e1",
      },
    });

    expect(body.eventDate).toBe(EVENT_DATE);
    expect(body.clientId).toBe("client-123");
    expect(body.guestCount).toBe(150);
    expect(body.venueName).toBe("Grand Hall");
    expect(body.venueAddress).toBe("123 Main St");
    expect(body.locationId).toBe("loc-9");
    expect(inheritedFields.sort()).toEqual(
      [
        "clientId",
        "eventDate",
        "guestCount",
        "locationId",
        "venueAddress",
        "venueName",
      ].sort()
    );

    // Source metadata is recorded for drift prevention.
    const ctx = JSON.parse(String(body.inheritedContext));
    expect(ctx.source).toBe("Event");
    expect(ctx.fk).toBe("eventId");
    expect(ctx.parentId).toBe("e1");
    expect(ctx.fields.sort()).toEqual(inheritedFields.sort());
  });

  it("never inherits fields the child exposes as create params (board-specific input)", async () => {
    const engine = newEngine();
    await seedEvent(engine);

    const { body, inheritedFields } = await resolveParentContext(engine, {
      entity: "BattleBoard",
      command: "create",
      body: { boardName: "B", boardType: "event-specific", eventId: "e1" },
    });

    // `notes` and `tags` are board create params -> user-facing, not inherited,
    // even though Event also declares `notes`.
    expect(body.notes).toBeUndefined();
    expect(inheritedFields).not.toContain("notes");
    expect(inheritedFields).not.toContain("tags");
    // lifecycle field is the child's own, never inherited
    expect(inheritedFields).not.toContain("status");
  });

  it("treats parent values as defaults — a child-supplied value wins (override)", async () => {
    const engine = newEngine();
    await seedEvent(engine);

    const { body, inheritedFields } = await resolveParentContext(engine, {
      entity: "BattleBoard",
      command: "create",
      body: { boardName: "B", eventId: "e1", guestCount: 999 },
    });

    expect(body.guestCount).toBe(999);
    expect(inheritedFields).not.toContain("guestCount");
  });

  it("skips empty parent values (no silent blanks copied onto the child)", async () => {
    const engine = newEngine();
    await seedEvent(engine, { clientId: "", venueName: "" });

    const { body, inheritedFields } = await resolveParentContext(engine, {
      entity: "BattleBoard",
      command: "create",
      body: { boardName: "B", eventId: "e1" },
    });

    expect(body.clientId).toBeUndefined();
    expect(body.venueName).toBeUndefined();
    expect(inheritedFields).not.toContain("clientId");
    expect(inheritedFields).not.toContain("venueName");
    // a non-empty field still inherits
    expect(body.guestCount).toBe(150);
  });

  it("is a no-op for non-create commands", async () => {
    const engine = newEngine();
    await seedEvent(engine);

    const { body, inheritedFields } = await resolveParentContext(engine, {
      entity: "BattleBoard",
      command: "update",
      body: { eventId: "e1" },
    });

    expect(inheritedFields).toEqual([]);
    expect(body.eventDate).toBeUndefined();
  });

  it("is a no-op when the FK is absent (manual board with no event)", async () => {
    const engine = newEngine();
    await seedEvent(engine);

    const { body, inheritedFields } = await resolveParentContext(engine, {
      entity: "BattleBoard",
      command: "create",
      body: { boardName: "Standalone" },
    });

    expect(inheritedFields).toEqual([]);
    expect(body.clientId).toBeUndefined();
  });
});

describe("run-manifest-command-core — create inherits parent context end-to-end", () => {
  it("persists inherited fields when creating with only eventId + board name", async () => {
    const engine = newEngine();
    await seedEvent(engine);

    const result = await runManifestCommandCore(
      { createRuntime: async () => engine },
      {
        entity: "BattleBoard",
        command: "create",
        body: {
          boardName: "Smith Wedding Board",
          boardType: "event-specific",
          eventId: "e1",
          description: "",
          isTemplate: false,
          notes: "",
          tags: [],
        },
        user: { id: "u1", tenantId: "t1", role: "manager" },
      }
    );

    expect(result.ok).toBe(true);
    const created = result.ok ? (result.result as { id: string }) : undefined;
    expect(created?.id).toBeTruthy();

    const stored = (await engine.getInstance("BattleBoard", created!.id)) as
      | Record<string, unknown>
      | undefined;
    expect(stored?.eventId).toBe("e1");
    expect(stored?.eventDate).toBe(EVENT_DATE);
    expect(stored?.clientId).toBe("client-123");
    expect(stored?.guestCount).toBe(150);
    expect(stored?.venueName).toBe("Grand Hall");
    const ctx = JSON.parse(String(stored?.inheritedContext ?? "{}"));
    expect(ctx.source).toBe("Event");
  });
});
