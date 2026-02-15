/**
 * Individual Event Budget API Endpoints
 *
 * GET    /api/events/budgets/[id]      - Get a specific budget
 * PUT    /api/events/budgets/[id]      - Update a budget
 * DELETE /api/events/budgets/[id]      - Soft delete a budget
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { executeManifestCommand } from "@/lib/manifest-command-handler";

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

    const budget = await database.eventBudget.findUnique({
      where: {
        tenantId_id: {
          tenantId,
          id,
        },
        deletedAt: null,
      },
      include: {
        lineItems: {
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
    console.error("Error fetching event budget:", error);
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
  console.log("[EventBudget/PUT] Delegating to manifest update command", {
    id,
  });
  return executeManifestCommand(request, {
    entityName: "EventBudget",
    commandName: "update",
    params: { id },
    transformBody: (body) => ({ ...body, id }),
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
  console.log("[EventBudget/DELETE] Delegating to manifest finalize command", {
    id,
  });
  return executeManifestCommand(request, {
    entityName: "EventBudget",
    commandName: "finalize",
    params: { id },
    transformBody: (_body) => ({ id }),
  });
}
