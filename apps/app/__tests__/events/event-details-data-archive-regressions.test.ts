/**
 * @vitest-environment node
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { database } from "@repo/database";
import {
  getEventDishes,
  getRecipeVersions,
} from "../../app/(authenticated)/(events)/events/[eventId]/event-details-data";

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

describe("event details archived recipe joins", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps archived recipes visible on committed event dishes", async () => {
    const queryRawSpy = vi
      .spyOn(database, "$queryRaw")
      .mockResolvedValueOnce([]);

    await getEventDishes("tenant-1", "event-1");

    const sql = queryRawSpy.mock.calls.find((call) =>
      sqlText(call[0]).includes("FROM tenant_events.event_dishes")
    )?.[0];
    expect(isSqlMock(sql)).toBe(true);
    expect(sqlText(sql)).not.toContain("r.deleted_at IS NULL");
  });

  it("keeps archived recipes visible when loading recipe versions for committed dishes", async () => {
    const queryRawSpy = vi
      .spyOn(database, "$queryRaw")
      .mockResolvedValueOnce([]);

    await getRecipeVersions("tenant-1", ["recipe-1"]);

    const sql = queryRawSpy.mock.calls.find((call) =>
      sqlText(call[0]).includes("FROM tenant_kitchen.recipe_versions")
    )?.[0];
    expect(isSqlMock(sql)).toBe(true);
    expect(sqlText(sql)).not.toContain("r.deleted_at IS NULL");
  });
});
