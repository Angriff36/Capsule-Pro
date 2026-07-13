/**
 * @vitest-environment node
 *
 * Why this matters (db-performance plan item #14): the inventory-import route
 * (apps/app/app/api/inventory/import/route.ts) ran ONE $queryRaw existence
 * check PER uploaded row — an N-row sheet paid N sequential round-trips before
 * the first governed write. All rows share one tenantId and only `id` (keyed by
 * item_number) is needed to decide update-vs-create, so a single
 * `item_number IN (...)` preload into a Map collapses N reads → 1.
 *
 * InventoryItem has NO unique constraint on item_number, so the preload Map is
 * also fed the new id from each successful create — a later row with the SAME
 * item_number must UPDATE the just-created row (the prior serial code found it
 * via its per-item re-query). This test pins three properties a future change
 * could regress:
 *  1. $queryRaw fires exactly ONCE regardless of row count (the N+1 collapse).
 *  2. The preload Map drives update-vs-create (pre-existing → update; absent → create).
 *  3. A repeated item_number in one sheet: first creates, second UPDATEs that
 *     just-created id (behavior-preserving feed-back — no duplicate row).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import * as XLSX from "xlsx";

vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@/app/lib/tenant", () => ({
  requireCurrentUser: vi.fn(),
  requireTenantId: vi.fn(),
}));
vi.mock("@/lib/manifest-command", () => ({ runManifestCommand: vi.fn() }));

// Full mock (no importOriginal) avoids instantiating a real Prisma client at
// import. Only `Prisma.Decimal` (builds item rows) and `Prisma.join` (the
// preload IN-list) are exercised at runtime; both are stubbed. The governed
// writes stay on the mocked runManifestCommand, so the Decimal value is never
// serialized — the stub never needs to behave like real decimal.js.
vi.mock("@repo/database", () => {
  // erasableSyntaxOnly forbids parameter properties, so declare the field.
  class MockDecimal {
    value: unknown;
    constructor(value: unknown) {
      this.value = value;
    }
  }
  return {
    database: { $queryRaw: vi.fn() },
    Prisma: {
      Decimal: MockDecimal,
      join: (arr: readonly unknown[]) => arr,
    },
  };
});

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { requireCurrentUser, requireTenantId } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest-command";
import { POST } from "../../app/api/inventory/import/route";

const authMock = auth as unknown as ReturnType<typeof vi.fn>;
const requireUser = requireCurrentUser as ReturnType<typeof vi.fn>;
const requireTenant = requireTenantId as ReturnType<typeof vi.fn>;
const queryRaw = database.$queryRaw as unknown as ReturnType<typeof vi.fn>;
const manifestCmd = runManifestCommand as ReturnType<typeof vi.fn>;

const TENANT_ID = "tenant-1";
const ORG_ID = "org-1";

type Row = [productId: string, title: string, inStock: number, flatFee: number];

/** Build an Inventory .xlsx with data rows; the header is fixed at row index 3. */
function buildInventoryXlsx(dataRows: Row[]): Uint8Array {
  // Rows 0-2 are filler (sheet_to_json skips BLANK rows, which would shift the
  // header off index 3); they carry a non-empty cell so they survive the parse
  // and keep the header pinned at raw[3] as the route expects.
  const aoa: unknown[][] = [
    ["meta"],
    ["meta"],
    ["meta"],
    [
      "Product ID",
      "Title",
      "Primary Category",
      "Sub Category",
      "In Stock",
      "Flat Fee Price",
    ],
    ...dataRows.map(([productId, title, inStock, flatFee]) => [
      productId,
      title,
      "",
      "",
      inStock,
      flatFee,
    ]),
  ];
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  XLSX.utils.book_append_sheet(wb, ws, "Inventory");
  return new Uint8Array(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
}

function buildRequest(xlsx: Uint8Array): NextRequest {
  const fd = new FormData();
  // TS 5.7 made Uint8Array generic (`Uint8Array<ArrayBufferLike>`), which no
  // longer structurally satisfies BlobPart — bridge the lib quirk at the cast.
  fd.append("file", new File([xlsx as unknown as BlobPart], "inventory.xlsx"));
  return new NextRequest("http://localhost/api/inventory/import", {
    method: "POST",
    body: fd,
  });
}

/** Capture each governed call as [command, instanceId] for sequence assertions. */
const calls = () =>
  manifestCmd.mock.calls.map((c) => [c[0].command, c[0].instanceId] as const);

describe("inventory import — preload existence check (plan #14)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ orgId: ORG_ID });
    requireTenant.mockResolvedValue(TENANT_ID);
    requireUser.mockResolvedValue({ id: "u1", tenantId: TENANT_ID, role: "admin" });
    // Default: no pre-existing items.
    queryRaw.mockResolvedValue([]);
    manifestCmd.mockImplementation(async (params) => {
      if (params.command === "update") {
        return {
          ok: true,
          entity: params.entity,
          command: "update",
          result: { id: params.instanceId },
        };
      }
      return {
        ok: true,
        entity: params.entity,
        command: "create",
        result: { id: `new-${(params.body as { item_number?: string }).item_number}` },
      };
    });
  });

  it("issues ONE $queryRaw regardless of row count and routes update-vs-create from the preload Map", async () => {
    // SKU-1 pre-exists (→ update); SKU-2/3 absent (→ create).
    queryRaw.mockResolvedValue([{ item_number: "SKU-1", id: "existing-1" }]);

    const res = await POST(
      buildRequest(
        buildInventoryXlsx([
          ["SKU-1", "Widget", 10, 5],
          ["SKU-2", "Gadget", 3, 2],
          ["SKU-3", "Gizmo", 0, 0],
        ]),
      ),
    );
    const body = await res.json();

    // N+1 collapse: ONE preload query for 3 rows (was 3 serial existence checks).
    expect(queryRaw).toHaveBeenCalledTimes(1);
    // 1 update (pre-existing) + 2 creates.
    expect(manifestCmd).toHaveBeenCalledTimes(3);
    expect(calls()).toEqual([
      ["update", "existing-1"], // SKU-1 pre-existing
      ["create", undefined], // SKU-2 absent
      ["create", undefined], // SKU-3 absent
    ]);
    expect(body).toEqual({ success: true, total: 3, created: 2, updated: 1, errors: 0 });
  });

  it("feeds a created id back so a repeated item_number in the SAME sheet updates, not duplicates", async () => {
    // SKU-DUP absent from the preload; the sheet lists it twice.
    queryRaw.mockResolvedValue([]);

    const res = await POST(
      buildRequest(
        buildInventoryXlsx([
          ["SKU-DUP", "First", 1, 1],
          ["SKU-DUP", "Second", 2, 2],
        ]),
      ),
    );
    const body = await res.json();

    expect(queryRaw).toHaveBeenCalledTimes(1);
    expect(calls()).toEqual([
      ["create", undefined], // first occurrence creates
      ["update", "new-SKU-DUP"], // second occurrence UPDATEs the fed-back id
    ]);
    expect(body).toEqual({ success: true, total: 2, created: 1, updated: 1, errors: 0 });
  });

  it("returns 401 before any DB read when unauthenticated", async () => {
    authMock.mockResolvedValue({ orgId: null });

    const res = await POST(buildRequest(buildInventoryXlsx([["SKU-1", "X", 1, 1]])));

    expect(res.status).toBe(401);
    expect(queryRaw).not.toHaveBeenCalled();
    expect(manifestCmd).not.toHaveBeenCalled();
  });
});
