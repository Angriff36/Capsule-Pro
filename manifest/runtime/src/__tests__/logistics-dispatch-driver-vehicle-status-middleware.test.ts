/**
 * Middleware conformance — LogisticsDispatch lifecycle → Driver / Vehicle status
 * (IMPLEMENTATION_PLAN P1: "LogisticsRoute/Dispatch → Driver/Vehicle status").
 *
 * WHY this matters (not just WHAT it does): the Driver `on_route` and Vehicle
 * `in_use` statuses were declared (validStatus constraint + transition) but were
 * UNREACHABLE — no command ever mutated a driver to `on_route` or a vehicle to
 * `in_use`. So when catering goods were dispatched, the fleet availability board
 * never showed the driver/vehicle as busy, and nothing ever freed them again. The
 * four new status commands (Driver.setOnRoute/setAvailable, Vehicle.setInUse/
 * setAvailable) make those states live, and this middleware drives them off the
 * dispatch lifecycle:
 *   LogisticsDispatchAssigned  → driver on_route + vehicle in_use   (busy)
 *   LogisticsDispatchDelivered → driver available + vehicle available (free)
 *   LogisticsDispatchFailed    → driver available + vehicle available (free)
 *
 * WHY middleware (not a reaction): `deliver`/`fail` take no driver/vehicle params and
 * `driverId`/`vehicleId` are the LogisticsDispatch's OWN fields — declared event
 * fields are never auto-populated from `self.*`, so the delivered/failed payloads do
 * not carry them. The middleware loads the dispatch via `_subject.id` and reads them.
 *
 * The test runs against the REAL compiled IR through the runtime engine WITH the
 * middleware wired, so it FAILS LOUDLY if the propagation regresses (CLAUDE.md Rule 9;
 * constitution §13).
 */

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Store } from "@angriff36/manifest";
import { describe, expect, it } from "vitest";
import { createCustomBuiltins } from "../manifest-builtins.js";
import { createLogisticsDispatchDriverVehicleStatusMiddleware } from "../middleware/logistics-dispatch-driver-vehicle-status-middleware.js";
import { runManifestCommandCore } from "../run-manifest-command-core.js";
import { ManifestRuntimeEngine } from "../runtime-engine.js";

const here = dirname(fileURLToPath(import.meta.url));
const irPath = join(here, "..", "..", "..", "ir", "kitchen.ir.json");
// biome-ignore lint/suspicious/noExplicitAny: IR is structural JSON; engine accepts it.
const ir: any = JSON.parse(readFileSync(irPath, "utf8"));

const TENANT = "t-logi-status";
// admin satisfies LogisticsDispatch / Driver / Vehicle default policies.
const USER = { id: "u-logi", tenantId: TENANT, role: "admin" } as const;

const DISPATCH = "disp-A";
const ROUTE = "route-A";
const DRIVER = "drv-A";
const VEHICLE = "veh-A";
const FIXED_NOW = 1_700_000_000_000;

// Minimal persistent in-memory store (mirrors the upstream MemoryStore contract).
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
    if (!existing) {
      return undefined as never;
    }
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

function makeProvider(): (entity: string) => Store {
  const stores = new Map<string, Mem>();
  return (entity: string): Store => {
    let store = stores.get(entity);
    if (!store) {
      store = new Mem();
      stores.set(entity, store);
    }
    return store;
  };
}

/** Build the engine with the dispatch-status middleware wired (as the factory does). */
function newEngine(provider: (entity: string) => Store): ManifestRuntimeEngine {
  let engine: ManifestRuntimeEngine;
  const middleware = [
    createLogisticsDispatchDriverVehicleStatusMiddleware({
      storeProvider: provider,
      dispatchCommand: (commandName, input, options) =>
        engine.runCommand(commandName, input, options),
      onDiagnostic: () => {
        /* no-op in tests */
      },
    }),
  ];
  engine = new ManifestRuntimeEngine(
    ir,
    {
      tenantId: USER.tenantId,
      user: { id: USER.id, tenantId: USER.tenantId, role: USER.role },
    },
    {
      storeProvider: provider,
      customBuiltins: createCustomBuiltins(),
      middleware,
      generateId: () => randomUUID(),
      now: () => FIXED_NOW,
    }
  );
  return engine;
}

async function seedDriver(provider: (entity: string) => Store, status: string) {
  await provider("Driver").create({
    id: DRIVER,
    tenantId: TENANT,
    name: "Alex Rivera",
    status,
  } as never);
}

async function seedVehicle(
  provider: (entity: string) => Store,
  status: string
) {
  await provider("Vehicle").create({
    id: VEHICLE,
    tenantId: TENANT,
    make: "Ford",
    model: "Transit",
    status,
  } as never);
}

async function seedDispatch(
  provider: (entity: string) => Store,
  status: string,
  overrides: Record<string, unknown> = {}
) {
  await provider("LogisticsDispatch").create({
    id: DISPATCH,
    tenantId: TENANT,
    routeId: ROUTE,
    driverId: "",
    vehicleId: "",
    status,
    priority: "normal",
    failureReason: "",
    ...overrides,
  } as never);
}

function eventNames(result: { ok: boolean; events?: unknown[] }): string[] {
  return (result.ok ? (result.events ?? []) : []).map(
    // biome-ignore lint/suspicious/noExplicitAny: structural event rows.
    (e: any) => e?.name as string
  );
}

