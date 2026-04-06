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
    const existing = await database.$queryRaw`
      SELECT id FROM tenant_inventory.inventory_suppliers
      WHERE tenant_id = ${tenantId}::uuid AND id = ${vendorId}::uuid AND deleted_at IS NULL
    `;
    if (!(existing as any[]).length)
      return manifestErrorResponse("Vendor not found", 404);

    // Insert rating
    const result = await database.$queryRaw`
      INSERT INTO tenant_inventory.vendor_ratings (
        tenant_id, supplier_id, category, rating, comment, rated_by
      ) VALUES (
        ${tenantId}::uuid, ${vendorId}::uuid, ${category}, ${rating}::smallint,
        ${comment || null}, ${userId}::uuid
      )
      RETURNING id, category, rating, comment, created_at
    `;

    const vendorRating = (result as any[])[0];

    // Update aggregate performance_rating on the vendor (average of all "overall" ratings)
    const avgResult = await database.$queryRawUnsafe(
      `
      SELECT ROUND(AVG(rating)::decimal, 1) as avg_rating
      FROM tenant_inventory.vendor_ratings
      WHERE tenant_id = $1::uuid AND supplier_id = $2::uuid AND deleted_at IS NULL AND category = 'overall'
    `,
      tenantId,
      vendorId
    );

    const avgRating = (avgResult as any[])[0]?.avg_rating;
    if (avgRating !== null) {
      await database.$queryRaw`
        UPDATE tenant_inventory.inventory_suppliers
        SET performance_rating = ${avgRating}::decimal(2,1), updated_at = NOW()
        WHERE tenant_id = ${tenantId}::uuid AND id = ${vendorId}::uuid
      `;
    }

    return manifestSuccessResponse({ rating: vendorRating });
  } catch (error) {
    captureException(error);
    console.error("Error adding vendor rating:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
