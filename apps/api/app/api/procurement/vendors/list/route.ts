// List vendors with search, filtering, and catalog item counts
import { auth } from "@repo/auth/server";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { database } from "@/lib/database";
import { manifestErrorResponse, manifestSuccessResponse } from "@/lib/manifest-response";

export async function GET(request: NextRequest) {
  try {
    const { orgId, userId } = await auth();
    if (!(userId && orgId)) return manifestErrorResponse("Unauthorized", 401);

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) return manifestErrorResponse("Tenant not found", 400);

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || "";

    const vendors = await database.$queryRawUnsafe(`
      SELECT
        s.id, s.supplier_number, s.name, s.contact_person, s.email, s.phone,
        s.payment_terms, s.address_line1, s.address_line2, s.city, s.state,
        s.postal_code, s.country, s.tax_id, s.website, s.performance_rating,
        s.notes, s.tags, s.created_at, s.updated_at,
        COUNT(DISTINCT vc.id)::int as contact_count,
        COUNT(DISTINCT cat.id)::int as catalog_item_count
      FROM tenant_inventory.inventory_suppliers s
      LEFT JOIN tenant_inventory.vendor_contacts vc
        ON vc.supplier_id = s.id AND vc.tenant_id = s.tenant_id AND vc.deleted_at IS NULL
      LEFT JOIN tenant_inventory.vendor_catalogs cat
        ON cat.supplier_id = s.id AND cat.tenant_id = s.tenant_id AND cat.deleted_at IS NULL AND cat.is_active = true
      WHERE s.tenant_id = $1::uuid AND s.deleted_at IS NULL
        ${search ? `AND (s.name ILIKE '%' || $2 || '%'
                     OR s.contact_person ILIKE '%' || $2 || '%'
                     OR s.email ILIKE '%' || $2 || '%'
                     OR s.supplier_number ILIKE '%' || $2 || '%')` : ""}
      GROUP BY s.id, s.supplier_number, s.name, s.contact_person, s.email, s.phone,
        s.payment_terms, s.address_line1, s.address_line2, s.city, s.state,
        s.postal_code, s.country, s.tax_id, s.website, s.performance_rating,
        s.notes, s.tags, s.created_at, s.updated_at
      ORDER BY s.name
    `, search ? [tenantId, search] : [tenantId]);

    return manifestSuccessResponse({ vendors });
  } catch (error) {
    console.error("Error listing vendors:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
