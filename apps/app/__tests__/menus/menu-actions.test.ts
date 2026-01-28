/**
 * Unit tests for menu server actions
 *
 * Tests the menu CRUD functionality including:
 * - Menu creation, updates, and deletion
 * - Dish management in menus (add, remove, reorder)
 * - Validation errors
 * - Outbox event enqueuing
 *
 * @vitest-environment node
 */

// Import database - this gets the mock from vitest config plugin
import { database } from "@repo/database";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  addDishToMenu,
  createMenu,
  deleteMenu,
  removeDishFromMenu,
  reorderMenuDishes,
  updateMenu,
} from "../../app/(authenticated)/kitchen/recipes/menus/actions";

// Mock the tenant module
vi.mock(
  "../../app/(authenticated)/kitchen/recipes/menus/../../../../lib/tenant",
  () => {
    return {
      requireTenantId: vi.fn().mockResolvedValue("test-tenant-id"),
    };
  }
);

// Mock next/cache for revalidatePath - use vi.hoisted since vi.mock is hoisted
const mocks = vi.hoisted(() => ({
  mockRevalidatePath: vi.fn(),
  mockRedirect: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.mockRevalidatePath,
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.mockRedirect,
}));

// Mock crypto for randomUUID
vi.mock("crypto", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    randomUUID: vi.fn().mockReturnValue("test-uuid-123"),
  };
});

