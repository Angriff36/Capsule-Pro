import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { type NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { requireCurrentUser, requireTenantId } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest-command";

export async function POST(request: NextRequest) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await requireTenantId();

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!(file.name.endsWith(".xlsx") || file.name.endsWith(".xls"))) {
      return NextResponse.json(
        { error: "File must be .xlsx or .xls" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);
    const wb = XLSX.read(buffer, { type: "array", cellDates: true });
    const ws = wb.Sheets.Inventory;

    if (!ws) {
      return NextResponse.json(
        { error: "Sheet 'Inventory' not found in workbook" },
        { status: 400 }
      );
    }

    const raw = XLSX.utils.sheet_to_json<unknown[]>(ws, {
      header: 1,
    }) as unknown[][];

    // Header row at index 3 (0-indexed), data starts at index 4
    if (raw.length < 5) {
      return NextResponse.json(
        { error: "File has no data rows" },
        { status: 400 }
      );
    }

    const headers = raw[3];
    if (!headers) {
      return NextResponse.json(
        { error: "File has no data rows" },
        { status: 400 }
      );
    }
    const colIndex: Record<string, number> = {};
    for (let i = 0; i < headers.length; i++) {
      const h = String(headers[i] ?? "").trim();
      if (h) {
        colIndex[h] = i;
      }
    }

    const items: Array<{
      tenantId: string;
      item_number: string;
      name: string;
      category: string;
      unitOfMeasure: string;
      unitCost: Prisma.Decimal;
      quantityOnHand: Prisma.Decimal;
      tags: string[];
      createdAt: Date;
      updatedAt: Date;
    }> = [];

    for (let i = 4; i < raw.length; i++) {
      const row = raw[i];
      if (!row) {
        continue;
      }
      const productId = String(row[colIndex["Product ID"] ?? -1] ?? "").trim();
      if (!productId || productId === "undefined" || productId === "null") {
        continue;
      }

      const name = String(row[colIndex.Title ?? -1] ?? "").trim();
      const primaryCat = String(
        row[colIndex["Primary Category"] ?? -1] ?? ""
      ).trim();
      const subCat = String(row[colIndex["Sub Category"] ?? -1] ?? "").trim();
      const category = primaryCat || subCat || "Uncategorized";

      const inStockRaw = row[colIndex["In Stock"] ?? -1];
      const inStock =
        inStockRaw === undefined || inStockRaw === null || inStockRaw === ""
          ? 0
          : Number(inStockRaw);

      const flatFeeRaw = row[colIndex["Flat Fee Price"] ?? -1];
      const flatFee =
        flatFeeRaw === undefined || flatFeeRaw === null || flatFeeRaw === ""
          ? 0
          : Number(flatFeeRaw);

      // Tags from attributes
      const tagKeys = [
        "Attr::Color",
        "Attr::Material",
        "Attr::Size",
        "Attr::Style",
        "Attr::Shape",
        "Attr::Type",
      ];
      const tags: string[] = [];
      for (const key of tagKeys) {
        const val = row[colIndex[key] ?? -1];
        if (val !== undefined && val !== null && String(val).trim() !== "") {
          tags.push(String(val).trim());
        }
      }

      items.push({
        tenantId,
        item_number: productId,
        name: name || productId,
        category,
        unitOfMeasure: "each",
        unitCost: new Prisma.Decimal(flatFee || 0),
        quantityOnHand: new Prisma.Decimal(inStock || 0),
        tags,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    if (items.length === 0) {
      return NextResponse.json(
        { error: "No valid items found in file" },
        { status: 400 }
      );
    }

    // Upsert each item
    let created = 0;
    let updated = 0;
    let errors = 0;

    const user = await requireCurrentUser();

    // Preload every existing item id for this import's item_numbers in ONE
    // query (was one $queryRaw PER item — N round-trips on an N-row sheet).
    // All rows share the resolved tenantId; only `id` (keyed by item_number)
    // is needed to decide update-vs-create.
    const itemNumbers = [...new Set(items.map((item) => item.item_number))];
    const existingRows = await database.$queryRaw<
      { item_number: string; id: string }[]
    >`
      SELECT item_number, id FROM tenant_inventory.inventory_items
      WHERE tenant_id = ${tenantId}
        AND item_number IN (${Prisma.join(itemNumbers)})
        AND deleted_at IS NULL
    `;
    const existingByItemNumber = new Map<string, string>();
    for (const row of existingRows) {
      // First row per item_number wins — mirrors the prior per-item LIMIT 1.
      if (!existingByItemNumber.has(row.item_number)) {
        existingByItemNumber.set(row.item_number, row.id);
      }
    }

    for (const item of items) {
      try {
        const existingId = existingByItemNumber.get(item.item_number);

        const userCtx = {
          id: user.id,
          tenantId: user.tenantId,
          role: user.role,
        };

        if (existingId) {
          const result = await runManifestCommand({
            entity: "InventoryItem",
            command: "update",
            instanceId: existingId,
            body: {
              name: item.name,
              category: item.category,
              unitOfMeasure: item.unitOfMeasure,
              unitCost: item.unitCost,
              quantityOnHand: item.quantityOnHand,
              tags: item.tags,
            },
            user: userCtx,
          });
          if (result.ok) {
            updated++;
          } else {
            errors++;
          }
        } else {
          const result = await runManifestCommand({
            entity: "InventoryItem",
            command: "create",
            body: {
              tenantId: item.tenantId,
              item_number: item.item_number,
              name: item.name,
              category: item.category,
              unitOfMeasure: item.unitOfMeasure,
              unitCost: item.unitCost,
              quantityOnHand: item.quantityOnHand,
              tags: item.tags,
            },
            user: userCtx,
          });
          if (result.ok) {
            created++;
            // Feed the new id back so a later row with the SAME item_number
            // UPDATEs it instead of creating a duplicate. InventoryItem has no
            // unique constraint on item_number, so without this a repeated SKU
            // in one sheet would create a 2nd row (the prior serial code found
            // the just-created row via its per-item re-query and updated it).
            const createdId = (
              result.result as { id?: string } | null | undefined
            )?.id;
            if (typeof createdId === "string") {
              existingByItemNumber.set(item.item_number, createdId);
            }
          } else {
            errors++;
          }
        }
      } catch {
        errors++;
      }
    }

    return NextResponse.json({
      success: true,
      total: items.length,
      created,
      updated,
      errors,
    });
  } catch (error) {
    console.error("Inventory import error:", error);
    return NextResponse.json({ error: "Import failed" }, { status: 500 });
  }
}
