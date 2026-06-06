import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { RuntimeEngine } from "@angriff36/manifest";
import { compileToIR } from "@angriff36/manifest/ir-compiler";
import { beforeEach, describe, expect, it } from "vitest";
import { runManifestCommandCore } from "../run-manifest-command-core.js";

// ---------------------------------------------------------------------------
// Facility governance migration (Task 8.3) + Manifest↔Prisma drift reconciliation.
//
// WHY this matters (not just WHAT it does): `facilities/actions.ts` wrote
// `database.facility` directly (constitution §9 violation). The Manifest `Facility`
// entity was drifted — it declared phantom props (`type`/`address`/`zip`/`capacity`/
// `description`) that map to NO column on `tenant_facilities.facilities`, and was
// MISSING the real columns the UI writes (`code`/`facilityType`/`addressLine1`/
// `addressLine2`/`postalCode`/`country`). GenericPrismaStore maps a command's output
// instance to Prisma by camelCase irName, so the OLD command would have persisted a
// facility with the DB-default `facilityType` ("kitchen") and NULL address — silently
// dropping every value the form supplied. These tests pin the reconciled command
// contract so a regression that drops a field, renames a prop off the Prisma column,
// or re-introduces the self-transition `mutate status` (below) fails here.
//
// THE SELF-TRANSITION TRAP (regression guard): the old create did
// `mutate status = "active"`. `status` owns `transition status from "active" to
// [...]`, and the runtime validates EVERY `mutate` against transition rules without
// exempting no-op self-transitions ("active"→"active" is not in active's `to` list).
// So the governed create would have FAILED for the very default it was setting. The
// fix removes the mutate (the createInstance body seed sets status). The "create
// succeeds and status is active" assertion below is the regression guard.
//
// The inline SOURCE below MUST stay in sync with `manifest/source/
// facilities-all-rules.manifest`'s Facility entity. The registry assertion at the
// bottom ties this contract to the actually-compiled artifact so they cannot drift.
// ---------------------------------------------------------------------------

const SOURCE = `
entity Facility {
  key [tenantId, id]
  property required id: string
  property required tenantId: string
  property required name: string
  property code: string = ""
  property facilityType: string = "kitchen"
  property addressLine1: string = ""
  property addressLine2: string = ""
  property city: string = ""
  property state: string = ""
  property postalCode: string = ""
  property country: string = ""
  property phone: string = ""
  property status: string = "active"
  property notes: string = ""
  timestamps

  computed isActive: boolean = self.status == "active"
  computed isUnderMaintenance: boolean = self.status == "maintenance"

  constraint validFacilityType: self.facilityType in ["kitchen", "warehouse", "commissary", "office", "other"] "Invalid facility type"
  constraint validStatus: self.status in ["active", "inactive", "maintenance"] "Invalid facility status"

  transition status from "active" to ["inactive", "maintenance"]
  transition status from "maintenance" to ["active"]

  default policy FacilityDefaultAccess execute: user.role in ["facility_manager", "facilities_manager", "manager", "admin"] "Facilities management"

  command create(name: string, code: string, facilityType: string, addressLine1: string, addressLine2: string, city: string, state: string, postalCode: string, country: string, phone: string, notes: string) {
    guard name != null and name != "" "Facility name is required"
    guard facilityType in ["kitchen", "warehouse", "commissary", "office", "other"] "Invalid facility type"
    mutate name = name
    mutate code = code
    mutate facilityType = facilityType
    mutate addressLine1 = addressLine1
    mutate addressLine2 = addressLine2
    mutate city = city
    mutate state = state
    mutate postalCode = postalCode
    mutate country = country
    mutate phone = phone
    mutate notes = notes
    emit FacilityCreated
  }

  command edit(name: string, code: string, facilityType: string, addressLine1: string, addressLine2: string, city: string, state: string, postalCode: string, country: string, phone: string, notes: string) {
    guard name != null and name != "" "Facility name is required"
    mutate name = name
    mutate code = code
    mutate facilityType = facilityType
    mutate addressLine1 = addressLine1
    mutate addressLine2 = addressLine2
    mutate city = city
    mutate state = state
    mutate postalCode = postalCode
    mutate country = country
    mutate phone = phone
    mutate notes = notes
    emit FacilityUpdated
  }
}

event FacilityCreated: "facility.created" {
  facilityId: string
  tenantId: string
  name: string
  facilityType: string
  createdAt: datetime
}
event FacilityUpdated: "facility.updated" {
  facilityId: string
  name: string
  updatedAt: datetime
}
`;

