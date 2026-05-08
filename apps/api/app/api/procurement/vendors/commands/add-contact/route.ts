// Add a contact to a vendor
import { auth } from "@repo/auth/server";
import { log } from "@repo/observability/log";
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

    const {
      vendorId,
      contactName,
      contactEmail,
      contactPhone,
      contactRole,
      isPrimary,
      notes,
    } = await request.json();

    if (!(vendorId && contactName))
      return manifestErrorResponse(
        "vendorId and contactName are required",
        400
      );

    // Verify vendor exists
    const existing = await database.$queryRaw`
      SELECT id FROM tenant_inventory.inventory_suppliers
      WHERE tenant_id = ${tenantId}::uuid AND id = ${vendorId}::uuid AND deleted_at IS NULL
    `;
    if (!(existing as any[]).length)
      return manifestErrorResponse("Vendor not found", 404);

    // If setting as primary, clear existing primary
    if (isPrimary) {
      await database.$queryRaw`
        UPDATE tenant_inventory.vendor_contacts
        SET is_primary = false, updated_at = NOW()
        WHERE tenant_id = ${tenantId}::uuid AND supplier_id = ${vendorId}::uuid AND is_primary = true
      `;
    }

    const result = await database.$queryRaw`
      INSERT INTO tenant_inventory.vendor_contacts (
        tenant_id, supplier_id, contact_name, contact_email, contact_phone,
        contact_role, is_primary, notes
      ) VALUES (
        ${tenantId}::uuid, ${vendorId}::uuid, ${contactName},
        ${contactEmail || null}, ${contactPhone || null},
        ${contactRole || null}, ${isPrimary}, ${notes || null}
      )
      RETURNING id, contact_name, contact_email, contact_phone, contact_role, is_primary, created_at
    `;

    const contact = (result as any[])[0];
    if (!contact) return manifestErrorResponse("Failed to create contact", 500);

    return manifestSuccessResponse({ contact });
  } catch (error) {
    captureException(error);
    log.error("Error adding vendor contact:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
