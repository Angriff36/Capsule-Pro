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

function mapVendorToSnake(v: {
  id: string;
  supplier_number: string;
  name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  payment_terms: string;
  createdAt: Date;
}) {
  return {
    id: v.id,
    supplier_number: v.supplier_number,
    name: v.name,
    contact_person: v.contact_person,
    email: v.email,
    phone: v.phone,
    payment_terms: v.payment_terms,
    created_at: v.createdAt,
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
    const count = await database.inventorySupplier.count({
      where: { tenantId },
    });
    const supplierNumber = `VND-${String(count + 1).padStart(4, "0")}`;

    const vendor = await database.inventorySupplier.create({
      data: {
        tenantId,
        supplier_number: supplierNumber,
        name,
        contact_person: contactPerson || null,
        email: email || null,
        phone: phone || null,
        payment_terms: paymentTerms || "NET_30",
        addressLine1: addressLine1 || null,
        addressLine2: addressLine2 || null,
        city: city || null,
        state: state || null,
        postalCode: postalCode || null,
        country: country || "US",
        taxId: taxId || null,
        website: website || null,
        notes: notes || null,
        tags: tags || [],
      },
    });

    // If primary contact details provided, create a vendor_contact entry
    if (contactPerson && (email || phone)) {
      await database.vendorContact.create({
        data: {
          tenantId,
          supplierId: vendor.id,
          contactName: contactPerson,
          contactEmail: email || null,
          contactPhone: phone || null,
          isPrimary: true,
        },
      });
    }

    return manifestSuccessResponse({ vendor: mapVendorToSnake(vendor) });
  } catch (error) {
    captureException(error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
