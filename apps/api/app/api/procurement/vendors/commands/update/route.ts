// Update vendor details
import { auth } from "@repo/auth/server";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { database } from "@/lib/database";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";

function mapVendorToSnake(v: {
  id: string;
  supplier_number: string;
  name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  payment_terms: string;
  updatedAt: Date;
}) {
  return {
    id: v.id,
    supplier_number: v.supplier_number,
    name: v.name,
    contact_person: v.contact_person,
    email: v.email,
    phone: v.phone,
    payment_terms: v.payment_terms,
    updated_at: v.updatedAt,
  };
}

export async function POST(request: NextRequest) {
  try {
    const { orgId, userId } = await auth();
    if (!(userId && orgId)) return manifestErrorResponse("Unauthorized", 401);

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) return manifestErrorResponse("Tenant not found", 400);

    const body = await request.json();
    const {
      vendorId,
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
      performanceRating,
    } = body;

    if (!vendorId) return manifestErrorResponse("vendorId is required", 400);

    // Verify vendor exists
    const existing = await database.inventorySupplier.findFirst({
      where: { tenantId, id: vendorId, deletedAt: null },
    });
    if (!existing) return manifestErrorResponse("Vendor not found", 404);

    const vendor = await database.inventorySupplier.update({
      where: { tenantId_id: { tenantId, id: vendorId } },
      data: {
        ...(name !== undefined && { name }),
        contact_person: contactPerson !== undefined ? contactPerson : null,
        email: email !== undefined ? email : null,
        phone: phone !== undefined ? phone : null,
        payment_terms: paymentTerms || "NET_30",
        addressLine1: addressLine1 !== undefined ? addressLine1 : null,
        addressLine2: addressLine2 !== undefined ? addressLine2 : null,
        city: city !== undefined ? city : null,
        state: state !== undefined ? state : null,
        postalCode: postalCode !== undefined ? postalCode : null,
        country: country || "US",
        taxId: taxId !== undefined ? taxId : null,
        website: website !== undefined ? website : null,
        notes: notes !== undefined ? notes : null,
        tags: tags !== undefined ? tags : [],
        ...(performanceRating !== undefined && {
          performanceRating: performanceRating,
        }),
      },
    });

    return manifestSuccessResponse({ vendor: mapVendorToSnake(vendor) });
  } catch (error) {
    captureException(error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
