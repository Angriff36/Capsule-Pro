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

    const vendor = await database.inventorySupplier.findFirst({
      where: { tenantId, id, deletedAt: null },
    });

    if (!vendor) return manifestErrorResponse("Vendor not found", 404);

    const contacts = await database.vendorContact.findMany({
      where: { tenantId, supplierId: id, deletedAt: null },
      orderBy: [{ isPrimary: "desc" }, { contactName: "asc" }],
    });

    const ratings = await database.vendorRating.findMany({
      where: { tenantId, supplierId: id, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        tenant: {
          select: { name: true },
        },
      },
    });

    const catalogItemCount = await database.vendorCatalog.count({
      where: {
        tenantId,
        supplierId: id,
        deletedAt: null,
        isActive: true,
      },
    });

    // Map vendor to snake_case (all fields)
    const vendorSnake = {
      id: vendor.id,
      supplier_number: vendor.supplier_number,
      name: vendor.name,
      contact_person: vendor.contact_person,
      email: vendor.email,
      phone: vendor.phone,
      payment_terms: vendor.payment_terms,
      address_line1: vendor.addressLine1,
      address_line2: vendor.addressLine2,
      city: vendor.city,
      state: vendor.state,
      postal_code: vendor.postalCode,
      country: vendor.country,
      tax_id: vendor.taxId,
      website: vendor.website,
      performance_rating: vendor.performanceRating?.toNumber?.() ?? null,
      notes: vendor.notes,
      tags: vendor.tags,
      connector_type: vendor.connectorType,
      connector_credentials: vendor.connectorCredentials,
      created_at: vendor.createdAt,
      updated_at: vendor.updatedAt,
    };

    // Map contacts to snake_case
    const contactsSnake = contacts.map((c) => ({
      id: c.id,
      tenant_id: c.tenantId,
      supplier_id: c.supplierId,
      contact_name: c.contactName,
      contact_email: c.contactEmail,
      contact_phone: c.contactPhone,
      contact_role: c.contactRole,
      is_primary: c.isPrimary,
      notes: c.notes,
      created_at: c.createdAt,
      updated_at: c.updatedAt,
    }));

    // Map ratings to snake_case with rated_by_name
    const ratingsSnake = ratings.map((r) => ({
      id: r.id,
      tenant_id: r.tenantId,
      supplier_id: r.supplierId,
      category: r.category,
      rating: r.rating,
      comment: r.comment,
      rated_by: r.ratedBy,
      rated_by_name: r.tenant.name,
      created_at: r.createdAt,
      updated_at: r.updatedAt,
    }));

    return manifestSuccessResponse({
      vendor: vendorSnake,
      contacts: contactsSnake,
      ratings: ratingsSnake,
      catalogItemCount,
    });
  } catch (error) {
    captureException(error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
