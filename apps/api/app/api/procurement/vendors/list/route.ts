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

    const where = {
      tenantId,
      deletedAt: null as string | null,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              {
                contact_person: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
              { email: { contains: search, mode: "insensitive" as const } },
              {
                supplier_number: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
            ],
          }
        : {}),
    };

    const vendors = await database.inventorySupplier.findMany({
      where,
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
      take: limit,
      skip: offset,
    });

    // Shape to match the original raw SQL response format (snake_case)
    const shaped = vendors.map((v) => ({
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
      performance_rating: v.performanceRating,
      notes: v.notes,
      tags: v.tags,
      created_at: v.createdAt,
      updated_at: v.updatedAt,
      contact_count: v._count.vendorContacts,
      catalog_item_count: v._count.vendorCatalogs,
    }));

    return manifestSuccessResponse({ vendors: shaped, limit, offset });
  } catch (error) {
    captureException(error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
