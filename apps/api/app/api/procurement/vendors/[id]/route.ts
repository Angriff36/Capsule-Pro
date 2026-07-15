// Get single vendor with contacts and latest ratings
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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId, userId } = await auth();
    if (!(userId && orgId)) {
      return manifestErrorResponse("Unauthorized", 401);
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return manifestErrorResponse("Tenant not found", 400);
    }

    const { id } = await params;

    // ponytail: vendor + catalog count are independent (count keys off route
    // id/tenantId, never the vendor row) — fire both, then await together and
    // check the existence guard after (2 serial round-trips -> 1; the 404 edge
    // case runs the count needlessly — accepted tradeoff, matches sibling routes).
    const [vendor, catalogItemCount] = await Promise.all([
      database.inventorySupplier.findFirst({
        where: { tenantId, id, deletedAt: null },
        include: {
          contacts: {
            where: { deletedAt: null },
            orderBy: [{ isPrimary: "desc" }, { contactName: "asc" }],
          },
          ratings: {
            where: { deletedAt: null },
            orderBy: { createdAt: "desc" },
            take: 20,
          },
        },
      }),
      database.vendorCatalog.count({
        where: { tenantId, supplierId: id, deletedAt: null, isActive: true },
      }),
    ]);

    if (!vendor) {
      return manifestErrorResponse("Vendor not found", 404);
    }

    return manifestSuccessResponse({
      vendor,
      contacts: vendor.contacts,
      ratings: vendor.ratings,
      catalogItemCount,
    });
  } catch (error) {
    captureException(error);
    log.error("Error fetching vendor:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
