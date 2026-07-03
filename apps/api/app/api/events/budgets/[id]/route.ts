/**
 * Individual Event Budget API Endpoints
 *
 * GET    /api/events/budgets/[id]      - Get a specific budget
 * PUT    /api/events/budgets/[id]      - Update a budget
 * DELETE /api/events/budgets/[id]      - Soft delete a budget
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getTenantIdForOrg, resolveCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest/execute-command";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/events/budgets/[id]
 * Get a specific budget with line items
 */
export async function GET(_request: Request, context: RouteContext) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const { id } = await context.params;

    const budget = await database.eventBudget.findFirst({
      where: {
        tenantId,
        id,
        deletedAt: null,
      },
      include: {
        budgetLineItems: {
          where: { deletedAt: null },
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    if (!budget) {
      return NextResponse.json(
        { message: "Budget not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(budget);
  } catch (error) {
    log.error("Error fetching event budget:", error);
    return NextResponse.json(
      { message: "Failed to fetch event budget" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/events/budgets/[id]
 * Update a budget
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  log.info("[EventBudget/PUT] Delegating to manifest update command", {
    id,
  });
  const user = await resolveCurrentUser(request);
  const rawBody = (await request.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  return runManifestCommand({
    entity: "EventBudget",
    command: "update",
    body: { ...rawBody, id },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });
}

/**
 * DELETE /api/events/budgets/[id]
 * Soft delete a budget
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  log.info("[EventBudget/DELETE] Delegating to manifest finalize command", {
    id,
  });
  const user = await resolveCurrentUser(request);
  return runManifestCommand({
    entity: "EventBudget",
    command: "finalize",
    body: { id },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });
}
