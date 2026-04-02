// Update vendor details
import { auth } from "@repo/auth/server";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { database } from "@/lib/database";
import { manifestErrorResponse, manifestSuccessResponse } from "@/lib/manifest-response";

export async function POST(request: NextRequest) {
  try {
    const { orgId, userId } = await auth();
    if (!(userId && orgId)) return manifestErrorResponse("Unauthorized", 401);

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) return manifestErrorResponse("Tenant not found", 400);

    const body = await request.json();
    const { vendorId, name, contactPerson, email, phone, paymentTerms,
            addressLine1, addressLine2, city, state, postalCode, country,
            taxId, website, notes, tags, performanceRating } = body;

    if (!vendorId) return manifestErrorResponse("vendorId is required", 400);

    // Verify vendor exists
    const existing = await database.$queryRaw`
      SELECT id FROM tenant_inventory.inventory_suppliers
      WHERE tenant_id = ${tenantId}::uuid AND id = ${vendorId}::uuid AND deleted_at IS NULL
    `;
    if (!(existing as any[]).length) return manifestErrorResponse("Vendor not found", 404);

    const result = await database.$queryRaw`
      UPDATE tenant_inventory.inventory_suppliers
      SET
        name = ${name},
        contact_person = ${contactPerson !== undefined ? contactPerson : null},
        email = ${email !== undefined ? email : null},
        phone = ${phone !== undefined ? phone : null},
        payment_terms = ${paymentTerms || 'NET_30'},
        address_line1 = ${addressLine1 !== undefined ? addressLine1 : null},
        address_line2 = ${addressLine2 !== undefined ? addressLine2 : null},
        city = ${city !== undefined ? city : null},
        state = ${state !== undefined ? state : null},
        postal_code = ${postalCode !== undefined ? postalCode : null},
        country = ${country || 'US'},
        tax_id = ${taxId !== undefined ? taxId : null},
        website = ${website !== undefined ? website : null},
        notes = ${notes !== undefined ? notes : null},
        tags = ${tags !== undefined ? tags : null}::text[],
        performance_rating = ${performanceRating !== undefined ? performanceRating : null}::decimal(2,1),
        updated_at = NOW()
      WHERE tenant_id = ${tenantId}::uuid AND id = ${vendorId}::uuid
      RETURNING id, supplier_number, name, contact_person, email, phone, payment_terms, updated_at
    `;

    return manifestSuccessResponse({ vendor: (result as any[])[0] });
  } catch (error) {
    console.error("Error updating vendor:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
