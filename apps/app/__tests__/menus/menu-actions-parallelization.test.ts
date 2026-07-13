/**
 * @vitest-environment node
 *
 * Why this matters (db-performance plan item #7): the menu server actions in
 * `kitchen/recipes/menus/actions.ts` fired their pre-write SELECTs SERIALLY.
 * Each action's reads (existence guards + lookups) are keyed only on the
 * action's inputs (menuId / dishId / tenantId) and are data-independent, so
 * they collapse into one concurrent Promise.all batch:
 *   - addDishToMenu:        4 serial $queryRaw → 1 batch (menu, dish, existing, maxSortOrder)
 *   - reorderMenuDishes:    2 serial → 1 (menu + menuDishes)
 *   - saveAsTemplate:       2 serial → 1 (menu + menuDishes)
 *   - createFromTemplate:   2 serial → 1 (template + templateDishes)
 *   - updateMenuDishes:     2 serial → 1 (menu + existingMenuDishes)
 *
 * This test pins:
 *  1. addDishToMenu's 4 reads run CONCURRENTLY (overlap), not serially, and
 *     nextSortOrder is still computed as max(sort_order)+1.
 *  2. addDishToMenu's error priority is preserved after batching (a missing
 *     menu throws before the governed create; a duplicate dish throws too).
 *  3. Each 2-read action batches its reads concurrently.
 *
 * The sibling `menu-actions.test.ts` is pre-existing RED (stale mocks from
 * before the manifest-migration — documented in IMPLEMENTATION_PLAN.md #7);
 * this file is the fresh, correct harness for the parallelized reads.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("@/app/lib/tenant", () => ({
  requireCurrentUser: vi.fn(),
  requireTenantId: vi.fn(),
}));

vi.mock("@/lib/manifest-command", () => ({
  runManifestCommand: vi.fn(),
}));

vi.mock("@repo/database", () => ({
  database: { $queryRaw: vi.fn() },
  Prisma: {
    sql: (strings: readonly string[], ...values: unknown[]) => ({
      sql: strings.join("?"),
      values,
    }),
  },
}));

import { database } from "@repo/database";
import { requireCurrentUser, requireTenantId } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest-command";
import {
  addDishToMenu,
  createFromTemplate,
  reorderMenuDishes,
  saveAsTemplate,
  updateMenuDishes,
} from "../../app/(authenticated)/(operations)/kitchen/recipes/menus/actions";

const queryRaw = database.$queryRaw as unknown as ReturnType<typeof vi.fn>;
const runCommand = runManifestCommand as ReturnType<typeof vi.fn>;
const requireUser = requireCurrentUser as ReturnType<typeof vi.fn>;
const requireTenant = requireTenantId as ReturnType<typeof vi.fn>;

const MENU_ID = "menu-1";
const TEMPLATE_ID = "tmpl-1";
const DISH_ID = "dish-1";
const TENANT_ID = "tenant-1";
const USER_ID = "user-1";

/** Builds a $queryRaw mock whose calls return controlled pending promises so a
 * test can prove N reads were all INVOKED before any RESOLVED (concurrency). */
const concurrentTracker = () => {
  const resolvers: Array<() => void> = [];
  const invocations: string[] = [];
  const pending = <T>(name: string, value: T): Promise<T> => {
    invocations.push(name);
    return new Promise<T>((resolve) => {
      resolvers.push(() => resolve(value));
    });
  };
  return { resolvers, invocations, pending };
};

