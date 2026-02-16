/**
 * Chart of Accounts CRUD API Endpoints
 *
 * GET    /api/accounting/accounts      - List all accounts with hierarchy support
 * POST   /api/accounting/accounts      - Create new account
 */

import { auth } from "@repo/auth/server";
import { database, type PrismaClient } from "@repo/database";
import { NextResponse } from "next/server";
import { InvariantError } from "@/app/lib/invariant";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import type { CreateAccountRequest } from "./types";
import {
  parseAccountListFilters,
  validateCreateAccountRequest,
} from "./validation";

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
 * Create a new account
 */
export async function POST(request: Request) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const body = await request.json();

    // Validate request body
    validateCreateAccountRequest(body);

    const data = body as CreateAccountRequest;

    // Check for duplicate account number
    const existingAccount = await checkDuplicateAccountNumber(
      database,
      tenantId,
      data.accountNumber
    );

    if (existingAccount) {
      return NextResponse.json(
        { message: "An account with this number already exists" },
        { status: 409 }
      );
    }

    // Validate parent account if provided
    if (data.parentId) {
      const parentExists = await validateParentAccount(
        database,
        tenantId,
        data.parentId
      );

      if (!parentExists) {
        return NextResponse.json(
          { message: "Parent account not found or inactive" },
          { status: 400 }
        );
      }
    }

    // Create account
    const account = await database.chartOfAccount.create({
      data: {
        tenantId,
        accountNumber: data.accountNumber.trim(),
        accountName: data.accountName.trim(),
        accountType: data.accountType,
        parentId: data.parentId || null,
        description: data.description?.trim() || null,
      },
    });

    return NextResponse.json({ data: account }, { status: 201 });
  } catch (error) {
    if (error instanceof InvariantError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    console.error("Error creating account:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
