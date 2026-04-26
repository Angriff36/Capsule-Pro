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

type SupplierRow = {
  id: string;
  supplier_number: string;
  name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  payment_terms: string;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string;
  taxId: string | null;
  website: string | null;
  performanceRating: { toNumber(): number } | null;
  notes: string | null;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    vendorContacts: number;
    vendorCatalogs: number;
  };
};

function mapVendorToSnake(v: SupplierRow) {
  return {
    id: v.id,
    supplier_number: v.supplier_number,
    name: v.name,
    contact_person: v.contact_person,
    email: v.email,
    phone: v.phone,
    payment_terms: v.payment_terms,
    address_line1: v.addressLine1,
    address_line2: v.addressLine2,
    city: v.city,
    state: v.state,
    postal_code: v.postalCode,
    country: v.country,
    tax_id: v.taxId,
    website: v.website,
    performance_rating: v.performanceRating?.toNumber?.() ?? null,
    notes: v.notes,
    tags: v.tags,
    created_at: v.createdAt,
    updated_at: v.updatedAt,
    contact_count: v._count?.vendorContacts ?? 0,
    catalog_item_count: v._count?.vendorCatalogs ?? 0,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { orgId, userId } = await auth();
    if (!(userId && orgId)) return manifestErrorResponse("Unauthorized", 401);

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) return manifestErrorResponse("Tenant not found", 400);

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || "";

    const vendors = await database.inventorySupplier.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(search && {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { contact_person: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            {
              supplier_number: { contains: search, mode: "insensitive" },
            },
          ],
        }),
      },
      include: {
        _count: {
          select: {
            vendorContacts: { where: { deletedAt: null } },
            vendorCatalogs: {
              where: { deletedAt: null, isActive: true },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return manifestSuccessResponse({
      vendors: vendors.map(mapVendorToSnake),
    });
  } catch (error) {
    captureException(error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
