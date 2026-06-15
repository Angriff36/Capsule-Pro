/**
 * Middleware conformance — LogisticsRoute lifecycle → Driver / Vehicle status
 * (IMPLEMENTATION_PLAN P1: "LogisticsRouteStarted/Completed → Driver/Vehicle status").
 *
 * WHY this matters (not just WHAT it does): starting a delivery route should take its
 * driver/vehicle off the available board, and completing/cancelling it should return
 * them — but LogisticsRoute had ZERO consumers, so the route walked planned →
 * in_progress → completed while the fleet board stayed wrong. This middleware drives
 * the four status commands (added for the dispatch sibling, reused here with NO IR
 * change) off the route lifecycle:
 *   LogisticsRouteStarted   → driver on_route + vehicle in_use   (busy)
 *   LogisticsRouteCompleted → driver available + vehicle available (free*)
 *   LogisticsRouteCancelled → driver available + vehicle available (free*)
 *
 * WHY middleware (not a reaction): `start`/`complete`/`cancel` take no driver/vehicle
 * params and driverId/vehicleId are the route's OWN fields — declared event fields are
 * never auto-populated from self.*, so the payloads do not carry them. The middleware
 * loads the route via _subject.id and reads them.
 *
 * PRECEDENCE (* the conditional free): a LogisticsDispatch belongs to a route and
 * carries its own driver/vehicle, so a fleet member can be on both. The route's free
 * legs free them ONLY when no other active route/dispatch still commits them — so a
 * route completing never frees a driver whose dispatch is mid-transit (proven below).
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
import { createLogisticsRouteDriverVehicleStatusMiddleware } from "../middleware/logistics-route-driver-vehicle-status-middleware.js";
import { runManifestCommandCore } from "../run-manifest-command-core.js";
import { ManifestRuntimeEngine } from "../runtime-engine.js";

const here = dirname(fileURLToPath(import.meta.url));
const irPath = join(here, "..", "..", "..", "ir", "kitchen.ir.json");
// biome-ignore lint/suspicious/noExplicitAny: IR is structural JSON; engine accepts it.
const ir: any = JSON.parse(readFileSync(irPath, "utf8"));

const TENANT = "t-route-status";
// admin satisfies LogisticsRoute / Driver / Vehicle default policies.
const USER = { id: "u-route", tenantId: TENANT, role: "admin" } as const;

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

/** Build the engine with the route-status middleware wired (as the factory does). */
function newEngine(provider: (entity: string) => Store): ManifestRuntimeEngine {
  let engine: ManifestRuntimeEngine;
  const middleware = [
    createLogisticsRouteDriverVehicleStatusMiddleware({
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

async function seedRoute(
  provider: (entity: string) => Store,
  status: string,
  overrides: Record<string, unknown> = {}
) {
  await provider("LogisticsRoute").create({
    id: ROUTE,
    tenantId: TENANT,
    name: "Friday deliveries",
    status,
    driverId: DRIVER,
    vehicleId: VEHICLE,
    totalDistance: 0,
    totalDuration: 0,
    completedStops: 0,
    delayMinutes: 0,
    description: "",
    ...overrides,
  } as never);
}

/** Seed a live (assigned/in_transit) dispatch that also holds the same fleet member. */
async function seedDispatch(
  provider: (entity: string) => Store,
  id: string,
  status: string,
  overrides: Record<string, unknown> = {}
) {
  await provider("LogisticsDispatch").create({
    id,
    tenantId: TENANT,
    routeId: ROUTE,
    driverId: DRIVER,
    vehicleId: VEHICLE,
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

describe("Middleware conformance: LogisticsRoute lifecycle → Driver/Vehicle status", () => {
  it("no LogisticsRoute*→Driver/Vehicle reaction exists (this propagation is middleware-only)", () => {
    // biome-ignore lint/suspicious/noExplicitAny: structural reaction rows.
    const reactions: any[] = ir.reactions ?? [];
    const routeFleetReaction = reactions.some((r) => {
      const on = String(r.on ?? r.event ?? "");
      const target = String(r.run ?? r.command ?? r.target ?? "");
      return (
        on.startsWith("LogisticsRoute") &&
        (target.includes("Driver") || target.includes("Vehicle"))
      );
    });
    expect(routeFleetReaction).toBe(false);
    // And the four reused status commands must still exist in the IR.
    // biome-ignore lint/suspicious/noExplicitAny: structural command rows.
    const commands: any[] = ir.commands ?? [];
    const has = (entity: string, name: string) =>
      commands.some((c) => c.entity === entity && c.name === name);
    expect(has("Driver", "setOnRoute")).toBe(true);
    expect(has("Driver", "setAvailable")).toBe(true);
    expect(has("Vehicle", "setInUse")).toBe(true);
    expect(has("Vehicle", "setAvailable")).toBe(true);
  });

  it("starting a route puts the driver on_route and the vehicle in_use", async () => {
    const provider = makeProvider();
    await seedDriver(provider, "available");
    await seedVehicle(provider, "available");
    await seedRoute(provider, "planned");
    const engine = newEngine(provider);

    const result = await runManifestCommandCore(
      { createRuntime: async () => engine },
      {
        entity: "LogisticsRoute",
        command: "start",
        body: { id: ROUTE, tenantId: TENANT },
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
    expect(driver.status).toBe("on_route");
    expect(vehicle.status).toBe("in_use");

    const names = eventNames(result);
    expect(names).toContain("LogisticsRouteStarted");
    expect(names).toContain("DriverSetOnRoute");
    expect(names).toContain("VehicleSetInUse");
  });

  it("completing a route with no live dispatch frees the driver and vehicle", async () => {
    const provider = makeProvider();
    await seedDriver(provider, "on_route");
    await seedVehicle(provider, "in_use");
    await seedRoute(provider, "in_progress");
    const engine = newEngine(provider);

    const result = await runManifestCommandCore(
      { createRuntime: async () => engine },
      {
        entity: "LogisticsRoute",
        command: "complete",
        body: { id: ROUTE, tenantId: TENANT, notes: "all delivered" },
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
    expect(names).toContain("LogisticsRouteCompleted");
    expect(names).toContain("DriverSetAvailable");
    expect(names).toContain("VehicleSetAvailable");
  });

  it("cancelling a route with no live dispatch frees the driver and vehicle", async () => {
    const provider = makeProvider();
    await seedDriver(provider, "on_route");
    await seedVehicle(provider, "in_use");
    await seedRoute(provider, "in_progress");
    const engine = newEngine(provider);

    const result = await runManifestCommandCore(
      { createRuntime: async () => engine },
      {
        entity: "LogisticsRoute",
        command: "cancel",
        body: { id: ROUTE, tenantId: TENANT, reason: "client postponed" },
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

  it("PRECEDENCE: completing a route does NOT free the fleet while a dispatch is still in transit", async () => {
    const provider = makeProvider();
    await seedDriver(provider, "on_route");
    await seedVehicle(provider, "in_use");
    await seedRoute(provider, "in_progress");
    // The driver/vehicle are still physically out on a live dispatch within the route.
    await seedDispatch(provider, "disp-live", "in_transit");
    const engine = newEngine(provider);

    const result = await runManifestCommandCore(
      { createRuntime: async () => engine },
      {
        entity: "LogisticsRoute",
        command: "complete",
        body: { id: ROUTE, tenantId: TENANT, notes: "route marked complete" },
        user: { ...USER },
      }
    );
    // The route still completes; the fleet free is DEFERRED to the dispatch's own
    // deliver/fail so we never show a mid-delivery driver as available.
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

    const names = eventNames(result);
    expect(names).toContain("LogisticsRouteCompleted");
    expect(names).not.toContain("DriverSetAvailable");
    expect(names).not.toContain("VehicleSetAvailable");
  });

  it("is guard-safe: starting a route when the driver is already on another route leaves them on_route and still puts the available vehicle in use", async () => {
    const provider = makeProvider();
    // Driver is busy on a different route; vehicle is free.
    await seedDriver(provider, "on_route");
    await seedVehicle(provider, "available");
    await seedRoute(provider, "planned");
    const engine = newEngine(provider);

    const result = await runManifestCommandCore(
      { createRuntime: async () => engine },
      {
        entity: "LogisticsRoute",
        command: "start",
        body: { id: ROUTE, tenantId: TENANT },
        user: { ...USER },
      }
    );
    // The route itself still starts; the busy driver's setOnRoute guard skips cleanly
    // (no error), while the available vehicle still flips to in_use.
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
