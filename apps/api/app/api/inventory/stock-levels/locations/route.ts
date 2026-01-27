/**
 * Storage Locations API Endpoint
 *
 * GET    /api/inventory/stock-levels/locations      - List storage locations
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
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
        tenant_id: string;
        id: string;
        location_id: string;
        name: string;
        storage_type: string;
        temperature_min: number | null;
        temperature_max: number | null;
        temperature_unit: string | null;
        is_active: boolean;
        created_at: Date;
        updated_at: Date;
        deleted_at: Date | null;
      }>
    >`
      SELECT
        tenant_id,
        id,
        location_id,
        name,
        storage_type,
        temperature_min,
        temperature_max,
        temperature_unit,
        is_active,
        created_at,
        updated_at,
        deleted_at
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
    console.error("Failed to list storage locations:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
