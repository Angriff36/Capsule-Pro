// Add a contact to a vendor
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
    const existing = await database.inventorySupplier.findFirst({
      where: { tenantId, id: vendorId, deletedAt: null },
    });
    if (!existing) return manifestErrorResponse("Vendor not found", 404);

    // If setting as primary, clear existing primary
    if (isPrimary) {
      await database.vendorContact.updateMany({
        where: { tenantId, supplierId: vendorId, isPrimary: true },
        data: { isPrimary: false, updatedAt: new Date() },
      });
    }

    const contact = await database.vendorContact.create({
      data: {
        tenantId,
        supplierId: vendorId,
        contactName,
        contactEmail: contactEmail || null,
        contactPhone: contactPhone || null,
        contactRole: contactRole || null,
        isPrimary: isPrimary ?? false,
        notes: notes || null,
      },
    });

    return manifestSuccessResponse({
      contact: {
        id: contact.id,
        contact_name: contact.contactName,
        contact_email: contact.contactEmail,
        contact_phone: contact.contactPhone,
        contact_role: contact.contactRole,
        is_primary: contact.isPrimary,
        created_at: contact.createdAt,
      },
    });
  } catch (error) {
    captureException(error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