describe("menu actions read-waterfall parallelization (plan #7)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireTenant.mockResolvedValue(TENANT_ID);
    requireUser.mockResolvedValue({
      id: USER_ID,
      tenantId: TENANT_ID,
      role: "admin",
    });
    runCommand.mockResolvedValue({ ok: true, result: { id: "new-id" } });
  });

  it("addDishToMenu fires its 4 reads concurrently and computes nextSortOrder = max+1", async () => {
    const { resolvers, invocations, pending } = concurrentTracker();
    queryRaw.mockImplementation((frag: { sql: string }) => {
      const s = frag.sql;
      if (s.includes("MAX(sort_order)")) {
        return pending("maxSortOrder", [{ max_sort_order: 3 }]);
      }
      if (s.includes("tenant_kitchen.dishes")) {
        return pending("dish", [
          { id: DISH_ID, tenant_id: TENANT_ID, name: "D" },
        ]);
      }
      if (s.includes("tenant_kitchen.menus")) {
        return pending("menu", [
          { id: MENU_ID, tenant_id: TENANT_ID, name: "M" },
        ]);
      }
      return pending("existing", []);
    });

    const resultPromise = addDishToMenu(MENU_ID, DISH_ID, "Main");

    // PROOF OF PARALLELISM: all four reads are invoked before ANY resolves —
    // four pending resolvers exist simultaneously. Serial execution would have
    // invoked only one here (the rest wait for it to resolve).
    await vi.waitFor(() => expect(invocations).toHaveLength(4));
    expect(resolvers).toHaveLength(4);
    // Array order matches the original serial call sequence (menu → dish →
    // existing → maxSortOrder), so any order-dependent mock stays stable.
    expect(invocations).toEqual(["menu", "dish", "existing", "maxSortOrder"]);

    for (const resolve of resolvers) {
      resolve();
    }
    await resultPromise;

    // nextSortOrder = max(3) + 1 = 4
    expect(runCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: "MenuDish",
        command: "create",
        body: expect.objectContaining({
          menuId: MENU_ID,
          dishId: DISH_ID,
          course: "Main",
          sortOrder: 4,
        }),
      })
    );
  });

  it("addDishToMenu preserves error priority: a missing menu throws before the governed create", async () => {
    queryRaw.mockImplementation((frag: { sql: string }) => {
      const s = frag.sql;
      if (s.includes("tenant_kitchen.menus")) {
        return []; // menu missing
      }
      if (s.includes("tenant_kitchen.dishes")) {
        return [{ id: DISH_ID, tenant_id: TENANT_ID, name: "D" }];
      }
      if (s.includes("MAX(sort_order)")) {
        return [{ max_sort_order: 0 }];
      }
      return [];
    });

    await expect(addDishToMenu(MENU_ID, DISH_ID)).rejects.toThrow(
      "Menu not found or access denied."
    );
    expect(runCommand).not.toHaveBeenCalled();
  });

  it("addDishToMenu throws when the dish is already on the menu, and does not create", async () => {
    queryRaw.mockImplementation((frag: { sql: string }) => {
      const s = frag.sql;
      if (s.includes("tenant_kitchen.menus")) {
        return [{ id: MENU_ID, tenant_id: TENANT_ID, name: "M" }];
      }
      if (s.includes("tenant_kitchen.dishes")) {
        return [{ id: DISH_ID, tenant_id: TENANT_ID, name: "D" }];
      }
      if (s.includes("MAX(sort_order)")) {
        return [{ max_sort_order: 2 }];
      }
      return [{ id: "md-existing" }]; // dish already on the menu
    });

    await expect(addDishToMenu(MENU_ID, DISH_ID)).rejects.toThrow(
      "Dish is already in the menu."
    );
    expect(runCommand).not.toHaveBeenCalled();
  });

  it("reorderMenuDishes batches its 2 reads (menu + menuDishes) concurrently", async () => {
    const { resolvers, invocations, pending } = concurrentTracker();
    queryRaw.mockImplementation((frag: { sql: string }) => {
      if (frag.sql.includes("dish_id = ANY")) {
        return pending("menuDishes", [
          {
            id: "md-1",
            dish_id: DISH_ID,
            course: null,
            sort_order: 1,
            is_optional: false,
          },
        ]);
      }
      return pending("menu", [{ id: MENU_ID, tenant_id: TENANT_ID }]);
    });

    const resultPromise = reorderMenuDishes(MENU_ID, [DISH_ID]);

    await vi.waitFor(() => expect(invocations).toHaveLength(2));
    expect(resolvers).toHaveLength(2);
    expect(invocations).toEqual(["menu", "menuDishes"]);

    for (const resolve of resolvers) {
      resolve();
    }
    await resultPromise;

    expect(runCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: "MenuDish",
        command: "updateCourse",
        body: expect.objectContaining({ newSortOrder: 1 }),
      })
    );
  });

  it("saveAsTemplate batches its 2 reads (menu + menuDishes) concurrently", async () => {
    runCommand.mockResolvedValue({ ok: true, result: { id: TEMPLATE_ID } });
    const { resolvers, invocations, pending } = concurrentTracker();
    queryRaw.mockImplementation((frag: { sql: string }) => {
      if (frag.sql.includes("tenant_kitchen.menu_dishes")) {
        return pending("menuDishes", [
          { dish_id: DISH_ID, course: null, sort_order: 1, is_optional: false },
        ]);
      }
      return pending("menu", [
        { id: MENU_ID, name: "M", description: null, category: null },
      ]);
    });

    const resultPromise = saveAsTemplate(MENU_ID);

    await vi.waitFor(() => expect(invocations).toHaveLength(2));
    expect(resolvers).toHaveLength(2);
    expect(invocations).toEqual(["menu", "menuDishes"]);

    for (const resolve of resolvers) {
      resolve();
    }
    const templateId = await resultPromise;

    expect(templateId).toBe(TEMPLATE_ID);
  });

  it("createFromTemplate batches its 2 reads (template + templateDishes) concurrently", async () => {
    runCommand.mockResolvedValue({ ok: true, result: { id: MENU_ID } });
    const { resolvers, invocations, pending } = concurrentTracker();
    queryRaw.mockImplementation((frag: { sql: string }) => {
      if (frag.sql.includes("tenant_kitchen.menu_dishes")) {
        return pending("templateDishes", [
          { dish_id: DISH_ID, course: null, sort_order: 1, is_optional: false },
        ]);
      }
      return pending("template", [
        {
          id: TEMPLATE_ID,
          name: "T",
          description: null,
          category: null,
        },
      ]);
    });

    const resultPromise = createFromTemplate(TEMPLATE_ID, "Spring Copy");

    await vi.waitFor(() => expect(invocations).toHaveLength(2));
    expect(resolvers).toHaveLength(2);
    expect(invocations).toEqual(["template", "templateDishes"]);

    for (const resolve of resolvers) {
      resolve();
    }
    const menuId = await resultPromise;

    expect(menuId).toBe(MENU_ID);
  });

  it("updateMenuDishes batches its 2 reads (menu + existingMenuDishes) concurrently", async () => {
    const { resolvers, invocations, pending } = concurrentTracker();
    queryRaw.mockImplementation((frag: { sql: string }) => {
      if (frag.sql.includes("tenant_kitchen.menu_dishes")) {
        return pending("existing", [{ id: "md-old" }]);
      }
      return pending("menu", [{ id: MENU_ID }]);
    });

    const resultPromise = updateMenuDishes(MENU_ID, [
      {
        dishId: DISH_ID,
        course: "Main",
        sortOrder: 1,
        isOptional: false,
      },
    ]);

    await vi.waitFor(() => expect(invocations).toHaveLength(2));
    expect(resolvers).toHaveLength(2);
    expect(invocations).toEqual(["menu", "existing"]);

    for (const resolve of resolvers) {
      resolve();
    }
    await resultPromise;

    // 1 existing removal + 1 new create, both governed.
    expect(runCommand).toHaveBeenCalledTimes(2);
    expect(runCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: "MenuDish",
        command: "remove",
        instanceId: "md-old",
      })
    );
    expect(runCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: "MenuDish",
        command: "create",
        body: expect.objectContaining({ dishId: DISH_ID, sortOrder: 1 }),
      })
    );
  });
});
