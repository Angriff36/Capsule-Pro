/**
 * Individual Budget Line Item API Endpoints
 *
 * GET    /api/events/budgets/[id]/line-items/[lineItemId]      - Get a specific line item
 * PUT    /api/events/budgets/[id]/line-items/[lineItemId]      - Update a line item
 * DELETE /api/events/budgets/[id]/line-items/[lineItemId]      - Delete a line item
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getTenantIdForOrg, resolveCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest/execute-command";

interface RouteContext {
  params: Promise<{ id: string; lineItemId: string }>;
}

/**
 * GET /api/events/budgets/[id]/line-items/[lineItemId]
 * Get a specific line item
 */
export async function GET(_request: Request, context: RouteContext) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const { id: budgetId, lineItemId } = await context.params;

    const lineItem = await database.budgetLineItem.findUnique({
      where: {
        tenantId_id: {
          tenantId,
          id: lineItemId,
        },
        deletedAt: null,
      },
    });

    if (!lineItem || lineItem.budgetId !== budgetId) {
      return NextResponse.json(
        { message: "Line item not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(lineItem);
  } catch (error) {
    log.error("Error fetching budget line item:", error);
    return NextResponse.json(
      { message: "Failed to fetch budget line item" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/events/budgets/[id]/line-items/[lineItemId]
 * Update a line item
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string; lineItemId: string }> }
) {
  const { id, lineItemId } = await context.params;
  log.info("[BudgetLineItem/PUT] Delegating to manifest update command", {
    id,
    lineItemId,
  });
  const user = await resolveCurrentUser(request);
  const rawBody = await request.json().catch(() => ({})) as Record<string, unknown>;
  return runManifestCommand({ entity: "BudgetLineItem", command: "update", body: { ...rawBody, id: lineItemId, budgetId: id }, user: { id: user.id, tenantId: user.tenantId, role: user.role } });
}

/**
 * DELETE /api/events/budgets/[id]/line-items/[lineItemId]
 * Delete a line item
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; lineItemId: string }> }
) {
  const { id, lineItemId } = await context.params;
  log.info("[BudgetLineItem/DELETE] Delegating to manifest remove command", {
    id,
    lineItemId,
  });
  const user = await resolveCurrentUser(request);
  return runManifestCommand({ entity: "BudgetLineItem", command: "remove", body: { id: lineItemId, budgetId: id }, user: { id: user.id, tenantId: user.tenantId, role: user.role } });
}
