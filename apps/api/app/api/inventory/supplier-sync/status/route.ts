/**
 * Supplier Sync Status API
 *
 * GET /api/inventory/supplier-sync/status?supplierId=<uuid>
 *
 * Get the last sync status for a specific supplier.
 * Returns sync history and current state.
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getTenantIdForOrg } from "@/app/lib/tenant";

const QuerySchema = z.object({
  supplierId: z.uuid(),
});

/**
 * GET /api/inventory/supplier-sync/status
 *
 * Query parameters:
 * - supplierId: UUID of the supplier to get sync status for
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate
    const { orgId, userId: clerkId } = await auth();
    if (!(clerkId && orgId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 400 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const supplierId = searchParams.get("supplierId");

    if (!supplierId) {
      return NextResponse.json(
        { error: "supplierId query parameter is required" },
        { status: 400 }
      );
    }

    // Verify supplier exists and belongs to tenant
    const supplier = await database.inventorySupplier.findFirst({
      where: {
        tenantId,
        id: supplierId,
        deletedAt: null,
      },
    });

    if (!supplier) {
      return NextResponse.json(
        { error: "Supplier not found" },
        { status: 404 }
      );
    }

    // Get sync history from VendorCatalog
    // We use the most recently updated catalog entry as a proxy for last sync
    const latestSync = await database.vendorCatalog.findFirst({
      where: {
        tenantId,
        supplierId,
      },
      orderBy: { updatedAt: "desc" },
      select: {
        updatedAt: true,
        createdAt: true,
      },
    });

    // Get catalog statistics
    const [totalProducts, activeProducts] = await Promise.all([
      database.vendorCatalog.count({
        where: { tenantId, supplierId },
      }),
      database.vendorCatalog.count({
        where: {
          tenantId,
          supplierId,
          deletedAt: null,
        },
      }),
    ]);

    // BLOCKER: No SupplierSyncHistory model exists. Currently derives status from
    // VendorCatalog updatedAt. Adding explicit sync records requires a new model.
    // Tracked as capsule-pro/TODO:supplier-sync-history-model

    return NextResponse.json({
      supplierId,
      supplierName: supplier.name,
      lastSyncAt: latestSync?.updatedAt ?? null,
      status: latestSync ? "synced" : "never_synced",
      catalogStats: {
        totalProducts,
        activeProducts,
      },
    });
  } catch (error) {
    captureException(error);
    log.error("[supplier-sync-status] Error fetching status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export const runtime = "nodejs";
