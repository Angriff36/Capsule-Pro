/**
 * Sample Data governance tests.
 *
 * Verifies:
 * - SampleData entity exists in compiled IR with seed/clear/reseed commands
 * - seed command succeeds and emits SampleDataSeeded event
 * - seed command is idempotent (guard rejects when already seeded)
 * - clear command succeeds and emits SampleDataCleared event
 * - clear command rejects when no sample data exists
 * - reseed command succeeds and emits SampleDataReseeded event
 *
 * These tests use the ManifestRuntimeEngine directly with the compiled IR
 * to prove the manifest commands enforce the correct invariants.
 *
 * @vitest-environment node
 */

import { describe, expect, it } from "vitest";
import { loadPrecompiledIR } from "../src/runtime/loadManifests";
import { ManifestRuntimeEngine } from "../src/runtime-engine";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function loadSampleDataIR() {
  const { ir } = loadPrecompiledIR(
    "packages/manifest-ir/ir/kitchen/kitchen.ir.json"
  );
  return ir;
}

function createEngine(ir: ReturnType<typeof loadSampleDataIR>) {
  return new ManifestRuntimeEngine(
    ir,
    {
      user: { id: "user-admin", role: "admin", tenantId: "tenant-1" },
    },
    { requireValidProvenance: false }
  );
}

const INSTANCE_ID = "sample-data-tenant-1";

// ---------------------------------------------------------------------------
// IR structure tests
// ---------------------------------------------------------------------------

describe("SampleData IR structure", () => {
  it("SampleData entity exists in compiled IR", () => {
    const ir = loadSampleDataIR();
    const entity = ir.entities?.find((e) => e.name === "SampleData");
    expect(entity).toBeDefined();
  });

  it("SampleData has seed, clear, and reseed commands", () => {
    const ir = loadSampleDataIR();
    const entity = ir.entities?.find((e) => e.name === "SampleData");
    expect(entity?.commands).toContain("seed");
    expect(entity?.commands).toContain("clear");
    expect(entity?.commands).toContain("reseed");
  });

  it("IR has SampleDataSeeded event definition", () => {
    const ir = loadSampleDataIR();
    const event = ir.events?.find((e) => e.name === "SampleDataSeeded");
    expect(event).toBeDefined();
    expect(event?.channel).toBe("tenant.sampledata.seeded");
  });

  it("IR has SampleDataCleared event definition", () => {
    const ir = loadSampleDataIR();
    const event = ir.events?.find((e) => e.name === "SampleDataCleared");
    expect(event).toBeDefined();
    expect(event?.channel).toBe("tenant.sampledata.cleared");
  });

  it("IR has SampleDataReseeded event definition", () => {
    const ir = loadSampleDataIR();
    const event = ir.events?.find((e) => e.name === "SampleDataReseeded");
    expect(event).toBeDefined();
    expect(event?.channel).toBe("tenant.sampledata.reseeded");
  });
});

// ---------------------------------------------------------------------------
// Command execution tests
// ---------------------------------------------------------------------------

describe("SampleData seed command", () => {
  it("succeeds and emits SampleDataSeeded event", async () => {
    const ir = loadSampleDataIR();
    const engine = createEngine(ir);

    // Create an unseeded instance
    await engine.createInstance("SampleData", {
      id: INSTANCE_ID,
      tenantId: "tenant-1",
      isSeeded: false,
      seededAt: 0,
      clearedAt: 0,
      eventsCreated: 0,
      clientsCreated: 0,
      usersCreated: 0,
      recipesCreated: 0,
    });

    const result = await engine.runCommand(
      "seed",
      { requestedBy: "user-admin" },
      { entityName: "SampleData", instanceId: INSTANCE_ID }
    );

    expect(result.success).toBe(true);
    expect(result.emittedEvents).toBeDefined();
    expect(result.emittedEvents!.length).toBeGreaterThanOrEqual(1);

    const seedEvent = result.emittedEvents!.find(
      (e) => e.name === "SampleDataSeeded"
    );
    expect(seedEvent).toBeDefined();
  });

  it("rejects when already seeded (idempotency guard)", async () => {
    const ir = loadSampleDataIR();
    const engine = createEngine(ir);

    // Create an already-seeded instance
    await engine.createInstance("SampleData", {
      id: INSTANCE_ID,
      tenantId: "tenant-1",
      isSeeded: true,
      seededAt: Date.now(),
      clearedAt: 0,
      eventsCreated: 2,
      clientsCreated: 1,
      usersCreated: 3,
      recipesCreated: 1,
    });

    const result = await engine.runCommand(
      "seed",
      { requestedBy: "user-admin" },
      { entityName: "SampleData", instanceId: INSTANCE_ID }
    );

    expect(result.success).toBe(false);
    // Guard failure: "Sample data already exists for this tenant"
    expect(result.guardFailure).toBeDefined();
  });

  it("rejects when requestedBy is empty", async () => {
    const ir = loadSampleDataIR();
    const engine = createEngine(ir);

    await engine.createInstance("SampleData", {
      id: INSTANCE_ID,
      tenantId: "tenant-1",
      isSeeded: false,
      seededAt: 0,
      clearedAt: 0,
      eventsCreated: 0,
      clientsCreated: 0,
      usersCreated: 0,
      recipesCreated: 0,
    });

    const result = await engine.runCommand(
      "seed",
      { requestedBy: "" },
      { entityName: "SampleData", instanceId: INSTANCE_ID }
    );

    expect(result.success).toBe(false);
    expect(result.guardFailure).toBeDefined();
  });
});

