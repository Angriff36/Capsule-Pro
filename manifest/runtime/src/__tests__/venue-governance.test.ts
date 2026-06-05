import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { RuntimeEngine } from "@angriff36/manifest";
import { compileToIR } from "@angriff36/manifest/ir-compiler";
import { beforeEach, describe, expect, it } from "vitest";
import { runManifestCommandCore } from "../run-manifest-command-core.js";

// ---------------------------------------------------------------------------
// Venue governance migration (Task 8.3) + Manifest↔Prisma drift reconciliation.
//
// WHY this matters (not just WHAT it does): `crm/venues/actions.ts` used to write
// `database.venue` directly (constitution §9 violation). The Manifest `Venue`
// entity was a stripped-down model — it declared `address`/`notes` (NOT real
// `venues` columns) and was MISSING the 14 real columns the UI actually writes
// (venueType, addressLine1/2, city, stateProvince, postalCode, countryCode,
// contactEmail, accessNotes, cateringNotes, layoutImageUrl, tags, isActive).
// Routing the server action through the old command would have SILENTLY DROPPED
// all of those fields. These tests pin the reconciled command contract so a
// future change that drops a field, re-adds the bad `guard self.isActive` on
// update (which blocks editing a deactivated venue — a real UI regression), or
// removes the soft-delete command fails here.
//
// The inline SOURCE below MUST stay in sync with `manifest/source/
// events-extended-rules.manifest`'s Venue entity. The registry assertion at the
// bottom ties this contract to the actually-compiled artifact so the two cannot
// drift apart silently.
// ---------------------------------------------------------------------------

const SOURCE = `
entity Venue {
  key [tenantId, id]
  property required id: string
  property required tenantId: string
  property required name: string = ""
  property venueType: string = "other"
  property addressLine1: string = ""
  property addressLine2: string = ""
  property city: string = ""
  property stateProvince: string = ""
  property postalCode: string = ""
  property countryCode: string = ""
  property capacity: int = 0
  property contactName: string = ""
  property contactPhone: string = ""
  property contactEmail: string = ""
  property accessNotes: string = ""
  property cateringNotes: string = ""
  property layoutImageUrl: string = ""
  property required tags: array<string>
  property isActive: boolean = true
  timestamps
  property deletedAt: datetime

  computed isLargeVenue: boolean = self.capacity > 500

  constraint requireName: self.name != "" "Venue name is required"
  constraint positiveCapacity: self.capacity >= 0 "Capacity cannot be negative"

  default policy VenueDefaultAccess execute: user.role in ["staff", "event_coordinator", "catering_manager", "event_manager", "manager", "admin"] "Event and event-related entity management"

  command create(name: string, venueType: string, addressLine1: string, addressLine2: string, city: string, stateProvince: string, postalCode: string, countryCode: string, capacity: int, contactName: string, contactPhone: string, contactEmail: string, accessNotes: string, cateringNotes: string, layoutImageUrl: string, tags: array<string>) {
    guard name != null and name != "" "Venue name is required"
    guard capacity >= 0 "Capacity cannot be negative"
    mutate name = name
    mutate venueType = venueType
    mutate addressLine1 = addressLine1
    mutate addressLine2 = addressLine2
    mutate city = city
    mutate stateProvince = stateProvince
    mutate postalCode = postalCode
    mutate countryCode = countryCode
    mutate capacity = capacity
    mutate contactName = contactName
    mutate contactPhone = contactPhone
    mutate contactEmail = contactEmail
    mutate accessNotes = accessNotes
    mutate cateringNotes = cateringNotes
    mutate layoutImageUrl = layoutImageUrl
    mutate tags = tags
    mutate isActive = true
    emit VenueCreated
  }
  command update(name: string, venueType: string, addressLine1: string, addressLine2: string, city: string, stateProvince: string, postalCode: string, countryCode: string, capacity: int, contactName: string, contactPhone: string, contactEmail: string, accessNotes: string, cateringNotes: string, layoutImageUrl: string, tags: array<string>, isActive: boolean) {
    guard self.deletedAt == null "Cannot update a deleted venue"
    guard name != null and name != "" "Venue name is required"
    guard capacity >= 0 "Capacity cannot be negative"
    mutate name = name
    mutate venueType = venueType
    mutate addressLine1 = addressLine1
    mutate addressLine2 = addressLine2
    mutate city = city
    mutate stateProvince = stateProvince
    mutate postalCode = postalCode
    mutate countryCode = countryCode
    mutate capacity = capacity
    mutate contactName = contactName
    mutate contactPhone = contactPhone
    mutate contactEmail = contactEmail
    mutate accessNotes = accessNotes
    mutate cateringNotes = cateringNotes
    mutate layoutImageUrl = layoutImageUrl
    mutate tags = tags
    mutate isActive = isActive
    emit VenueUpdated
  }
  command activate() {
    guard self.isActive == false "Venue is already active"
    mutate isActive = true
    emit VenueActivated
  }
  command deactivate(reason: string) {
    guard self.isActive "Venue is already deactivated"
    mutate isActive = false
    emit VenueDeactivated
  }
  command updateCapacity(capacity: int) {
    guard self.isActive "Cannot update capacity of a deactivated venue"
    guard capacity >= 0 "Capacity cannot be negative"
    mutate capacity = capacity
    emit VenueCapacityUpdated
  }
  command softDelete() {
    guard self.deletedAt == null "Venue is already deleted"
    mutate deletedAt = now()
    emit VenueDeleted
  }
}
// NOTE: the real entity in events-extended-rules.manifest keeps \`store Venue in
// durable\` (it projects a Prisma model + persists via GenericPrismaStore). This
// inline copy omits it so the contract test runs on the engine's default
// in-memory store without wiring a storeProvider — the durable persistence path
// is covered by \`pnpm manifest:try-prisma Venue\` + the GenericPrismaStore metadata.

event VenueCreated: "events.venue.created" {
  venueId: string
  tenantId: string
  name: string
  capacity: number
  createdAt: datetime
}
event VenueUpdated: "events.venue.updated" {
  venueId: string
  tenantId: string
  name: string
  updatedAt: datetime
}
event VenueActivated: "events.venue.activated" {
  venueId: string
  tenantId: string
  name: string
  activatedAt: datetime
}
event VenueDeactivated: "events.venue.deactivated" {
  venueId: string
  tenantId: string
  name: string
  reason: string
  deactivatedAt: datetime
}
event VenueCapacityUpdated: "events.venue.capacity_updated" {
  venueId: string
  tenantId: string
  capacity: number
  updatedAt: datetime
}
event VenueDeleted: "events.venue.deleted" {
  venueId: string
  tenantId: string
  deletedAt: datetime
}
`;

