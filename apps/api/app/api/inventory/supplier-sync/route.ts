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
import { log } from "@repo/observability/log";
import {
  connectorRegistry,
  SupplierSyncService,
} from "@repo/supplier-connectors";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";

// SupplierSyncLog is an infrastructure/audit entity — it exists in Prisma schema
// but has no Manifest entity definition (no source manifest, no IR entry, no commands).
// Direct Prisma writes are intentional per constitution §10 bypass for infra entities.

export const runtime = "nodejs";

// ============================================================================
// POST /api/inventory/supplier-sync/sync
// ============================================================================

const SyncRequestSchema = z.object({
  supplierId: z.uuid({ error: "Invalid supplier ID" }),
  connectorId: z.string().min(1, "Connector ID is required"),
  fullSync: z.boolean().optional().default(true),
});

export async function POST(request: NextRequest) {
  // Hoist context so the error path can write a failed log entry
  // without re-parsing the body or re-calling auth().
  let tenantId: string | undefined;
  let supplierId: string | undefined;
  let resolvedConnectorId: string | undefined;
  let clerkId: string | undefined;

  try {
    const authResult = await auth();
    clerkId = authResult.userId ?? undefined;
    const orgId = authResult.orgId;
    if (!(clerkId && orgId)) {
      return manifestErrorResponse("Unauthorized", 401);
    }

    tenantId = await getTenantIdForOrg(orgId);
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

    supplierId = parsed.data.supplierId;
    resolvedConnectorId = parsed.data.connectorId;

    // Look up the connector
    const connector = connectorRegistry.get(resolvedConnectorId);
    if (!connector) {
      return manifestErrorResponse(
        `Unknown connector: ${resolvedConnectorId}. Available: ${connectorRegistry
          .listMetadata()
          .map((c: { id: string }) => c.id)
          .join(", ")}`,
        400
      );
    }

    if (connector.isStub) {
      return manifestErrorResponse(
        `Connector "${connector.name}" is a stub — no live API integration. Catalog sync is not available until credentials and integration are configured.`,
        503
      );
    }

    // For now, build config with placeholder credentials
    // In production, credentials would be fetched from the supplier record's
    // encrypted connectorCredentials field
    const config = {
      supplierId,
      tenantId,
      credentials: {
        apiBaseUrl:
          process.env[
            `SUPPLIER_${resolvedConnectorId.toUpperCase().replace(/-/g, "_")}_API_URL`
          ] || "",
        apiKey:
          process.env[
            `SUPPLIER_${resolvedConnectorId.toUpperCase().replace(/-/g, "_")}_API_KEY`
          ] || "",
        apiSecret:
          process.env[
            `SUPPLIER_${resolvedConnectorId.toUpperCase().replace(/-/g, "_")}_API_SECRET`
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
        `No credentials configured for ${connector.name}. Set environment variables: SUPPLIER_${resolvedConnectorId.toUpperCase().replace(/-/g, "_")}_API_URL and SUPPLIER_${resolvedConnectorId.toUpperCase().replace(/-/g, "_")}_API_KEY`,
        400
      );
    }

    // Run the sync
    const syncService = new SupplierSyncService(database as any);
    const result = await syncService.syncCatalog(connector, config);

    // Determine sync status from result
    const hasFatalError = result.errors.some((e) => e.sku === "SYNC_ERROR");
    const hasPartialErrors = result.errors.length > 0 && !hasFatalError;
    const status = hasFatalError
      ? "failed"
      : hasPartialErrors
        ? "partial"
        : "success";

    // Persist the sync log record
    try {
      await database.supplierSyncLog.create({
        data: {
          tenantId,
          supplierId,
          connectorId: result.connectorId,
          status,
          productsSynced: result.productsSynced,
          productsCreated: result.productsCreated,
          productsUpdated: result.productsUpdated,
          productsDeactivated: result.productsDeactivated,
          errors: result.errors,
          durationMs: result.durationMs,
          triggeredBy: clerkId,
        },
      });
    } catch (logError) {
      // Log write failure must not mask the sync result
      log.error("[supplier-sync/sync] Failed to persist sync log:", logError);
      captureException(logError);
    }

    return manifestSuccessResponse({
      message: `Synced ${result.productsSynced} products from ${connector.name}`,
      ...result,
    });
  } catch (error) {
    // Sync threw before producing a result — best-effort failed log entry
    if (tenantId && supplierId) {
      try {
        await database.supplierSyncLog.create({
          data: {
            tenantId,
            supplierId,
            connectorId: resolvedConnectorId ?? "unknown",
            status: "failed",
            productsSynced: 0,
            productsCreated: 0,
            productsUpdated: 0,
            productsDeactivated: 0,
            errors: [
              {
                sku: "SYNC_ERROR",
                error: error instanceof Error ? error.message : String(error),
              },
            ],
            durationMs: 0,
            triggeredBy: clerkId ?? null,
          },
        });
      } catch {
        // Best-effort; outer catch already handles the primary error
      }
    }

    captureException(error);
    log.error("[supplier-sync/sync] Error:", error);
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
    const syncLogs = await database.supplierSyncLog
      .findMany({
        where: { tenantId, supplierId, deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 10,
      })
      .catch(() => {
        // Table may not exist yet — return empty
        return [];
      });

    return manifestSuccessResponse({ supplierId, syncLogs });
  } catch (error) {
    captureException(error);
    log.error("[supplier-sync/status] Error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch sync status";
    return manifestErrorResponse(message, 500);
  }
}