describe("Middleware conformance: LogisticsDispatch lifecycle → Driver/Vehicle status", () => {
  it("the compiled IR carries the four new status commands that make on_route/in_use reachable", () => {
    // biome-ignore lint/suspicious/noExplicitAny: structural command rows.
    const commands: any[] = ir.commands ?? [];
    const has = (entity: string, name: string) =>
      commands.some((c) => c.entity === entity && c.name === name);
    // A regression here means the additive IR commands were dropped — the dispatch
    // lifecycle would silently stop flipping fleet availability.
    expect(has("Driver", "setOnRoute")).toBe(true);
    expect(has("Driver", "setAvailable")).toBe(true);
    expect(has("Vehicle", "setInUse")).toBe(true);
    expect(has("Vehicle", "setAvailable")).toBe(true);
  });

  it("assigning a dispatch puts the driver on_route and the vehicle in_use", async () => {
    const provider = makeProvider();
    await seedDriver(provider, "available");
    await seedVehicle(provider, "available");
    await seedDispatch(provider, "pending");
    const engine = newEngine(provider);

    const result = await runManifestCommandCore(
      { createRuntime: async () => engine },
      {
        entity: "LogisticsDispatch",
        command: "assign",
        body: {
          id: DISPATCH,
          tenantId: TENANT,
          routeId: ROUTE,
          driverId: DRIVER,
          vehicleId: VEHICLE,
          priority: "high",
          estimatedDeliveryTime: new Date(FIXED_NOW).toISOString(),
          notes: "to venue",
        },
        user: { ...USER },
      }
    );
    expect(result.ok).toBe(true);

    // THE PROOF: the middleware ran the status commands against the SAME store, so
    // the driver/vehicle reflect that they are busy on this dispatch.
    const driver = (await provider("Driver").getById(DRIVER)) as Record<
      string,
      unknown
    >;
    const vehicle = (await provider("Vehicle").getById(VEHICLE)) as Record<
      string,
      unknown
    >;
    expect(driver.status).toBe("on_route");
    expect(vehicle.status).toBe("in_use");

    const names = eventNames(result);
    expect(names).toContain("LogisticsDispatchAssigned");
    expect(names).toContain("DriverSetOnRoute");
    expect(names).toContain("VehicleSetInUse");
  });

  it("delivering a dispatch frees the driver and vehicle back to available", async () => {
    const provider = makeProvider();
    await seedDriver(provider, "on_route");
    await seedVehicle(provider, "in_use");
    await seedDispatch(provider, "in_transit", {
      driverId: DRIVER,
      vehicleId: VEHICLE,
    });
    const engine = newEngine(provider);

    const result = await runManifestCommandCore(
      { createRuntime: async () => engine },
      {
        entity: "LogisticsDispatch",
        command: "deliver",
        body: { id: DISPATCH, tenantId: TENANT, notes: "delivered" },
        user: { ...USER },
      }
    );
    expect(result.ok).toBe(true);

    const driver = (await provider("Driver").getById(DRIVER)) as Record<
      string,
      unknown
    >;
    const vehicle = (await provider("Vehicle").getById(VEHICLE)) as Record<
      string,
      unknown
    >;
    expect(driver.status).toBe("available");
    expect(vehicle.status).toBe("available");

    const names = eventNames(result);
    expect(names).toContain("LogisticsDispatchDelivered");
    expect(names).toContain("DriverSetAvailable");
    expect(names).toContain("VehicleSetAvailable");
  });

  it("failing a dispatch also frees the driver and vehicle back to available", async () => {
    const provider = makeProvider();
    await seedDriver(provider, "on_route");
    await seedVehicle(provider, "in_use");
    await seedDispatch(provider, "in_transit", {
      driverId: DRIVER,
      vehicleId: VEHICLE,
    });
    const engine = newEngine(provider);

    const result = await runManifestCommandCore(
      { createRuntime: async () => engine },
      {
        entity: "LogisticsDispatch",
        command: "fail",
        body: { id: DISPATCH, tenantId: TENANT, reason: "vehicle breakdown" },
        user: { ...USER },
      }
    );
    expect(result.ok).toBe(true);

    const driver = (await provider("Driver").getById(DRIVER)) as Record<
      string,
      unknown
    >;
    const vehicle = (await provider("Vehicle").getById(VEHICLE)) as Record<
      string,
      unknown
    >;
    expect(driver.status).toBe("available");
    expect(vehicle.status).toBe("available");
  });

  it("is guard-safe: assigning when the driver is already on another route leaves them on_route and still frees the available vehicle", async () => {
    const provider = makeProvider();
    // Driver is busy on a different dispatch; vehicle is free.
    await seedDriver(provider, "on_route");
    await seedVehicle(provider, "available");
    await seedDispatch(provider, "pending");
    const engine = newEngine(provider);

    const result = await runManifestCommandCore(
      { createRuntime: async () => engine },
      {
        entity: "LogisticsDispatch",
        command: "assign",
        body: {
          id: DISPATCH,
          tenantId: TENANT,
          routeId: ROUTE,
          driverId: DRIVER,
          vehicleId: VEHICLE,
          priority: "normal",
          estimatedDeliveryTime: new Date(FIXED_NOW).toISOString(),
          notes: "",
        },
        user: { ...USER },
      }
    );
    // The dispatch itself still assigns; the busy driver's setOnRoute guard skips
    // cleanly (no error), while the available vehicle still flips to in_use.
    expect(result.ok).toBe(true);

    const driver = (await provider("Driver").getById(DRIVER)) as Record<
      string,
      unknown
    >;
    const vehicle = (await provider("Vehicle").getById(VEHICLE)) as Record<
      string,
      unknown
    >;
    expect(driver.status).toBe("on_route");
    expect(vehicle.status).toBe("in_use");
  });
});
