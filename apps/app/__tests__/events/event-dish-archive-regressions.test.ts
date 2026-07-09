/**
 * @vitest-environment node
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@repo/auth/server", () => ({
  auth: vi.fn().mockResolvedValue({ orgId: "org-1", userId: "user-1" }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/manifest-command", () => ({
  runManifestCommand: vi.fn(),
}));

vi.mock("@repo/database", async () => {
  const actual = await vi.importActual<typeof import("@repo/database")>(
    "@repo/database"
  );
  return {
    ...actual,
    database: {
      $queryRaw: vi.fn(),
      dish: { findFirst: vi.fn() },
      eventDish: { updateMany: vi.fn() },
    },
  };
});

import { database } from "@repo/database";
import { runManifestCommand } from "@/lib/manifest-command";
import * as tenantModule from "../../app/lib/tenant";
import {
  createDishVariantForEvent,
  getAvailableDishes,
  getEventDishes,
  getRecipesForDishCreation,
} from "../../app/(authenticated)/(events)/events/actions/event-dishes";

interface SqlMock {
  strings: TemplateStringsArray;
  values: unknown[];
}

function isSqlMock(value: unknown): value is SqlMock {
  return (
    typeof value === "object" &&
    value !== null &&
    "strings" in value &&
    "values" in value
  );
}

function sqlText(value: unknown): string {
  return isSqlMock(value) ? value.strings.join("") : "";
}

describe("event dish archive regressions", () => {
  beforeEach(() => {
    vi.spyOn(tenantModule, "getTenantIdForOrg").mockResolvedValue("tenant-1");
    vi.spyOn(tenantModule, "requireCurrentUser").mockResolvedValue({
      id: "user-1",
      tenantId: "tenant-1",
      role: "admin",
      email: "test@example.com",
      firstName: "Test",
      lastName: "User",
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps archived recipes out of recipe selection", async () => {
    const queryRawSpy = vi
      .spyOn(database, "$queryRaw")
      .mockResolvedValueOnce([]);

    await getRecipesForDishCreation();

    const sql = queryRawSpy.mock.calls[0]?.[0];
    expect(isSqlMock(sql)).toBe(true);
    expect(sqlText(sql)).toContain("deleted_at IS NULL");
  });

  it("keeps archived dishes out of new event selection", async () => {
    const queryRawSpy = vi
      .spyOn(database, "$queryRaw")
      .mockResolvedValueOnce([{ dish_id: "dish-1" }])
      .mockResolvedValueOnce([]);

    await getAvailableDishes("event-1");

    const sql = queryRawSpy.mock.calls.find((call) =>
      sqlText(call[0]).includes("FROM tenant_kitchen.dishes d")
    )?.[0];
    expect(isSqlMock(sql)).toBe(true);
    expect(sqlText(sql)).toContain("d.deleted_at IS NULL");
    expect(sqlText(sql)).toContain("r.deleted_at IS NULL");
  });

  it("keeps archived recipes visible on committed event dishes", async () => {
    const queryRawSpy = vi
      .spyOn(database, "$queryRaw")
      .mockResolvedValueOnce([]);

    await getEventDishes("event-1");

    const sql = queryRawSpy.mock.calls[0]?.[0];
    expect(isSqlMock(sql)).toBe(true);
    expect(sqlText(sql)).not.toContain("r.deleted_at IS NULL");
  });

  it("creates a variant from an archived dish already committed to the event", async () => {
    vi.spyOn(database, "$queryRaw").mockImplementation((sql) => {
      const text = sqlText(sql);
      if (text.includes("FROM tenant_events.event_dishes")) {
        if (text.includes("SELECT dish_id")) {
          return Promise.resolve([{ dish_id: "dish-1" }]) as never;
        }

        return Promise.resolve([
          {
            recipeId: "recipe-1",
            description: "desc",
            category: "cat",
            serviceStyle: "buffet",
            defaultContainerId: null,
            presentationImageUrl: null,
            minPrepLeadDays: 1,
            maxPrepLeadDays: 2,
            portionSizeDescription: "plate",
            dietaryTags: [],
            allergens: [],
            pricePerPerson: 12,
            costPerPerson: 7,
          },
        ]) as never;
      }

      return Promise.resolve([]) as never;
    });
    vi.spyOn(database.eventDish, "updateMany").mockResolvedValue({ count: 1 });
    vi.mocked(runManifestCommand).mockResolvedValue({
      ok: true,
      entity: "Dish",
      command: "create",
      result: { id: "variant-1" },
    });

    await expect(
      createDishVariantForEvent("event-1", "link-1", "Archived Variant")
    ).resolves.toMatchObject({ success: true, dishId: "variant-1" });
  });
});
