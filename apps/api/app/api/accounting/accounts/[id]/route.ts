/**
 * Single Chart of Account CRUD API Endpoints
 *
 * GET    /api/accounting/accounts/[id]  - Get account details
 * PUT    /api/accounting/accounts/[id]  - Update account (manifest command)
 * DELETE /api/accounting/accounts/[id]  - Deactivate account (manifest command)
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { InvariantError, invariant } from "@/app/lib/invariant";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { executeManifestCommand } from "@/lib/manifest-command-handler";

export const runtime = "nodejs";

/**
 * GET /api/accounting/accounts/[id]
 * Get account details
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    invariant(id, "params.id must exist");

    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);

    // Get account
    const account = await database.chartOfAccount.findFirst({
      where: {
        AND: [{ tenantId }, { id }],
      },
    });

    if (!account) {
      return NextResponse.json(
        { message: "Account not found" },
        { status: 404 }
      );
    }

    // Get children accounts for hierarchy info
    const children = await database.chartOfAccount.findMany({
      where: {
        AND: [{ tenantId }, { parentId: id }, { isActive: true }],
      },
      orderBy: [{ accountNumber: "asc" }],
    });

    return NextResponse.json({
      data: {
        ...account,
        children,
      },
    });
  } catch (error) {
    if (error instanceof InvariantError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    console.error("Error getting account:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/accounting/accounts/[id]
 * Update account via manifest command
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return executeManifestCommand(request, {
    entityName: "ChartOfAccount",
    commandName: "update",
    params: { id },
    transformBody: (body) => ({ ...body }),
  });
}

/**
 * DELETE /api/accounting/accounts/[id]
 * Deactivate account via manifest command (soft deactivation — sets isActive=false)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return executeManifestCommand(request, {
    entityName: "ChartOfAccount",
    commandName: "deactivate",
    params: { id },
  });
}
