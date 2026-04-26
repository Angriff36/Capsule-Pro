// Add a performance rating for a vendor
import { auth } from "@repo/auth/server";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { database } from "@/lib/database";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";

const VALID_CATEGORIES = [
  "overall",
  "quality",
  "delivery",
  "value",
  "communication",
];

export async function POST(request: NextRequest) {
  try {
    const { orgId, userId } = await auth();
    if (!(userId && orgId)) return manifestErrorResponse("Unauthorized", 401);

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) return manifestErrorResponse("Tenant not found", 400);

    const { vendorId, category, rating, comment } = await request.json();

    if (!vendorId) return manifestErrorResponse("vendorId is required", 400);
    if (!(category && VALID_CATEGORIES.includes(category))) {
      return manifestErrorResponse(
        `Invalid category. Must be one of: ${VALID_CATEGORIES.join(", ")}`,
        400
      );
    }
    if (!rating || rating < 1 || rating > 5)
      return manifestErrorResponse("rating must be 1-5", 400);

    // Verify vendor exists
    const existing = await database.inventorySupplier.findFirst({
      where: { tenantId, id: vendorId, deletedAt: null },
    });
    if (!existing) return manifestErrorResponse("Vendor not found", 404);

    // Insert rating
    const vendorRating = await database.vendorRating.create({
      data: {
        tenantId,
        supplierId: vendorId,
        category,
        rating,
        comment: comment || null,
        ratedBy: userId,
      },
    });

    // Update aggregate performance_rating on the vendor (average of all "overall" ratings)
    if (category === "overall") {
      const overallRatings = await database.vendorRating.findMany({
        where: {
          tenantId,
          supplierId: vendorId,
          deletedAt: null,
          category: "overall",
        },
        select: { rating: true },
      });

      if (overallRatings.length > 0) {
        const avg =
          overallRatings.reduce((sum, r) => sum + r.rating, 0) /
          overallRatings.length;
        await database.inventorySupplier.update({
          where: { tenantId_id: { tenantId, id: vendorId } },
          data: { performanceRating: Math.round(avg * 10) / 10 },
        });
      }
    }

    return manifestSuccessResponse({
      rating: {
        id: vendorRating.id,
        category: vendorRating.category,
        rating: vendorRating.rating,
        comment: vendorRating.comment,
        created_at: vendorRating.createdAt,
      },
    });
  } catch (error) {
    captureException(error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