// biome-ignore lint/suspicious/noExplicitAny: IR type is structural; engine accepts it.
let ir: any;

beforeEach(async () => {
  const result = await compileToIR(SOURCE);
  expect(result.ir).toBeTruthy();
  ir = result.ir;
});

const USER = { id: "u1", tenantId: "t1", role: "facility_manager" } as const;

function newEngine(): RuntimeEngine {
  // Role is required: FacilityDefaultAccess gates on `user.role in [...]`.
  return new RuntimeEngine(ir, {
    user: { id: USER.id, tenantId: USER.tenantId, role: USER.role },
  });
}

function fullCreateBody(overrides: Record<string, unknown> = {}) {
  return {
    name: "Main Kitchen",
    code: "MAIN-KIT",
    facilityType: "warehouse",
    addressLine1: "500 Industrial Way",
    addressLine2: "Dock 7",
    city: "Springfield",
    state: "IL",
    postalCode: "62701",
    country: "US",
    phone: "555-0142",
    notes: "Primary production site",
    ...overrides,
  };
}

async function createFacility(
  engine: RuntimeEngine,
  overrides: Record<string, unknown> = {}
) {
  return runManifestCommandCore(
    { createRuntime: async () => engine },
    {
      entity: "Facility",
      command: "create",
      body: fullCreateBody(overrides),
      user: { ...USER },
    }
  );
}

describe("Facility.create — governed write persists the reconciled column surface", () => {
  it("persists every real Prisma column, not the dropped legacy subset", async () => {
    const engine = newEngine();
    const result = await createFacility(engine);

    expect(result.ok).toBe(true);
    const id = result.ok ? (result.result as { id: string }).id : "";
    expect(id).toBeTruthy();

    const stored = (await engine.getInstance("Facility", id)) as Record<
      string,
      unknown
    >;
    // The exact fields the old drifted entity would have silently dropped or
    // mapped to a phantom (non-Prisma) property.
    expect(stored.code).toBe("MAIN-KIT");
    expect(stored.facilityType).toBe("warehouse");
    expect(stored.addressLine1).toBe("500 Industrial Way");
    expect(stored.addressLine2).toBe("Dock 7");
    expect(stored.city).toBe("Springfield");
    expect(stored.state).toBe("IL");
    expect(stored.postalCode).toBe("62701");
    expect(stored.country).toBe("US");
    expect(stored.phone).toBe("555-0142");
    expect(stored.notes).toBe("Primary production site");
  });

  it("defaults status to 'active' WITHOUT a self-transition failure (regression guard)", async () => {
    // If create re-introduces `mutate status = \"active\"`, the runtime rejects the
    // "active"→"active" self-transition and this create fails. Proving ok===true
    // AND status==="active" pins the fix.
    const engine = newEngine();
    const result = await createFacility(engine);
    expect(result.ok).toBe(true);
    const id = result.ok ? (result.result as { id: string }).id : "";
    const stored = (await engine.getInstance("Facility", id)) as Record<
      string,
      unknown
    >;
    expect(stored.status).toBe("active");
  });

  it("rejects a blank name (guard parity with the server action default)", async () => {
    const engine = newEngine();
    const result = await createFacility(engine, { name: "" });
    expect(result.ok).toBe(false);
  });

  it("rejects an out-of-vocabulary facilityType", async () => {
    const engine = newEngine();
    const result = await createFacility(engine, { facilityType: "spaceport" });
    expect(result.ok).toBe(false);
  });
});

describe("compiled command registry carries the Facility governed-write surface", () => {
  it("includes Facility.create and Facility.edit", () => {
    const registryPath = fileURLToPath(
      new URL("../../commands.registry.json", import.meta.url)
    );
    const registry = JSON.parse(readFileSync(registryPath, "utf8")) as {
      commandId: string;
    }[];
    const ids = new Set(registry.map((r) => r.commandId));
    expect(ids.has("Facility.create")).toBe(true);
    expect(ids.has("Facility.edit")).toBe(true);
  });
});
