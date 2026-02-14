/**
 * Single Chart of Account CRUD API Endpoints
 *
 * GET    /api/accounting/accounts/[id]  - Get account details
 * PUT    /api/accounting/accounts/[id]  - Update account (draft only)
 * DELETE /api/accounting/accounts/[id]  - Deactivate account (soft delete)
 */

import { auth } from "@repo/auth/server";
import { database, type PrismaClient } from "@repo/database";
import { NextResponse } from "next/server";
import { InvariantError, invariant } from "@/app/lib/invariant";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { checkDuplicateAccountNumber, validateParentAccount } from "../route";
import type { UpdateAccountRequest } from "../types";
import { validateUpdateAccountRequest } from "../validation";

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
 * Check if account has journal entries (would restrict certain updates)
 * Note: This is a placeholder for when JournalEntry model is implemented
 * For now, we'll allow all updates since journal entries don't exist yet
 */
function accountHasJournalEntries(): boolean {
  // TODO: Implement when JournalEntry model exists
  // const entryCount = await database.journalEntry.count({
  //   where: {
  //     OR: [
  //       { debitAccountId: accountId },
  //       { creditAccountId: accountId },
  //     ],
  //   },
  // });
  // return entryCount > 0;
  return false;
}

/**
 * Check if account has child accounts
 */
async function accountHasChildren(
  database: PrismaClient,
  tenantId: string,
  accountId: string
): Promise<boolean> {
  const childCount = await database.chartOfAccount.count({
    where: {
      AND: [{ tenantId }, { parentId: accountId }, { isActive: true }],
    },
  });
  return childCount > 0;
}

/**
 * Validate account update restrictions based on journal entries
 */
function validateJournalEntryRestrictions(
  hasEntries: boolean,
  data: UpdateAccountRequest
): NextResponse<unknown> | null {
  if (hasEntries && data.accountNumber !== undefined) {
    return NextResponse.json(
      {
        message:
          "Cannot change account number for accounts with journal entries",
      },
      { status: 400 }
    );
  }

  if (hasEntries && data.accountType !== undefined) {
    return NextResponse.json(
      {
        message: "Cannot change account type for accounts with journal entries",
      },
      { status: 400 }
    );
  }

  return null;
}

/**
 * Validate parent account changes for circular references
 */
async function validateParentAccountChange(
  database: PrismaClient,
  tenantId: string,
  accountId: string,
  parentId: string | null
): Promise<NextResponse<unknown> | null> {
  // Cannot set self as parent
  if (parentId === accountId) {
    return NextResponse.json(
      { message: "An account cannot be its own parent" },
      { status: 400 }
    );
  }

  // Check if parent exists and is active
  if (parentId !== null) {
    const parentExists = await validateParentAccount(
      database,
      tenantId,
      parentId
    );

    if (!parentExists) {
      return NextResponse.json(
        { message: "Parent account not found or inactive" },
        { status: 400 }
      );
    }

    // Check if this would create a circular reference
    let currentParentId: string | null = parentId;
    const visited = new Set<string>([accountId]);

    while (currentParentId) {
      if (visited.has(currentParentId)) {
        return NextResponse.json(
          { message: "Circular reference detected in account hierarchy" },
          { status: 400 }
        );
      }

      visited.add(currentParentId);
      const parentAccount: { parentId: string | null } | null =
        await database.chartOfAccount.findFirst({
          where: {
            AND: [{ tenantId }, { id: currentParentId }],
          },
          select: { parentId: true },
        });

      currentParentId = parentAccount?.parentId ?? null;
    }
  }

  return null;
}

/**
 * Build update data from request
 */
function buildUpdateData(data: UpdateAccountRequest): Record<string, unknown> {
  const updateData: Record<string, unknown> = {};

  if (data.accountName !== undefined) {
    updateData.accountName = data.accountName.trim();
  }

  if (data.accountNumber !== undefined) {
    updateData.accountNumber = data.accountNumber.trim();
  }

  if (data.accountType !== undefined) {
    updateData.accountType = data.accountType;
  }

  if (data.parentId !== undefined) {
    updateData.parentId = data.parentId;
  }

  if (data.description !== undefined) {
    updateData.description = data.description?.trim() || null;
  }

  if (data.isActive !== undefined) {
    updateData.isActive = data.isActive;
  }

  return updateData;
}

/**
 * PUT /api/accounting/accounts/[id]
 * Update account
 */
export async function PUT(
  request: Request,
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
    const body = await request.json();

    // Validate request body
    validateUpdateAccountRequest(body);

    // Check if account exists
    const existingAccount = await database.chartOfAccount.findFirst({
      where: {
        AND: [{ tenantId }, { id }],
      },
    });

    if (!existingAccount) {
      return NextResponse.json(
        { message: "Account not found" },
        { status: 404 }
      );
    }

    const data = body as UpdateAccountRequest;

    // Check if account has journal entries
    const hasEntries = accountHasJournalEntries();

    // Validate journal entry restrictions
    const restrictionError = validateJournalEntryRestrictions(hasEntries, data);
    if (restrictionError) {
      return restrictionError;
    }

    // Check for duplicate account number (if changing)
    if (
      data.accountNumber &&
      data.accountNumber !== existingAccount.accountNumber
    ) {
      const duplicateAccount = await checkDuplicateAccountNumber(
        database,
        tenantId,
        data.accountNumber,
        id
      );

      if (duplicateAccount) {
        return NextResponse.json(
          { message: "An account with this number already exists" },
          { status: 409 }
        );
      }
    }

    // Validate parent account change if provided
    if (data.parentId !== undefined) {
      const parentError = await validateParentAccountChange(
        database,
        tenantId,
        id,
        data.parentId
      );
      if (parentError) {
        return parentError;
      }
    }

    // Build update data
    const updateData = buildUpdateData(data);

    // Update account
    const updatedAccount = await database.chartOfAccount.update({
      where: {
        tenantId_id: {
          tenantId,
          id,
        },
      },
      data: updateData,
    });

    return NextResponse.json({ data: updatedAccount });
  } catch (error) {
    if (error instanceof InvariantError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    console.error("Error updating account:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/accounting/accounts/[id]
 * Deactivate account (soft delete via isActive = false)
 */
export async function DELETE(
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

    // Check if account exists
    const existingAccount = await database.chartOfAccount.findFirst({
      where: {
        AND: [{ tenantId }, { id }],
      },
    });

    if (!existingAccount) {
      return NextResponse.json(
        { message: "Account not found" },
        { status: 404 }
      );
    }

    // Check if account has journal entries
    const hasEntries = accountHasJournalEntries();

    if (hasEntries) {
      return NextResponse.json(
        {
          message: "Cannot deactivate account with journal entries",
        },
        { status: 400 }
      );
    }

    // Check if account has children
    const hasChildren = await accountHasChildren(database, tenantId, id);

    if (hasChildren) {
      return NextResponse.json(
        {
          message:
            "Cannot deactivate account with active child accounts. Deactivate children first.",
        },
        { status: 400 }
      );
    }

    // Deactivate account (soft delete)
    await database.chartOfAccount.update({
      where: {
        tenantId_id: {
          tenantId,
          id,
        },
      },
      data: {
        isActive: false,
      },
    });

    return NextResponse.json({ message: "Account deactivated successfully" });
  } catch (error) {
    if (error instanceof InvariantError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    console.error("Error deactivating account:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
