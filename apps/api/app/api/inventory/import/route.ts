/**
 * Inventory CSV Import API
 *
 * POST /api/inventory/import - Import inventory items from CSV
 *
 * CSV format (header row required):
 *   item_number, name, category, unit_cost, quantity_on_hand, reorder_level, tags, fsa_status
 *
 * All fields except item_number and name are optional.
 * category: dairy, meat, poultry, seafood, produce, dry_goods, frozen, beverages, supplies, equipment, other
 * fsa_status: unknown, requires_review, compliant, non_compliant, exempt
 * tags: comma-separated string (e.g. "organic,gluten-free")
 */

import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import type { FSAStatus, ItemCategory } from "../items/types";
import { FSA_STATUSES, ITEM_CATEGORIES } from "../items/types";

interface ImportResult {
  success: number;
  errors: Array<{ row: number; message: string }>;
}

interface ParsedRow {
  row: number;
  item_number: string;
  name: string;
  category?: string;
  unit_cost?: number;
  quantity_on_hand?: number;
  reorder_level?: number;
  tags?: string[];
  fsa_status?: FSAStatus;
}

const VALID_CATEGORIES = new Set(ITEM_CATEGORIES);
const VALID_FSA_STATUSES = new Set(FSA_STATUSES);

/**
 * Parse a single CSV line, handling quoted fields
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Parse tags from CSV string (comma-separated)
 */
function parseTags(tagStr: string | undefined): string[] | undefined {
  if (!tagStr || tagStr.trim() === "") return undefined;
  const tags = tagStr
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  return tags.length > 0 ? tags : undefined;
}

/**
 * Validate and parse a single row
 */
function parseRow(
  line: string,
  rowNum: number
): { row: ParsedRow; error?: string } {
  const fields = parseCSVLine(line);

  if (fields.length < 2) {
    return {
      row: { row: rowNum, item_number: "", name: "" },
      error: "Row must have at least item_number and name",
    };
  }

  const item_number = fields[0].trim();
  const name = fields[1].trim();

  if (!item_number) {
    return {
      row: { row: rowNum, item_number: "", name: "" },
      error: "item_number is required",
    };
  }
  if (!name) {
    return {
      row: { row: rowNum, item_number, name: "" },
      error: "name is required",
    };
  }

  const category = fields[2]?.trim();
  if (category && !VALID_CATEGORIES.has(category as ItemCategory)) {
    return {
      row: { row: rowNum, item_number, name, category },
      error: `Invalid category: ${category}`,
    };
  }

  const unitCostStr = fields[3]?.trim();
  const unit_cost = unitCostStr ? Number.parseFloat(unitCostStr) : undefined;
  if (unitCostStr && Number.isNaN(unit_cost!)) {
    return {
      row: { row: rowNum, item_number, name, unit_cost: Number.NaN },
      error: `Invalid unit_cost: ${unitCostStr}`,
    };
  }

  const qtyStr = fields[4]?.trim();
  const quantity_on_hand = qtyStr ? Number.parseFloat(qtyStr) : undefined;
  if (qtyStr && Number.isNaN(quantity_on_hand!)) {
    return {
      row: { row: rowNum, item_number, name },
      error: `Invalid quantity_on_hand: ${qtyStr}`,
    };
  }

  const reorderStr = fields[5]?.trim();
  const reorder_level = reorderStr ? Number.parseFloat(reorderStr) : undefined;
  if (reorderStr && Number.isNaN(reorder_level!)) {
    return {
      row: { row: rowNum, item_number, name },
      error: `Invalid reorder_level: ${reorderStr}`,
    };
  }

  const tags = parseTags(fields[6]);

  const fsa_status = fields[7]?.trim() as FSAStatus | undefined;
  if (fsa_status && !VALID_FSA_STATUSES.has(fsa_status)) {
    return {
      row: { row: rowNum, item_number, name, fsa_status },
      error: `Invalid fsa_status: ${fsa_status}`,
    };
  }

  return {
    row: {
      row: rowNum,
      item_number,
      name,
      category,
      unit_cost,
      quantity_on_hand,
      reorder_level,
      tags,
      fsa_status,
    },
  };
}

