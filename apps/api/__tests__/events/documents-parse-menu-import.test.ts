/**
 * importMenuToEvent (POST /api/events/documents/parse menu import) — read N+1 guard.
 *
 * Regression guard for the read-preload collapse: the importer previously fired
 * up to three existence reads PER aggregated menu item — `dish.findFirst`,
 * `recipe.findFirst`, and a per-dish `$queryRaw` event_dishes link lookup —
 * before the governed writes (a 30-dish menu = ~90 reads). It now issues ONE
 * `dish.findMany` (by name), ONE `recipe.findMany` (for new dish names only),
 * and ONE batched link `$queryRaw` (for existing dish ids only), then resolves
 * everything from in-memory Maps. The governed writes stay serial (the manifest
 * runtime is not concurrent-safe). These tests pin the fan-out is gone and the
 * per-item branching (update vs. create, recipe reuse) is preserved.
 */

import type { ParsedEvent } from "@repo/event-parser";
import { beforeEach, describe, expect, it, vi } from "vitest";

// --- Mocks ---

// `Prisma.sql` (tagged template) + `Prisma.join` are stubbed so the route's raw
// SQL builds an inspectable `{ sql, values }` object — the `$queryRaw` mock is
// asserted on the table/column text in `.sql`.
vi.mock("@repo/database", () => {
  const sql = (strings: readonly string[], ...values: unknown[]) => ({
    sql: strings.join("?"),
    values,
  });
  const join = (arr: unknown[]) => ({ join: arr });
  const database = {
    dish: {
      findMany: vi.fn(),
      // Present only so the guard can assert it is NEVER called after the fix
      // (the prior per-entry dish-existence read).
      findFirst: vi.fn(),
    },
    recipe: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    eventDish: { updateMany: vi.fn() },
    $queryRaw: vi.fn(),
  };
  return { database, Prisma: { sql, join } };
});

const runManifestCommandCore = vi.fn();
vi.mock("@repo/manifest-runtime/run-manifest-command-core", () => ({
  runManifestCommandCore: (...args: unknown[]) =>
    runManifestCommandCore(...args),
}));

// The manifest runtime factory is never invoked — the mocked command-core
// short-circuits before its createRuntime callback runs — but the route imports
// it at module top, so stub it to avoid any engine init during module load.
vi.mock("@/lib/manifest-runtime", () => ({
  createManifestRuntime: vi.fn(),
}));

// --- Import mocked modules ---

const { database } = await import("@repo/database");

import { importMenuToEvent } from "@/app/api/events/documents/parse/route";

// --- Constants ---

const TENANT_ID = "00000000-0000-0000-0000-000000000070";
const EVENT_ID = "00000000-0000-0000-0000-000000000071";
const USER = {
  id: "user-1",
  tenantId: TENANT_ID,
  role: "tenant_admin",
} as const;

const db = database as unknown as {
  dish: {
    findMany: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
  };
  recipe: {
    findMany: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
  };
  eventDish: { updateMany: ReturnType<typeof vi.fn> };
  $queryRaw: ReturnType<typeof vi.fn>;
};

// --- Helpers ---

/** Build a minimal menu-section item the importer can aggregate. */
function menuItem(name: string, qty = 10) {
  return { name, qty: { value: qty } } as never;
}

function parsedEvent(names: string[]): ParsedEvent {
  return {
    menuSections: names.map((name) => menuItem(name)),
    headcount: 100,
    serviceStyle: "plated",
  } as unknown as ParsedEvent;
}

beforeEach(() => {
  vi.clearAllMocks();
  let govCount = 0;
  runManifestCommandCore.mockImplementation(() => {
    govCount += 1;
    return { ok: true, result: { id: `created-${govCount}` } };
  });
});

// --- Tests ---

