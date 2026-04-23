/**
 * Supplier Sync API Routes
 *
 * Manual sync triggering, status checking, and connector listing
 * for the supplier integration framework.
 *
 * POST /api/inventory/supplier-sync/sync   - Trigger a manual catalog sync
 * GET  /api/inventory/supplier-sync/status - Get last sync status for a supplier
 * GET  /api/inventory/supplier-sync/connectors - List available connectors
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import {
  connectorRegistry,
  SupplierSyncService,
} from "@repo/supplier-connectors";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { captureException } from "@sentry/nextjs";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";

import { z } from "zod";

export const runtime = "nodejs";

// ============================================================================
// POST /api/inventory/supplier-sync/sync
// ============================================================================

const SyncRequestSchema = z.object({
  supplierId: z.string().uuid("Invalid supplier ID"),
  connectorId: z.string().min(1, "Connector ID is required"),
  fullSync: z.boolean().optional().default(true),
});

export async function POST(request: NextRequest) {
  try {
    const { orgId, userId: clerkId } = await auth();
    if (!(clerkId && orgId)) {
      return manifestErrorResponse("Unauthorized", 401);
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return manifestErrorResponse("Tenant not found", 400);
    }

    const body = await request.json();
    const parsed = SyncRequestSchema.safeParse(body);

    if (!parsed.success) {
      return manifestErrorResponse(
        parsed.error.issues.map((i) => i.message).join(", "),
        400
      );
    }

    const { supplierId, connectorId } = parsed.data;

    // Look up the connector
    const connector = connectorRegistry.get(connectorId);
    if (!connector) {
      return manifestErrorResponse(
        `Unknown connector: ${connectorId}. Available: ${connectorRegistry
          .listMetadata()
          .map((c: { id: string }) => c.id)
          .join(", ")}`,
        400
      );
    }

    // Look up the supplier and get their connector credentials
    // Credentials are stored as encrypted JSON on the InventorySupplier record
    const supplier = (await (database as unknown as Record<string, unknown>)
      .inventorySupplier) as
      | {
          findFirst: (args: unknown) => Promise<unknown>;
        }
      | undefined;

    // For now, build config with placeholder credentials
    // In production, credentials would be fetched from the supplier record's
    // encrypted connectorCredentials field
    const config = {
      supplierId,
      tenantId,
      credentials: {
        apiBaseUrl:
          process.env[
            `SUPPLIER_${connectorId.toUpperCase().replace(/-/g, "_")}_API_URL`
          ] || "",
        apiKey:
          process.env[
            `SUPPLIER_${connectorId.toUpperCase().replace(/-/g, "_")}_API_KEY`
          ] || "",
        apiSecret:
          process.env[
            `SUPPLIER_${connectorId.toUpperCase().replace(/-/g, "_")}_API_SECRET`
          ] || "",
      },
      options: {
        syncFullCatalog: parsed.data.fullSync,
        autoActivate: true,
      },
    };

    // Validate credentials exist
    if (!(config.credentials.apiBaseUrl && config.credentials.apiKey)) {
      return manifestErrorResponse(
        `No credentials configured for ${connector.name}. Set environment variables: SUPPLIER_${connectorId.toUpperCase().replace(/-/g, "_")}_API_URL and SUPPLIER_${connectorId.toUpperCase().replace(/-/g, "_")}_API_KEY`,
        400
      );
    }

    // Run the sync
    const syncService = new SupplierSyncService(database as any);
    const result = await syncService.syncCatalog(connector, config);

    return manifestSuccessResponse({
      message: `Synced ${result.productsSynced} products from ${connector.name}`,
      ...result,
    });
  } catch (error) {
    captureException(error);
    console.error("[supplier-sync/sync] Error:", error);
    const message = error instanceof Error ? error.message : "Sync failed";
    return manifestErrorResponse(message, 500);
  }
}

// ============================================================================
// GET /api/inventory/supplier-sync/status
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const { orgId, userId: clerkId } = await auth();
    if (!(clerkId && orgId)) {
      return manifestErrorResponse("Unauthorized", 401);
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return manifestErrorResponse("Tenant not found", 400);
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    // GET /api/inventory/supplier-sync/connectors — list available connectors
    if (action === "connectors") {
      return manifestSuccessResponse({
        connectors: connectorRegistry.listMetadata(),
      });
    }

    // GET /api/inventory/supplier-sync/status — last sync status
    const supplierId = searchParams.get("supplierId");
    if (!supplierId) {
      return manifestErrorResponse(
        "supplierId query parameter is required",
        400
      );
    }

    // Query the sync log for the most recent sync for this supplier
    // Uses raw query since supplier_sync_log may not have a Prisma model yet
    const syncLogs = await database
      .$queryRawUnsafe<
        Array<{
          id: string;
          connector_id: string;
          status: string;
          products_synced: number;
          products_created: number;
          products_updated: number;
          products_deactivated: number;
          errors: unknown;
          duration_ms: number;
          created_at: Date;
          triggered_by: string | null;
        }>
      >(
        `SELECT id, connector_id, status, products_synced, products_created, products_updated,
              products_deactivated, errors, duration_ms, created_at, triggered_by
       FROM tenant_inventory.supplier_sync_logs
       WHERE tenant_id = $1 AND supplier_id = $2 AND deleted_at IS NULL
       ORDER BY created_at DESC
       LIMIT 10`,
        tenantId,
        supplierId
      )
      .catch(() => {
        // Table may not exist yet — return empty
        return [];
      });

    return manifestSuccessResponse({ supplierId, syncLogs });
  } catch (error) {
    captureException(error);
    console.error("[supplier-sync/status] Error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch sync status";
    return manifestErrorResponse(message, 500);
  }
}