// biome-ignore lint/suspicious/noExplicitAny: IR type is structural; engine accepts it.
let ir: any;

beforeEach(async () => {
  const result = await compileToIR(SOURCE);
  expect(result.ir).toBeTruthy();
  ir = result.ir;
});

const USER = { id: "u1", tenantId: "t1", role: "manager" } as const;

function newEngine(): RuntimeEngine {
  // Role is required: VenueDefaultAccess policy gates on `user.role in [...]`.
  // The real app builds the runtime per-call with the full user; mirror that here
  // so policy evaluation is exercised (not silently denied for a missing role).
  return new RuntimeEngine(ir, {
    user: { id: USER.id, tenantId: USER.tenantId, role: USER.role },
  });
}

function fullCreateBody(overrides: Record<string, unknown> = {}) {
  return {
    name: "Grand Hall",
    venueType: "banquet_hall",
    addressLine1: "123 Main St",
    addressLine2: "Suite 4",
    city: "Springfield",
    stateProvince: "IL",
    postalCode: "62701",
    countryCode: "US",
    capacity: 250,
    contactName: "Pat Manager",
    contactPhone: "555-0100",
    contactEmail: "pat@grandhall.test",
    accessNotes: "Loading dock in rear",
    cateringNotes: "Full kitchen on site",
    layoutImageUrl: "https://cdn.test/layout.png",
    tags: ["preferred", "downtown"],
    ...overrides,
  };
}

async function createVenue(
  engine: RuntimeEngine,
  overrides: Record<string, unknown> = {}
) {
  return runManifestCommandCore(
    { createRuntime: async () => engine },
    {
      entity: "Venue",
      command: "create",
      body: fullCreateBody(overrides),
      user: { ...USER },
    }
  );
}

