// List vendors with search, filtering, and catalog item counts
import { auth } from "@repo/auth/server";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { database } from "@/lib/database";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";
import { clampLimit, clampOffset } from "@/lib/pagination";
import { likeContains } from "@/lib/sql-like";

export async function GET(request: NextRequest) {
  try {
    const { orgId, userId } = await auth();
    if (!(userId && orgId)) return manifestErrorResponse("Unauthorized", 401);

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) return manifestErrorResponse("Tenant not found", 400);

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const limit = clampLimit(searchParams.get("limit"));
    const offset = clampOffset(searchParams.get("offset"));

    // SQL LIKE/ILIKE has its own pattern metacharacters (`%`, `_`, `\`) that
    // are NOT neutralized by Prisma parameterization — so a search for "100%"
    // would otherwise match every row containing "100". `likeContains` escapes
    // those metacharacters and wraps the value as a `%value%` substring match;
    // the `ESCAPE '\'` clause below tells PostgreSQL we are using `\` as our
    // escape character (default, but stated explicitly to make the contract
    // auditable).
    const searchPattern = search ? likeContains(search) : "";

    // Build the parameter list dynamically. We always bind tenantId, limit,
    // and offset; search adds one extra parameter (reused four times in the
    // OR-block).
    const params: (string | number)[] = search
      ? [tenantId, searchPattern, limit, offset]
      : [tenantId, limit, offset];
    const limitIdx = search ? 3 : 2;
    const offsetIdx = search ? 4 : 3;

    const vendors = await database.$queryRawUnsafe(
      `
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
        ${
          search
            ? `AND (s.name ILIKE $2 ESCAPE '\\'
                     OR s.contact_person ILIKE $2 ESCAPE '\\'
                     OR s.email ILIKE $2 ESCAPE '\\'
                     OR s.supplier_number ILIKE $2 ESCAPE '\\')`
            : ""
        }
      GROUP BY s.id, s.supplier_number, s.name, s.contact_person, s.email, s.phone,
        s.payment_terms, s.address_line1, s.address_line2, s.city, s.state,
        s.postal_code, s.country, s.tax_id, s.website, s.performance_rating,
        s.notes, s.tags, s.created_at, s.updated_at
      ORDER BY s.name
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
    `,
      ...params
    );

    return manifestSuccessResponse({ vendors, limit, offset });
  } catch (error) {
    captureException(error);
    console.error("Error listing vendors:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