/**
 * POST /api/inventory/import
 */
export async function POST(request: NextRequest) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json(
        { message: "Tenant not found" },
        { status: 404 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { message: "No file provided" },
        { status: 400 }
      );
    }

    if (!file.name.endsWith(".csv")) {
      return NextResponse.json(
        { message: "File must be a CSV" },
        { status: 400 }
      );
    }

    const text = await file.text();
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length < 2) {
      return NextResponse.json(
        { message: "CSV must have a header row and at least one data row" },
        { status: 400 }
      );
    }

    const headerLine = lines[0].toLowerCase();
    if (!(headerLine.includes("item_number") && headerLine.includes("name"))) {
      return NextResponse.json(
        { message: "CSV must have 'item_number' and 'name' columns" },
        { status: 400 }
      );
    }

    const errors: Array<{ row: number; message: string }> = [];
    const validRows: ParsedRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const { row, error } = parseRow(lines[i], i);
      if (error) {
        errors.push({ row: i + 1, message: error });
      } else {
        validRows.push(row);
      }
    }

    if (validRows.length === 0) {
      return NextResponse.json(
        { message: "No valid rows to import", errors },
        { status: 400 }
      );
    }

    // Check for duplicate item_numbers within the import
    const itemNumbers = validRows.map((r) => r.item_number);
    const duplicates = itemNumbers.filter(
      (num, idx) => itemNumbers.indexOf(num) !== idx
    );
    if (duplicates.length > 0) {
      return NextResponse.json(
        {
          message: `Duplicate item_numbers in import: ${[...new Set(duplicates)].join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Check which item_numbers already exist in the database
    const existingItems = await database.$queryRaw<{ item_number: string }[]>`
      SELECT item_number FROM "tenant_inventory".inventory_items
      WHERE tenant_id = ${tenantId}
        AND item_number = ANY(${itemNumbers}::text[])
        AND deleted_at IS NULL
    `;

    const existingNumbers = new Set(existingItems.map((i) => i.item_number));
    const alreadyExist = validRows.filter((r) =>
      existingNumbers.has(r.item_number)
    );
    if (alreadyExist.length > 0) {
      return NextResponse.json(
        {
          message: `Items already exist: ${alreadyExist.map((r) => r.item_number).join(", ")}`,
          existingItemNumbers: alreadyExist.map((r) => r.item_number),
        },
        { status: 409 }
      );
    }

    // Insert all valid rows
    let inserted = 0;
    for (const row of validRows) {
      try {
        await database.inventoryItem.create({
          data: {
            tenantId,
            item_number: row.item_number,
            name: row.name,
            category: row.category ?? "other",
            unitCost:
              row.unit_cost == null
                ? new Prisma.Decimal(0)
                : new Prisma.Decimal(row.unit_cost),
            quantityOnHand: new Prisma.Decimal(row.quantity_on_hand ?? 0),
            reorder_level: new Prisma.Decimal(row.reorder_level ?? 0),
            tags: row.tags ?? [],
            fsa_status: row.fsa_status ?? null,
            fsa_temp_logged: false,
            fsa_allergen_info: false,
            fsa_traceable: false,
          },
        });
        inserted++;
      } catch (err) {
        log.error(`[InventoryImport] Failed to insert row ${row.row}:`, err);
        errors.push({
          row: row.row,
          message: `Insert failed: ${(err as Error).message}`,
        });
      }
    }

    const result: ImportResult = {
      success: inserted,
      errors,
    };

    return NextResponse.json(result);
  } catch (error) {
    captureException(error);
    log.error("[InventoryImport/POST] Error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