describe("SampleData clear command", () => {
  it("succeeds and emits SampleDataCleared event", async () => {
    const ir = loadSampleDataIR();
    const engine = createEngine(ir);

    // Create a seeded instance
    await engine.createInstance("SampleData", {
      id: INSTANCE_ID,
      tenantId: "tenant-1",
      isSeeded: true,
      seededAt: Date.now(),
      clearedAt: 0,
      eventsCreated: 2,
      clientsCreated: 1,
      usersCreated: 3,
      recipesCreated: 1,
    });

    const result = await engine.runCommand(
      "clear",
      { requestedBy: "user-admin", reason: "User requested" },
      { entityName: "SampleData", instanceId: INSTANCE_ID }
    );

    expect(result.success).toBe(true);
    expect(result.emittedEvents).toBeDefined();

    const clearEvent = result.emittedEvents!.find(
      (e) => e.name === "SampleDataCleared"
    );
    expect(clearEvent).toBeDefined();
  });

  it("rejects when no sample data exists", async () => {
    const ir = loadSampleDataIR();
    const engine = createEngine(ir);

    // Create an unseeded instance
    await engine.createInstance("SampleData", {
      id: INSTANCE_ID,
      tenantId: "tenant-1",
      isSeeded: false,
      seededAt: 0,
      clearedAt: 0,
      eventsCreated: 0,
      clientsCreated: 0,
      usersCreated: 0,
      recipesCreated: 0,
    });

    const result = await engine.runCommand(
      "clear",
      { requestedBy: "user-admin", reason: "User requested" },
      { entityName: "SampleData", instanceId: INSTANCE_ID }
    );

    expect(result.success).toBe(false);
    // Guard failure: "No sample data to clear"
    expect(result.guardFailure).toBeDefined();
  });
});

describe("SampleData reseed command", () => {
  it("succeeds and emits SampleDataReseeded event", async () => {
    const ir = loadSampleDataIR();
    const engine = createEngine(ir);

    // Reseed works regardless of current state
    await engine.createInstance("SampleData", {
      id: INSTANCE_ID,
      tenantId: "tenant-1",
      isSeeded: true,
      seededAt: Date.now(),
      clearedAt: 0,
      eventsCreated: 2,
      clientsCreated: 1,
      usersCreated: 3,
      recipesCreated: 1,
    });

    const result = await engine.runCommand(
      "reseed",
      { requestedBy: "user-admin" },
      { entityName: "SampleData", instanceId: INSTANCE_ID }
    );

    expect(result.success).toBe(true);
    expect(result.emittedEvents).toBeDefined();

    const reseedEvent = result.emittedEvents!.find(
      (e) => e.name === "SampleDataReseeded"
    );
    expect(reseedEvent).toBeDefined();
  });

  it("rejects when requestedBy is empty", async () => {
    const ir = loadSampleDataIR();
    const engine = createEngine(ir);

    await engine.createInstance("SampleData", {
      id: INSTANCE_ID,
      tenantId: "tenant-1",
      isSeeded: false,
      seededAt: 0,
      clearedAt: 0,
      eventsCreated: 0,
      clientsCreated: 0,
      usersCreated: 0,
      recipesCreated: 0,
    });

    const result = await engine.runCommand(
      "reseed",
      { requestedBy: "" },
      { entityName: "SampleData", instanceId: INSTANCE_ID }
    );

    expect(result.success).toBe(false);
    expect(result.guardFailure).toBeDefined();
  });
});
