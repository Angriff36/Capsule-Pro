/**
 * Chart of Accounts CRUD API Endpoints
 *
 * GET    /api/accounting/accounts      - List all accounts with hierarchy support
 * POST   /api/accounting/accounts      - Create new account (manifest command)
 */

import { auth } from "@repo/auth/server";
import { database, type PrismaClient } from "@repo/database";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { InvariantError } from "@/app/lib/invariant";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { executeManifestCommand } from "@/lib/manifest-command-handler";
import { parseAccountListFilters } from "./validation";

export const runtime = "nodejs";

/**
 * GET /api/accounting/accounts
 * List all accounts with hierarchy support and filters
 */
export async function GET(request: Request) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const { searchParams } = new URL(request.url);

    // Parse filters
    const filters = parseAccountListFilters(searchParams);

    // Build where clause
    const whereClause: Record<string, unknown> = {
      tenantId,
    };

    // Add active filter (default to active only)
    if (!filters.includeInactive) {
      whereClause.isActive = true;
    }

    // Add accountType filter
    if (filters.accountType) {
      whereClause.accountType = filters.accountType;
    }

    // Add parentId filter (null for root accounts)
    if (filters.parentId !== undefined) {
      whereClause.parentId = filters.parentId || null;
    }

    // Add search filter (searches account number and name)
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      whereClause.AND = [
        {
          OR: [
            { accountNumber: { contains: searchLower, mode: "insensitive" } },
            { accountName: { contains: searchLower, mode: "insensitive" } },
          ],
        },
      ];
    }

    // Fetch accounts
    const accounts = await database.chartOfAccount.findMany({
      where: whereClause,
      orderBy: [{ accountNumber: "asc" }],
    });

    return NextResponse.json({
      data: accounts,
    });
  } catch (error) {
    if (error instanceof InvariantError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    console.error("Error listing accounts:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Check for duplicate account number within tenant
 */
export async function checkDuplicateAccountNumber(
  database: PrismaClient,
  tenantId: string,
  accountNumber: string,
  excludeId?: string
) {
  const whereClause: Record<string, unknown> = {
    AND: [{ tenantId }, { accountNumber: accountNumber.trim() }],
  };

  if (excludeId) {
    (whereClause.AND as Record<string, unknown>[]).push({
      id: { not: excludeId },
    });
  }

  const existingAccount = await database.chartOfAccount.findFirst({
    where: whereClause,
  });
  return existingAccount;
}

/**
 * Validate parent account exists and belongs to same tenant
 */
export async function validateParentAccount(
  database: PrismaClient,
  tenantId: string,
  parentId: string
): Promise<boolean> {
  const parentAccount = await database.chartOfAccount.findFirst({
    where: {
      AND: [{ tenantId }, { id: parentId }, { isActive: true }],
    },
  });
  return parentAccount !== null;
}

/**
 * POST /api/accounting/accounts
 * Create a new account via manifest command
 */
export function POST(request: NextRequest) {
  return executeManifestCommand(request, {
    entityName: "ChartOfAccount",
    commandName: "create",
    transformBody: (body) => ({
      accountNumber: body.accountNumber || body.account_number,
      accountName: body.accountName || body.account_name,
      accountType: body.accountType || body.account_type,
      parentId: body.parentId || body.parent_id || "",
      description: body.description || "",
    }),
  });
}