describe("menu actions", () => {
  const mockTenantId = "test-tenant-id";
  const mockMenuId = "test-menu-id";
  const mockDishId = "test-dish-id";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createMenu", () => {
    it("should create a new menu successfully", async () => {
      // Spy on the mock functions provided by vitest config
      const executeRawSpy = vi.spyOn(database, "$executeRaw");
      const createSpy = vi.spyOn(database.outboxEvent, "create");

      const formData = new FormData();
      formData.append("name", "Summer Menu");
      formData.append("description", "Fresh summer dishes");
      formData.append("category", "seasonal");
      formData.append("basePrice", "150");
      formData.append("pricePerPerson", "25");
      formData.append("minGuests", "10");
      formData.append("maxGuests", "50");

      await createMenu(formData);

      // Verify menu was inserted
      const executeRawCalls = executeRawSpy.mock.calls;
      const menuInsertCall = executeRawCalls.find((call) => {
        const sql = call[0];
        return sql?.strings
          ?.join("")
          .includes("INSERT INTO tenant_kitchen.menus");
      });

      expect(menuInsertCall).toBeDefined();
      expect(menuInsertCall?.[0].values).toContain(mockTenantId);
      expect(menuInsertCall?.[0].values).toContain("Summer Menu");
      expect(menuInsertCall?.[0].values).toContain(150);
      expect(menuInsertCall?.[0].values).toContain(25);

      // Verify outbox event was enqueued
      expect(createSpy).toHaveBeenCalledWith({
        data: {
          tenantId: mockTenantId,
          aggregateType: "menu",
          aggregateId: "test-uuid-123",
          eventType: "menu.created",
          payload: {
            menuId: "test-uuid-123",
            name: "Summer Menu",
          },
        },
      });

      // Verify revalidatePath was called
      expect(mocks.mockRevalidatePath).toHaveBeenCalledWith(
        "/kitchen/recipes/menus"
      );

      // Verify redirect was called
      expect(mocks.mockRedirect).toHaveBeenCalledWith(
        "/kitchen/recipes?tab=menus"
      );
    });

    it("should throw error when menu name is missing", async () => {
      const formData = new FormData();
      formData.append("description", "Menu without name");

      await expect(createMenu(formData)).rejects.toThrow(
        "Menu name is required."
      );
    });

    it("should throw error when menu name is whitespace", async () => {
      const formData = new FormData();
      formData.append("name", "   ");
      formData.append("description", "Menu with whitespace name");

      await expect(createMenu(formData)).rejects.toThrow(
        "Menu name is required."
      );
    });

    it("should handle null/optional fields correctly", async () => {
      const executeRawSpy = vi.spyOn(database, "$executeRaw");

      const formData = new FormData();
      formData.append("name", "Minimal Menu");
      // No optional fields

      await createMenu(formData);

      const executeRawCalls = executeRawSpy.mock.calls;
      const menuInsertCall = executeRawCalls.find((call) => {
        const sql = call[0];
        return sql?.strings
          ?.join("")
          .includes("INSERT INTO tenant_kitchen.menus");
      });

      expect(menuInsertCall).toBeDefined();
      // Null values should be present for optional fields
      expect(menuInsertCall?.[0].values).toContain(null);
    });
  });

  describe("updateMenu", () => {
    it("should update menu successfully", async () => {
      // Mock existing menu
      const mockExistingMenu = [
        {
          id: mockMenuId,
          tenant_id: mockTenantId,
        },
      ];

      const queryRawSpy = vi.spyOn(database, "$queryRaw");
      queryRawSpy.mockResolvedValueOnce(mockExistingMenu);

      const executeRawSpy = vi.spyOn(database, "$executeRaw");
      const createSpy = vi.spyOn(database.outboxEvent, "create");

      const formData = new FormData();
      formData.append("name", "Updated Summer Menu");
      formData.append("description", "Updated description");
      formData.append("category", "seasonal");
      formData.append("basePrice", "175");
      formData.append("isActive", "on");

      await updateMenu(mockMenuId, formData);

      // Verify menu was updated
      const executeRawCalls = executeRawSpy.mock.calls;
      const menuUpdateCall = executeRawCalls.find((call) => {
        const sql = call[0];
        return sql?.strings?.join("").includes("UPDATE tenant_kitchen.menus");
      });

      expect(menuUpdateCall).toBeDefined();
      expect(menuUpdateCall?.[0].values).toContain("Updated Summer Menu");
      expect(menuUpdateCall?.[0].values).toContain(175);
      expect(menuUpdateCall?.[0].values).toContain(true);

      // Verify outbox event was enqueued
      expect(createSpy).toHaveBeenCalledWith({
        data: {
          tenantId: mockTenantId,
          aggregateType: "menu",
          aggregateId: mockMenuId,
          eventType: "menu.updated",
          payload: {
            menuId: mockMenuId,
            name: "Updated Summer Menu",
          },
        },
      });

      // Verify revalidatePath was called twice (list and detail)
      expect(mocks.mockRevalidatePath).toHaveBeenCalledTimes(2);
      expect(mocks.mockRevalidatePath).toHaveBeenCalledWith(
        "/kitchen/recipes/menus"
      );
      expect(mocks.mockRevalidatePath).toHaveBeenCalledWith(
        `/kitchen/recipes/menus/${mockMenuId}`
      );
    });

    it("should throw error when menu ID is missing", async () => {
      const formData = new FormData();
      formData.append("name", "Menu");

      await expect(updateMenu("", formData)).rejects.toThrow(
        "Menu ID is required."
      );
    });

    it("should throw error when menu is not found", async () => {
      const queryRawSpy = vi.spyOn(database, "$queryRaw");
      queryRawSpy.mockResolvedValueOnce([]);

      const formData = new FormData();
      formData.append("name", "Menu");

      await expect(updateMenu(mockMenuId, formData)).rejects.toThrow(
        "Menu not found or access denied."
      );
    });

    it("should throw error when menu belongs to different tenant", async () => {
      // Configure the mock directly instead of using spyOn
      database.$queryRaw = vi.fn().mockResolvedValueOnce([
        {
          id: mockMenuId,
          tenant_id: "different-tenant",
        },
      ]);

      const formData = new FormData();
      formData.append("name", "Menu");

      await expect(updateMenu(mockMenuId, formData)).rejects.toThrow(
        "Menu not found or access denied."
      );
    });

    it("should throw error when menu name is missing", async () => {
      const mockExistingMenu = [
        {
          id: mockMenuId,
          tenant_id: mockTenantId,
        },
      ];

      const queryRawSpy = vi.spyOn(database, "$queryRaw");
      queryRawSpy.mockResolvedValueOnce(mockExistingMenu);

      const formData = new FormData();
      formData.append("name", "");

      await expect(updateMenu(mockMenuId, formData)).rejects.toThrow(
        "Menu name is required."
      );
    });

    it("should parse numeric fields correctly", async () => {
      const mockExistingMenu = [
        {
          id: mockMenuId,
          tenant_id: mockTenantId,
        },
      ];

      const queryRawSpy = vi.spyOn(database, "$queryRaw");
      queryRawSpy.mockResolvedValueOnce(mockExistingMenu);

      const executeRawSpy = vi.spyOn(database, "$executeRaw");

      const formData = new FormData();
      formData.append("name", "Menu");
      formData.append("basePrice", "100");
      formData.append("pricePerPerson", "20");
      formData.append("minGuests", "5");
      formData.append("maxGuests", "30");

      await updateMenu(mockMenuId, formData);

      const executeRawCalls = executeRawSpy.mock.calls;
      const menuUpdateCall = executeRawCalls.find((call) => {
        const sql = call[0];
        return sql?.strings?.join("").includes("UPDATE tenant_kitchen.menus");
      });

      expect(menuUpdateCall).toBeDefined();
      // Verify numbers are parsed correctly
      const values = menuUpdateCall?.[0].values;
      expect(values).toContain(100);
      expect(values).toContain(20);
      expect(values).toContain(5);
      expect(values).toContain(30);
    });
  });

  describe("deleteMenu", () => {
    it("should soft delete menu successfully", async () => {
      // Mock existing menu with name
      const mockExistingMenu = [
        {
          id: mockMenuId,
          tenant_id: mockTenantId,
          name: "Menu to Delete",
        },
      ];

      const queryRawSpy = vi.spyOn(database, "$queryRaw");
      queryRawSpy.mockResolvedValueOnce(mockExistingMenu);

      const executeRawSpy = vi.spyOn(database, "$executeRaw");
      const createSpy = vi.spyOn(database.outboxEvent, "create");

      await deleteMenu(mockMenuId);

      // Verify soft delete was executed
      const executeRawCalls = executeRawSpy.mock.calls;
      const menuDeleteCall = executeRawCalls.find((call) => {
        const sql = call[0];
        return (
          sql?.strings?.join("").includes("UPDATE tenant_kitchen.menus") &&
          sql.strings.join("").includes("SET deleted_at = NOW()")
        );
      });

      expect(menuDeleteCall).toBeDefined();
      expect(menuDeleteCall?.[0].values).toContain(mockMenuId);
      expect(menuDeleteCall?.[0].values).toContain(mockTenantId);

      // Verify outbox event was enqueued with menu name
      expect(createSpy).toHaveBeenCalledWith({
        data: {
          tenantId: mockTenantId,
          aggregateType: "menu",
          aggregateId: mockMenuId,
          eventType: "menu.deleted",
          payload: {
            menuId: mockMenuId,
            name: "Menu to Delete",
          },
        },
      });

      // Verify revalidatePath was called twice
      expect(mocks.mockRevalidatePath).toHaveBeenCalledTimes(2);
      expect(mocks.mockRevalidatePath).toHaveBeenCalledWith(
        "/kitchen/recipes/menus"
      );
      expect(mocks.mockRevalidatePath).toHaveBeenCalledWith(
        `/kitchen/recipes/menus/${mockMenuId}`
      );
    });

    it("should throw error when menu ID is missing", async () => {
      await expect(deleteMenu("")).rejects.toThrow("Menu ID is required.");
    });

    it("should throw error when menu is not found", async () => {
      const queryRawSpy = vi.spyOn(database, "$queryRaw");
      queryRawSpy.mockResolvedValueOnce([]);

      await expect(deleteMenu(mockMenuId)).rejects.toThrow(
        "Menu not found or access denied."
      );
    });

    it("should throw error when menu belongs to different tenant", async () => {
      // Configure the mock directly instead of using spyOn
      database.$queryRaw = vi.fn().mockResolvedValueOnce([
        {
          id: mockMenuId,
          tenant_id: "different-tenant",
          name: "Menu",
        },
      ]);

      await expect(deleteMenu(mockMenuId)).rejects.toThrow(
        "Menu not found or access denied."
      );
    });
  });

  describe("addDishToMenu", () => {
    it("should add dish to menu successfully", async () => {
      // Mock existing menu
      const mockMenu = [
        {
          id: mockMenuId,
          tenant_id: mockTenantId,
          name: "Test Menu",
        },
      ];

      // Mock existing dish
      const mockDish = [
        {
          id: mockDishId,
          tenant_id: mockTenantId,
          name: "Test Dish",
        },
      ];

      // Mock no existing menu-dish relationship
      const mockNoExisting: unknown[] = [];

      // Mock max sort order
      const mockMaxSortOrder = [{ max_sort_order: 2 }];

      const queryRawSpy = vi.spyOn(database, "$queryRaw");
      queryRawSpy.mockResolvedValueOnce(mockMenu); // Verify menu
      queryRawSpy.mockResolvedValueOnce(mockDish); // Verify dish
      queryRawSpy.mockResolvedValueOnce(mockNoExisting); // Check existing
      queryRawSpy.mockResolvedValueOnce(mockMaxSortOrder); // Get max sort order

      const executeRawSpy = vi.spyOn(database, "$executeRaw");
      const createSpy = vi.spyOn(database.outboxEvent, "create");

      await addDishToMenu(mockMenuId, mockDishId, "main");

      // Verify menu-dish was inserted
      const executeRawCalls = executeRawSpy.mock.calls;
      const menuDishInsertCall = executeRawCalls.find((call) => {
        const sql = call[0];
        return sql?.strings
          ?.join("")
          .includes("INSERT INTO tenant_kitchen.menu_dishes");
      });

      expect(menuDishInsertCall).toBeDefined();
      expect(menuDishInsertCall?.[0].values).toContain(mockTenantId);
      expect(menuDishInsertCall?.[0].values).toContain(mockMenuId);
      expect(menuDishInsertCall?.[0].values).toContain(mockDishId);
      expect(menuDishInsertCall?.[0].values).toContain("main");
      expect(menuDishInsertCall?.[0].values).toContain(3); // Next sort order (2 + 1)

      // Verify outbox event was enqueued
      expect(createSpy).toHaveBeenCalledWith({
        data: {
          tenantId: mockTenantId,
          aggregateType: "menu",
          aggregateId: mockMenuId,
          eventType: "menu.dish_added",
          payload: {
            menuId: mockMenuId,
            dishId: mockDishId,
            menuDishId: "test-uuid-123",
            course: "main",
          },
        },
      });

      // Verify revalidatePath was called twice
      expect(mocks.mockRevalidatePath).toHaveBeenCalledTimes(2);
    });

    it("should throw error when menu ID is missing", async () => {
      await expect(addDishToMenu("", mockDishId)).rejects.toThrow(
        "Menu ID is required."
      );
    });

    it("should throw error when dish ID is missing", async () => {
      await expect(addDishToMenu(mockMenuId, "")).rejects.toThrow(
        "Dish ID is required."
      );
    });

    it("should throw error when menu is not found", async () => {
      const queryRawSpy = vi.spyOn(database, "$queryRaw");
      queryRawSpy.mockResolvedValueOnce([]); // No menu found

      await expect(addDishToMenu(mockMenuId, mockDishId)).rejects.toThrow(
        "Menu not found or access denied."
      );
    });

    it("should throw error when dish is not found", async () => {
      const mockMenu = [
        {
          id: mockMenuId,
          tenant_id: mockTenantId,
          name: "Test Menu",
        },
      ];

      const queryRawSpy = vi.spyOn(database, "$queryRaw");
      queryRawSpy.mockResolvedValueOnce(mockMenu);
      queryRawSpy.mockResolvedValueOnce([]); // No dish found

      await expect(addDishToMenu(mockMenuId, mockDishId)).rejects.toThrow(
        "Dish not found or access denied."
      );
    });

    it("should throw error when dish is already in menu", async () => {
      const mockMenu = [
        {
          id: mockMenuId,
          tenant_id: mockTenantId,
          name: "Test Menu",
        },
      ];

      const mockDish = [
        {
          id: mockDishId,
          tenant_id: mockTenantId,
          name: "Test Dish",
        },
      ];

      const mockExistingMenuDish = [{ id: "existing-id" }];

      const queryRawSpy = vi.spyOn(database, "$queryRaw");
      queryRawSpy.mockResolvedValueOnce(mockMenu);
      queryRawSpy.mockResolvedValueOnce(mockDish);
      queryRawSpy.mockResolvedValueOnce(mockExistingMenuDish); // Already exists

      await expect(addDishToMenu(mockMenuId, mockDishId)).rejects.toThrow(
        "Dish is already in the menu."
      );
    });

    it("should handle first dish (no existing dishes)", async () => {
      const mockMenu = [
        {
          id: mockMenuId,
          tenant_id: mockTenantId,
          name: "Test Menu",
        },
      ];

      const mockDish = [
        {
          id: mockDishId,
          tenant_id: mockTenantId,
          name: "Test Dish",
        },
      ];

      const mockNoExisting: unknown[] = [];
      const mockMaxSortOrder = [{ max_sort_order: null }]; // No existing dishes

      const queryRawSpy = vi.spyOn(database, "$queryRaw");
      queryRawSpy.mockResolvedValueOnce(mockMenu);
      queryRawSpy.mockResolvedValueOnce(mockDish);
      queryRawSpy.mockResolvedValueOnce(mockNoExisting);
      queryRawSpy.mockResolvedValueOnce(mockMaxSortOrder);

      const executeRawSpy = vi.spyOn(database, "$executeRaw");

      await addDishToMenu(mockMenuId, mockDishId);

      const executeRawCalls = executeRawSpy.mock.calls;
      const menuDishInsertCall = executeRawCalls.find((call) => {
        const sql = call[0];
        return sql?.strings
          ?.join("")
          .includes("INSERT INTO tenant_kitchen.menu_dishes");
      });

      // First dish should have sort order 1
      expect(menuDishInsertCall?.[0].values).toContain(1);
    });
  });

  describe("removeDishFromMenu", () => {
    it("should remove dish from menu successfully", async () => {
      // Mock existing menu-dish relationship
      const mockMenuDish = [
        {
          id: "test-menu-dish-id",
          menu_id: mockMenuId,
          dish_id: mockDishId,
        },
      ];

      const queryRawSpy = vi.spyOn(database, "$queryRaw");
      queryRawSpy.mockResolvedValueOnce(mockMenuDish);

      const executeRawSpy = vi.spyOn(database, "$executeRaw");
      const createSpy = vi.spyOn(database.outboxEvent, "create");

      await removeDishFromMenu(mockMenuId, mockDishId);

      // Verify soft delete was executed
      const executeRawCalls = executeRawSpy.mock.calls;
      const menuDishDeleteCall = executeRawCalls.find((call) => {
        const sql = call[0];
        return (
          sql?.strings
            ?.join("")
            .includes("UPDATE tenant_kitchen.menu_dishes") &&
          sql.strings.join("").includes("SET deleted_at = NOW()")
        );
      });

      expect(menuDishDeleteCall).toBeDefined();
      expect(menuDishDeleteCall?.[0].values).toContain(mockMenuId);
      expect(menuDishDeleteCall?.[0].values).toContain(mockDishId);

      // Verify outbox event was enqueued
      expect(createSpy).toHaveBeenCalledWith({
        data: {
          tenantId: mockTenantId,
          aggregateType: "menu",
          aggregateId: mockMenuId,
          eventType: "menu.dish_removed",
          payload: {
            menuId: mockMenuId,
            dishId: mockDishId,
            menuDishId: "test-menu-dish-id",
          },
        },
      });

      // Verify revalidatePath was called twice
      expect(mocks.mockRevalidatePath).toHaveBeenCalledTimes(2);
    });

    it("should throw error when menu ID is missing", async () => {
      await expect(removeDishFromMenu("", mockDishId)).rejects.toThrow(
        "Menu ID is required."
      );
    });

    it("should throw error when dish ID is missing", async () => {
      await expect(removeDishFromMenu(mockMenuId, "")).rejects.toThrow(
        "Dish ID is required."
      );
    });

    it("should throw error when dish is not in menu", async () => {
      const queryRawSpy = vi.spyOn(database, "$queryRaw");
      queryRawSpy.mockResolvedValueOnce([]); // No relationship found

      await expect(removeDishFromMenu(mockMenuId, mockDishId)).rejects.toThrow(
        "Dish is not in the menu or access denied."
      );
    });
  });

  describe("reorderMenuDishes", () => {
    it("should reorder dishes successfully", async () => {
      const dishIds = ["dish-1", "dish-2", "dish-3"];

      // Mock existing menu
      const mockMenu = [
        {
          id: mockMenuId,
          tenant_id: mockTenantId,
        },
      ];

      // Mock existing menu dishes
      const mockMenuDishes = [
        { dish_id: "dish-1" },
        { dish_id: "dish-2" },
        { dish_id: "dish-3" },
      ];

      const queryRawSpy = vi.spyOn(database, "$queryRaw");
      queryRawSpy.mockResolvedValueOnce(mockMenu); // Verify menu
      queryRawSpy.mockResolvedValueOnce(mockMenuDishes); // Verify dishes

      const executeRawSpy = vi.spyOn(database, "$executeRaw");
      const createSpy = vi.spyOn(database.outboxEvent, "create");

      await reorderMenuDishes(mockMenuId, dishIds);

      // Verify sort order updates were called 3 times (once per dish)
      const executeRawCalls = executeRawSpy.mock.calls;
      const sortOrderUpdates = executeRawCalls.filter((call) => {
        const sql = call[0];
        return (
          sql?.strings
            ?.join("")
            .includes("UPDATE tenant_kitchen.menu_dishes") &&
          sql.strings.join("").includes("sort_order")
        );
      });

      expect(sortOrderUpdates.length).toBe(3);

      // Verify each dish got correct sort order
      sortOrderUpdates.forEach((call, index) => {
        expect(call[0].values).toContain(index + 1); // Sort orders 1, 2, 3
      });

      // Verify outbox event was enqueued
      expect(createSpy).toHaveBeenCalledWith({
        data: {
          tenantId: mockTenantId,
          aggregateType: "menu",
          aggregateId: mockMenuId,
          eventType: "menu.dishes_reordered",
          payload: {
            menuId: mockMenuId,
            dishIds,
          },
        },
      });

      // Verify revalidatePath was called twice
      expect(mocks.mockRevalidatePath).toHaveBeenCalledTimes(2);
    });

    it("should throw error when menu ID is missing", async () => {
      await expect(reorderMenuDishes("", ["dish-1"])).rejects.toThrow(
        "Menu ID is required."
      );
    });

    it("should throw error when dish IDs array is missing", async () => {
      await expect(reorderMenuDishes(mockMenuId, [])).rejects.toThrow(
        "Dish IDs array is required."
      );
    });

    it("should throw error when dish IDs array is not provided", async () => {
      await expect(
        reorderMenuDishes(mockMenuId, null as unknown as string[])
      ).rejects.toThrow("Dish IDs array is required.");
    });

    it("should throw error when menu is not found", async () => {
      const queryRawSpy = vi.spyOn(database, "$queryRaw");
      queryRawSpy.mockResolvedValueOnce([]); // No menu found

      await expect(reorderMenuDishes(mockMenuId, ["dish-1"])).rejects.toThrow(
        "Menu not found or access denied."
      );
    });

    it("should throw error when one or more dishes are not in menu", async () => {
      // Mock existing menu
      const mockMenu = [
        {
          id: mockMenuId,
          tenant_id: mockTenantId,
        },
      ];

      // Mock only 2 of 3 dishes found in menu
      const mockMenuDishes = [{ dish_id: "dish-1" }, { dish_id: "dish-2" }];

      const queryRawSpy = vi.spyOn(database, "$queryRaw");
      queryRawSpy.mockResolvedValueOnce(mockMenu);
      queryRawSpy.mockResolvedValueOnce(mockMenuDishes); // Only 2 found, but 3 requested

      await expect(
        reorderMenuDishes(mockMenuId, ["dish-1", "dish-2", "dish-3"])
      ).rejects.toThrow(
        "One or more dishes not found in menu or access denied."
      );
    });
  });
});
