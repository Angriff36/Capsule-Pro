/**
 * Storage Locations API Endpoint
 *
 * GET    /api/inventory/stock-levels/locations      - List storage locations
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import type { LocationListResponse } from "../types";

/**
 * GET /api/inventory/stock-levels/locations - List storage locations
 */
export async function GET(_request: Request) {
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

    // Get active storage locations for this tenant
    const locations = await database.$queryRaw<
      Array<{
        id: string;
        tenant_id: string;
        name: string;
        storage_type: string;
        is_active: boolean;
        created_at: Date;
        updated_at: Date;
      }>
    >`
      SELECT
        id,
        tenant_id,
        name,
        storage_type,
        is_active,
        created_at,
        updated_at
      FROM tenant_inventory.storage_locations
      WHERE tenant_id = ${tenantId}
        AND deleted_at IS NULL
        AND is_active = true
      ORDER BY name ASC
    `;

    const data = locations.map((loc) => ({
      id: loc.id,
      tenantId: loc.tenant_id,
      name: loc.name,
      locationType: loc.storage_type,
      address: null,
      isActive: loc.is_active,
      createdAt: loc.created_at,
      updatedAt: loc.updated_at,
    }));

    const response: LocationListResponse = {
      data,
    };

    return NextResponse.json(response);
  } catch (error) {
    captureException(error);
    log.error("Failed to list storage locations:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
