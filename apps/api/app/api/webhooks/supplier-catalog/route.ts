/**
 * Supplier Catalog Webhook Handler
 *
 * Receives push notifications from supplier systems when their catalog,
 * pricing, or availability changes. Validates the webhook signature,
 * maps the payload to internal VendorCatalog format, and upserts the data.
 *
 * POST /api/webhooks/supplier-catalog
 *
 * Expected payload:
 * {
 *   connectorId: "us-foods" | "charlies-produce",
 *   supplierId: string (UUID),
 *   event: "catalog.updated" | "pricing.changed" | "availability.changed",
 *   timestamp: string (ISO 8601),
 *   products: Array<{
 *     externalId: string,
 *     sku: string,
 *     name: string,
 *     unitCost: number,
 *     currency: string,
 *     unitOfMeasure: string,
 *     available: boolean,
 *     quantityAvailable?: number,
 *     category?: string,
 *     description?: string,
 *     leadTimeDays?: number,
 *     minimumOrderQuantity?: number,
 *     orderMultiple?: number,
 *     effectiveFrom?: string,
 *     effectiveTo?: string,
 *     tags?: string[]
 *   }>
 * }
 *
 * Signature verification:
 * - X-Supplier-Signature header contains HMAC-SHA256 hex digest
 * - Signature is computed over the raw request body using the supplier's webhook secret
 * - Secret is stored in the supplier's connectorCredentials.webhookSecret field
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import type { SupplierProduct } from "@repo/supplier-connectors";
import { connectorRegistry } from "@repo/supplier-connectors";
import { captureException } from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { runManifestCommand } from "@/lib/manifest/execute-command";

export const runtime = "nodejs";

// Bound the per-push product count so a hostile/buggy supplier cannot drive an
// unbounded-payload DoS (each product fans out into a governed write). Generous
// default covers typical catalog pushes; overridable for large-catalog suppliers.
// Mirrors the MANIFEST_BATCH_MAX_SIZE env-cap pattern.
const MAX_PRODUCTS_PER_WEBHOOK =
  Number(process.env.SUPPLIER_CATALOG_MAX_PRODUCTS) || 1000;

// ============================================================================
// Validation Schemas
// ============================================================================

const WebhookProductSchema = z.object({
  externalId: z.string(),
  sku: z.string(),
  name: z.string(),
  unitCost: z.number().nonnegative(),
  currency: z.string().length(3),
  unitOfMeasure: z.string(),
  available: z.boolean(),
  quantityAvailable: z.number().int().nonnegative().optional(),
  category: z.string().optional(),
  description: z.string().optional(),
  leadTimeDays: z.number().int().positive().optional(),
  minimumOrderQuantity: z.number().nonnegative().optional(),
  orderMultiple: z.number().nonnegative().optional(),
  effectiveFrom: z.string().optional(),
  effectiveTo: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

const WebhookPayloadSchema = z.object({
  connectorId: z.string().min(1),
  supplierId: z.uuid(),
  event: z.enum(["catalog.updated", "pricing.changed", "availability.changed"]),
  timestamp: z.iso.datetime(),
  products: z.array(WebhookProductSchema).min(1).max(MAX_PRODUCTS_PER_WEBHOOK),
});

// ============================================================================
// POST Handler
// ============================================================================

export async function POST(request: Request) {
  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  // Parse and validate payload
  let payload: z.infer<typeof WebhookPayloadSchema>;
  try {
    const json = JSON.parse(rawBody);
    payload = WebhookPayloadSchema.parse(json);
  } catch (err) {
    captureException(err);
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: err.issues },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Validate connector exists
  const connector = connectorRegistry.get(payload.connectorId);
  if (!connector) {
    return NextResponse.json(
      { error: `Unknown connector: ${payload.connectorId}` },
      { status: 400 }
    );
  }

  // Verify webhook signature - REQUIRED for all requests
  const signature = request.headers.get("x-supplier-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing X-Supplier-Signature header" },
      { status: 401 }
    );
  }

  const webhookSecret =
    process.env[
      `SUPPLIER_${payload.connectorId.toUpperCase().replace(/-/g, "_")}_WEBHOOK_SECRET`
    ];

  if (!webhookSecret) {
    log.error(
      `[webhook/supplier-catalog] No webhook secret configured for ${payload.connectorId} — rejecting request`
    );
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  const expectedSignature = createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("hex");

  // Timing-safe comparison to prevent timing attacks
  try {
    if (
      !timingSafeEqual(
        Buffer.from(signature, "hex"),
        Buffer.from(expectedSignature, "hex")
      )
    ) {
      log.warn(
        `[webhook/supplier-catalog] Invalid signature for ${payload.connectorId}`
      );
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  } catch {
    return NextResponse.json(
      { error: "Invalid signature format" },
      { status: 401 }
    );
  }

  // Look up supplier to get tenant ID
  const supplier = (await database.inventorySupplier.findFirst({
    where: {
      id: payload.supplierId,
      deletedAt: null,
    },
    select: {
      id: true,
      tenantId: true,
    },
  })) as { id: string; tenantId: string } | null;

  if (!supplier) {
    return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
  }

  // Build synthetic system-user context for Manifest commands (webhook has no Clerk auth)
  const adminUser = await database.user.findFirst({
    where: {
      tenantId: supplier.tenantId,
      role: { in: ["owner", "admin"] },
      deletedAt: null,
    },
    select: { id: true, role: true },
  });
  const systemUser = {
    id: adminUser?.id ?? "system",
    tenantId: supplier.tenantId,
    role: adminUser?.role ?? "admin",
  };

  // Upsert products into VendorCatalog via Manifest governance
  let upserted = 0;
  let errors = 0;

  // Preload every existing catalog row for the SKUs in this push in ONE query
  // (read bypasses Manifest per §10) instead of one findFirst per product.
  // (tenantId, supplierId, itemNumber) is NOT a unique key, so first-row-per-SKU
  // wins (matches the prior per-product findFirst's "one id"). Created ids are
  // fed back into the Map below so a within-payload duplicate SKU updates the
  // just-created row instead of creating a second one — the prior per-product
  // findFirst re-read the just-created row on each iteration.
  const existingBySku = new Map<string, string>();
  const existingRows = await database.vendorCatalog.findMany({
    where: {
      tenantId: supplier.tenantId,
      supplierId: payload.supplierId,
      itemNumber: { in: payload.products.map((product) => product.sku) },
    },
    select: { id: true, itemNumber: true },
  });
  for (const row of existingRows) {
    if (!existingBySku.has(row.itemNumber)) {
      existingBySku.set(row.itemNumber, row.id);
    }
  }

  for (const product of payload.products) {
    try {
      const catalogProduct: SupplierProduct = {
        externalId: product.externalId,
        sku: product.sku,
        name: product.name,
        unitCost: product.unitCost,
        currency: product.currency,
        unitOfMeasure: product.unitOfMeasure,
        available: product.available,
        quantityAvailable: product.quantityAvailable,
        category: product.category,
        description: product.description,
        leadTimeDays: product.leadTimeDays,
        minimumOrderQuantity: product.minimumOrderQuantity,
        orderMultiple: product.orderMultiple,
        effectiveFrom: product.effectiveFrom
          ? new Date(product.effectiveFrom)
          : undefined,
        effectiveTo: product.effectiveTo
          ? new Date(product.effectiveTo)
          : undefined,
        tags: product.tags,
      };

      // Look up the preloaded existing catalog row for this SKU (read bypasses
      // Manifest per §10). (tenantId, supplierId, itemNumber) is not a unique key.
      const existingId = existingBySku.get(catalogProduct.sku);

      const baseBody = {
        tenantId: supplier.tenantId,
        supplierId: payload.supplierId,
        itemNumber: catalogProduct.sku,
        itemName: catalogProduct.name,
        description: catalogProduct.description ?? "",
        category: catalogProduct.category ?? "",
        baseUnitCost: catalogProduct.unitCost ?? 0,
        currency: catalogProduct.currency ?? "USD",
        unitOfMeasure: catalogProduct.unitOfMeasure ?? "",
        leadTimeDays: catalogProduct.leadTimeDays ?? 0,
        leadTimeMinDays: 0,
        leadTimeMaxDays: 0,
        minimumOrderQuantity: catalogProduct.minimumOrderQuantity ?? 0,
        orderMultiple: catalogProduct.orderMultiple ?? 0,
        effectiveFrom: catalogProduct.effectiveFrom?.getTime() ?? 0,
        effectiveTo: catalogProduct.effectiveTo?.getTime() ?? 0,
        supplierSku: catalogProduct.externalId ?? "",
        notes: "",
        tags: catalogProduct.tags ?? [],
      };

      if (existingId) {
        // Update existing catalog entry via Manifest
        const result = await runManifestCommand({
          entity: "VendorCatalog",
          command: "update",
          body: {
            id: existingId,
            ...baseBody,
            isActive: catalogProduct.available ?? true,
            lastCostUpdate: Date.now(),
          },
          user: systemUser,
        });
        if (!result.ok) {
          const errorText = await result.text();
          throw new Error(`Manifest update failed: ${errorText}`);
        }
      } else {
        // Create new catalog entry via Manifest
        const result = await runManifestCommand({
          entity: "VendorCatalog",
          command: "create",
          body: baseBody,
          user: systemUser,
        });
        if (!result.ok) {
          const errorText = await result.text();
          throw new Error(`Manifest create failed: ${errorText}`);
        }
        // Feed the created id back so a later within-payload duplicate SKU
        // updates this row instead of creating a second one (mirrors the prior
        // per-product findFirst re-reading the just-created row).
        const created = (await result.json().catch(() => null)) as {
          result?: { id?: unknown };
        } | null;
        const createdId = created?.result?.id;
        if (typeof createdId === "string") {
          existingBySku.set(catalogProduct.sku, createdId);
        }
      }

      upserted++;
    } catch (err) {
      errors++;
      log.error(
        `[webhook/supplier-catalog] Failed to upsert product ${product.sku}`,
        { error: err }
      );
    }
  }

  log.info(
    `[webhook/supplier-catalog] Processed ${payload.event} from ${connector.name}: ` +
      `${upserted} upserted, ${errors} errors`
  );

  return NextResponse.json({
    received: true,
    event: payload.event,
    connector: connector.name,
    productsProcessed: upserted,
    errors,
  });
}

// ============================================================================
// GET Handler — Health check for webhook endpoint (authenticated)
// ============================================================================

export function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    status: "ok",
    connectors: connectorRegistry.listMetadata(),
    supportedEvents: [
      "catalog.updated",
      "pricing.changed",
      "availability.changed",
    ],
  });
}