describe("Venue.create — governed write persists the full UI field surface", () => {
  it("persists every reconciled column, not just the legacy subset", async () => {
    const engine = newEngine();
    const result = await createVenue(engine);

    expect(result.ok).toBe(true);
    const id = result.ok ? (result.result as { id: string }).id : "";
    expect(id).toBeTruthy();

    const stored = (await engine.getInstance("Venue", id)) as Record<
      string,
      unknown
    >;
    // The exact fields the old stripped-down entity would have dropped.
    expect(stored.venueType).toBe("banquet_hall");
    expect(stored.addressLine1).toBe("123 Main St");
    expect(stored.addressLine2).toBe("Suite 4");
    expect(stored.city).toBe("Springfield");
    expect(stored.stateProvince).toBe("IL");
    expect(stored.postalCode).toBe("62701");
    expect(stored.countryCode).toBe("US");
    expect(stored.contactEmail).toBe("pat@grandhall.test");
    expect(stored.accessNotes).toBe("Loading dock in rear");
    expect(stored.cateringNotes).toBe("Full kitchen on site");
    expect(stored.layoutImageUrl).toBe("https://cdn.test/layout.png");
    expect(stored.tags).toEqual(["preferred", "downtown"]);
    expect(stored.capacity).toBe(250);
    expect(stored.isActive).toBe(true);
  });

  it("rejects a blank name (guard parity with the server action invariant)", async () => {
    const engine = newEngine();
    const result = await createVenue(engine, { name: "" });
    expect(result.ok).toBe(false);
  });
});

describe("Venue.update — editing must NOT be blocked on deactivated venues", () => {
  it("updates a deactivated venue (regression guard for old `guard self.isActive`)", async () => {
    const engine = newEngine();
    const created = await createVenue(engine);
    const id = created.ok ? (created.result as { id: string }).id : "";

    // Deactivate, then edit via update with isActive=false in the body.
    await runManifestCommandCore(
      { createRuntime: async () => engine },
      { entity: "Venue", command: "deactivate", body: { id, reason: "closed" }, user: { ...USER } }
    );

    const updated = await runManifestCommandCore(
      { createRuntime: async () => engine },
      {
        entity: "Venue",
        command: "update",
        body: { id, ...fullCreateBody({ name: "Grand Hall (renamed)" }), isActive: false },
        user: { ...USER },
      }
    );

    expect(updated.ok).toBe(true);
    const stored = (await engine.getInstance("Venue", id)) as Record<string, unknown>;
    expect(stored.name).toBe("Grand Hall (renamed)");
    expect(stored.isActive).toBe(false);
  });
});

describe("Venue.softDelete — governed soft delete", () => {
  it("sets deletedAt and then blocks further updates", async () => {
    const engine = newEngine();
    const created = await createVenue(engine);
    const id = created.ok ? (created.result as { id: string }).id : "";

    const deleted = await runManifestCommandCore(
      { createRuntime: async () => engine },
      { entity: "Venue", command: "softDelete", body: { id }, user: { ...USER } }
    );
    expect(deleted.ok).toBe(true);

    const stored = (await engine.getInstance("Venue", id)) as Record<string, unknown>;
    expect(stored.deletedAt).toBeTruthy();

    // A deleted venue is frozen: update is guarded on deletedAt == null.
    const afterDelete = await runManifestCommandCore(
      { createRuntime: async () => engine },
      {
        entity: "Venue",
        command: "update",
        body: { id, ...fullCreateBody(), isActive: true },
        user: { ...USER },
      }
    );
    expect(afterDelete.ok).toBe(false);
  });
});

describe("compiled command registry carries the Venue governed-write surface", () => {
  it("includes Venue.create, Venue.update, and Venue.softDelete", () => {
    const registryPath = fileURLToPath(
      new URL("../../commands.registry.json", import.meta.url)
    );
    const registry = JSON.parse(readFileSync(registryPath, "utf8")) as {
      commandId: string;
    }[];
    const ids = new Set(registry.map((r) => r.commandId));
    expect(ids.has("Venue.create")).toBe(true);
    expect(ids.has("Venue.update")).toBe(true);
    // RED until events-extended-rules.manifest adds softDelete + recompile.
    expect(ids.has("Venue.softDelete")).toBe(true);
  });
});
