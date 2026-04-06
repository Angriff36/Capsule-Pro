// Create a new vendor/supplier
import { auth } from "@repo/auth/server";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { database } from "@/lib/database";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";

export async function POST(request: NextRequest) {
  try {
    const { orgId, userId } = await auth();
    if (!(userId && orgId)) return manifestErrorResponse("Unauthorized", 401);

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) return manifestErrorResponse("Tenant not found", 400);

    const body = await request.json();
    const {
      name,
      contactPerson,
      email,
      phone,
      paymentTerms,
      addressLine1,
      addressLine2,
      city,
      state,
      postalCode,
      country,
      taxId,
      website,
      notes,
      tags,
    } = body;

    if (!name) return manifestErrorResponse("name is required", 400);

    // Generate supplier number
    const countResult = await database.$queryRaw`
      SELECT COUNT(*)::int as count FROM tenant_inventory.inventory_suppliers WHERE tenant_id = ${tenantId}
    `;
    const count = (countResult as any[])[0]?.count || 0;
    const supplierNumber = `VND-${String(count + 1).padStart(4, "0")}`;

    const result = await database.$queryRaw`
      INSERT INTO tenant_inventory.inventory_suppliers (
        tenant_id, supplier_number, name, contact_person, email, phone,
        payment_terms, address_line1, address_line2, city, state, postal_code,
        country, tax_id, website, notes, tags
      ) VALUES (
        ${tenantId}::uuid, ${supplierNumber}, ${name},
        ${contactPerson || null}, ${email || null}, ${phone || null},
        ${paymentTerms || "NET_30"},
        ${addressLine1 || null}, ${addressLine2 || null},
        ${city || null}, ${state || null}, ${postalCode || null},
        ${country || "US"},
        ${taxId || null}, ${website || null}, ${notes || null},
        ${tags || null}::text[]
      )
      RETURNING id, supplier_number, name, contact_person, email, phone, payment_terms, created_at
    `;

    const vendor = (result as any[])[0];
    if (!vendor) return manifestErrorResponse("Failed to create vendor", 500);

    // If primary contact details provided, create a vendor_contact entry
    if (contactPerson && (email || phone)) {
      await database.$queryRaw`
        INSERT INTO tenant_inventory.vendor_contacts (
          tenant_id, supplier_id, contact_name, contact_email, contact_phone, is_primary
        ) VALUES (
          ${tenantId}::uuid, ${vendor.id}::uuid, ${contactPerson},
          ${email || null}, ${phone || null}, true
        )
      `;
    }

    return manifestSuccessResponse({ vendor });
  } catch (error) {
    captureException(error);
    console.error("Error creating vendor:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
