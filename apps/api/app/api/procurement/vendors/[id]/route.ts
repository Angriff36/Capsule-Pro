// Get single vendor with contacts and latest ratings
import { auth } from "@repo/auth/server";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { database } from "@/lib/database";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId, userId } = await auth();
    if (!(userId && orgId)) return manifestErrorResponse("Unauthorized", 401);

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) return manifestErrorResponse("Tenant not found", 400);

    const { id } = await params;

    const vendors = await database.$queryRawUnsafe(
      `
      SELECT * FROM tenant_inventory.inventory_suppliers
      WHERE tenant_id = $1::uuid AND id = $2::uuid AND deleted_at IS NULL
    `,
      tenantId,
      id
    );

    if (!(vendors as any[]).length)
      return manifestErrorResponse("Vendor not found", 404);
    const vendor = (vendors as any[])[0];

    const contacts = await database.$queryRawUnsafe(
      `
      SELECT * FROM tenant_inventory.vendor_contacts
      WHERE tenant_id = $1::uuid AND supplier_id = $2::uuid AND deleted_at IS NULL
      ORDER BY is_primary DESC, contact_name
    `,
      tenantId,
      id
    );

    const ratings = await database.$queryRawUnsafe(
      `
      SELECT r.*, a.name as rated_by_name
      FROM tenant_inventory.vendor_ratings r
      LEFT JOIN platform.accounts a ON a.id = r.rated_by
      WHERE r.tenant_id = $1::uuid AND r.supplier_id = $2::uuid AND r.deleted_at IS NULL
      ORDER BY r.created_at DESC
      LIMIT 20
    `,
      tenantId,
      id
    );

    const catalogCount = await database.$queryRawUnsafe(
      `
      SELECT COUNT(*)::int as count FROM tenant_inventory.vendor_catalogs
      WHERE tenant_id = $1::uuid AND supplier_id = $2::uuid AND deleted_at IS NULL AND is_active = true
    `,
      tenantId,
      id
    );

    return manifestSuccessResponse({
      vendor,
      contacts,
      ratings,
      catalogItemCount: (catalogCount as any[])[0]?.count || 0,
    });
  } catch (error) {
    captureException(error);
    console.error("Error fetching vendor:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