describe("importMenuToEvent read-preload", () => {
  it("collapses per-item existence reads into 3 batched reads (mixed existing/new)", async () => {
    // Burger: existing dish + existing link → update path
    // Salad:  existing dish, no link       → create link
    // Pasta:  new dish, existing recipe    → create dish + create link
    db.dish.findMany.mockResolvedValue([
      { id: "dish-burger", name: "Burger" },
      { id: "dish-salad", name: "Salad" },
    ]);
    db.recipe.findMany.mockResolvedValue([{ id: "rec-pasta", name: "Pasta" }]);
    db.$queryRaw.mockResolvedValue([
      { id: "link-burger", dish_id: "dish-burger" },
    ]);

    const summary = await importMenuToEvent(
      TENANT_ID,
      EVENT_ID,
      parsedEvent(["Burger", "Salad", "Pasta"]),
      USER
    );

    // Read fan-out is gone: one dish findMany, one recipe findMany (new names
    // only), one batched link query; the per-entry findFirsts never fire.
    expect(db.dish.findMany).toHaveBeenCalledTimes(1);
    expect(db.dish.findMany).toHaveBeenCalledWith({
      where: {
        tenantId: TENANT_ID,
        deletedAt: null,
        name: {
          in: ["burger", "salad", "pasta"],
          mode: "insensitive",
        },
      },
      select: { id: true, name: true },
    });
    expect(db.recipe.findMany).toHaveBeenCalledTimes(1);
    expect(db.recipe.findMany).toHaveBeenCalledWith({
      where: {
        tenantId: TENANT_ID,
        deletedAt: null,
        name: { in: ["pasta"], mode: "insensitive" },
      },
      select: { id: true, name: true },
    });

    expect(db.$queryRaw).toHaveBeenCalledTimes(1);
    const rawSql = db.$queryRaw.mock.calls[0]?.[0] as { sql: string };
    expect(rawSql.sql).toContain("event_dishes");
    expect(rawSql.sql).toContain("dish_id IN");
    expect(rawSql.sql).toContain("deleted_at IS NULL");

    expect(db.dish.findFirst).not.toHaveBeenCalled();
    expect(db.recipe.findFirst).not.toHaveBeenCalled();

    // Per-item branching preserved:
    //   Burger → update (raw updateMany, not governed)
    //   Salad  → create EventDish link (governed)
    //   Pasta  → create Dish (governed) + create EventDish link (governed);
    //            recipe reused (no Recipe.create)
    expect(db.eventDish.updateMany).toHaveBeenCalledTimes(1);
    const governedEntities = runManifestCommandCore.mock.calls.map(
      (call) => (call[1] as { entity: string }).entity
    );
    expect(governedEntities).toEqual(
      expect.arrayContaining(["Dish", "EventDish", "EventDish"])
    );
    expect(runManifestCommandCore).toHaveBeenCalledTimes(3);

    expect(summary).toEqual({
      missingQuantities: [],
      linkedDishes: 2, // Salad + Pasta
      createdDishes: 1, // Pasta
      createdRecipes: 0, // Pasta recipe reused
      updatedLinks: 1, // Burger
    });
  });

  it("skips the recipe + link preloads when every dish is new", async () => {
    // Neither dish nor recipe exists; both get created. No existing dishes →
    // the link preload query must NOT fire (nothing could be linked yet).
    db.dish.findMany.mockResolvedValue([]);
    db.recipe.findMany.mockResolvedValue([]);

    const summary = await importMenuToEvent(
      TENANT_ID,
      EVENT_ID,
      parsedEvent(["Risotto", "Gazpacho"]),
      USER
    );

    expect(db.dish.findMany).toHaveBeenCalledTimes(1);
    expect(db.dish.findMany).toHaveBeenCalledWith({
      where: {
        tenantId: TENANT_ID,
        deletedAt: null,
        name: { in: ["risotto", "gazpacho"], mode: "insensitive" },
      },
      select: { id: true, name: true },
    });
    expect(db.recipe.findMany).toHaveBeenCalledTimes(1);
    // Both names are new → both go to the recipe lookup.
    expect(db.recipe.findMany).toHaveBeenCalledWith({
      where: {
        tenantId: TENANT_ID,
        deletedAt: null,
        name: { in: ["risotto", "gazpacho"], mode: "insensitive" },
      },
      select: { id: true, name: true },
    });
    expect(db.$queryRaw).not.toHaveBeenCalled();
    expect(db.dish.findFirst).not.toHaveBeenCalled();

    // 2 recipes + 2 dishes + 2 links = 6 governed writes; all new.
    expect(runManifestCommandCore).toHaveBeenCalledTimes(6);
    expect(summary).toEqual({
      missingQuantities: [],
      linkedDishes: 2,
      createdDishes: 2,
      createdRecipes: 2,
      updatedLinks: 0,
    });
  });

  it("short-circuits with no DB reads when the menu is empty", async () => {
    const summary = await importMenuToEvent(
      TENANT_ID,
      EVENT_ID,
      { menuSections: [], headcount: 0 } as unknown as ParsedEvent,
      USER
    );

    expect(db.dish.findMany).not.toHaveBeenCalled();
    expect(db.recipe.findMany).not.toHaveBeenCalled();
    expect(db.$queryRaw).not.toHaveBeenCalled();
    expect(runManifestCommandCore).not.toHaveBeenCalled();
    expect(summary).toEqual({
      missingQuantities: [],
      linkedDishes: 0,
      createdDishes: 0,
      createdRecipes: 0,
      updatedLinks: 0,
    });
  });
});
