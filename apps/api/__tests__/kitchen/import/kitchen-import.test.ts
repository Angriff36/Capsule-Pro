/**
 * Kitchen bulk import tests — CSV parsing and route validation.
 *
 * @vitest-environment node
 */

import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseCsv } from "@/app/api/kitchen/import/lib/csv";
import {
  parseBoolOpt,
  parseListOpt,
  trimOpt,
} from "@/app/api/kitchen/import/lib/parse-helpers";

vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
  resolveCurrentUser: vi.fn(),
}));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));
vi.mock("@/lib/manifest-runtime", () => ({ createManifestRuntime: vi.fn() }));
vi.mock("@repo/manifest-runtime/run-manifest-command-core", () => ({
  runManifestCommandCore: vi.fn(),
}));
vi.mock("@repo/database", () => ({
  database: {
    recipe: { findFirst: vi.fn() },
    recipeVersion: { findFirst: vi.fn() },
    ingredient: { findFirst: vi.fn() },
    dish: { findFirst: vi.fn() },
    event: { findFirst: vi.fn() },
    location: { findFirst: vi.fn() },
    $queryRaw: vi.fn(),
  },
  Prisma: { Decimal: class DecimalMock {} },
}));

const { auth } = await import("@repo/auth/server");
const { getTenantIdForOrg, resolveCurrentUser } = await import(
  "@/app/lib/tenant"
);

describe("kitchen import CSV parsing", () => {
  it("parses quoted CSV fields with commas", () => {
    const csv = `name,description
"Tomato Sauce","Rich, slow-cooked sauce"
Basil,Fresh`;

    const rows = parseCsv(csv);

    expect(rows).toHaveLength(2);
    expect(rows[0].name).toBe("Tomato Sauce");
    expect(rows[0].description).toBe("Rich, slow-cooked sauce");
    expect(rows[1].name).toBe("Basil");
  });

  it("returns empty array when only a header row is present", () => {
    expect(parseCsv("name,category\n")).toEqual([]);
  });
});

describe("kitchen import parse helpers", () => {
  it("parses semicolon-separated allergen lists", () => {
    expect(parseListOpt("dairy; gluten; nuts")).toEqual([
      "dairy",
      "gluten",
      "nuts",
    ]);
  });

  it("parses boolean optional flags", () => {
    expect(parseBoolOpt("yes")).toBe(true);
    expect(parseBoolOpt("0")).toBe(false);
    expect(parseBoolOpt(undefined)).toBe(false);
  });

  it("trims optional strings", () => {
    expect(trimOpt("  flour  ")).toBe("flour");
    expect(trimOpt("   ")).toBeNull();
  });
});

describe("POST /api/kitchen/import", () => {
  beforeEach(() => {
    vi.mocked(auth).mockResolvedValue({
      orgId: "org-1",
      userId: "user-1",
    } as never);
    vi.mocked(getTenantIdForOrg).mockResolvedValue("tenant-1");
    vi.mocked(resolveCurrentUser).mockResolvedValue({
      id: "user-1",
      tenantId: "tenant-1",
      role: "admin",
    } as never);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unknown import types", async () => {
    const { POST } = await import("@/app/api/kitchen/import/route");
    const formData = new FormData();
    formData.append(
      "files",
      new File(["name\nFlour"], "ingredients.csv", { type: "text/csv" })
    );

    const response = await POST(
      new NextRequest("http://localhost/api/kitchen/import?type=unknown", {
        method: "POST",
        body: formData,
      })
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.message).toContain("invalid");
  });

  it("accepts ingredients import type and returns summary shape", async () => {
    const { runManifestCommandCore } = await import(
      "@repo/manifest-runtime/run-manifest-command-core"
    );
    const { database } = await import("@repo/database");

    vi.mocked(database.ingredient.findFirst).mockResolvedValue(null);
    vi.mocked(database.$queryRaw).mockResolvedValue([{ id: 1, code: "ea" }]);
    vi.mocked(runManifestCommandCore).mockResolvedValue({
      ok: true,
      result: { id: "ingredient-1" },
    } as never);

    const { POST } = await import("@/app/api/kitchen/import/route");
    const formData = new FormData();
    formData.append(
      "files",
      new File(
        ["name,category,default_unit\nAll-Purpose Flour,baking,ea"],
        "ingredients.csv",
        { type: "text/csv" }
      )
    );

    const response = await POST(
      new NextRequest("http://localhost/api/kitchen/import?type=ingredients", {
        method: "POST",
        body: formData,
      })
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.imported).toBe(1);
    expect(body.data.created[0]).toContain("All-Purpose Flour");
  });
});
