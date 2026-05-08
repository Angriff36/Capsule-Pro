// Soft-delete a procurement budget
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

    const { budgetId } = await request.json();
    if (!budgetId) return manifestErrorResponse("budgetId is required", 400);

    const result = await database.$queryRaw`
      UPDATE tenant_inventory.procurement_budgets
      SET deleted_at = NOW(), updated_at = NOW()
      WHERE tenant_id = ${tenantId}::uuid AND id = ${budgetId}::uuid AND deleted_at IS NULL
      RETURNING id, name
    `;

    if (!(result as any[]).length)
      return manifestErrorResponse("Budget not found", 404);

    return manifestSuccessResponse({ budget: (result as any[])[0] });
  } catch (error) {
    captureException(error);
    log.error("Error deleting budget:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
