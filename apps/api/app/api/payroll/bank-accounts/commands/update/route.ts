import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

/**
 * POST /api/payroll/bank-accounts/commands/update
 * Update a bank account.
 *
 * Body: {
 *   id: string,
 *   bankName?: string,
 *   accountType?: string,
 *   routingNumber?: string,
 *   accountNumber?: string,
 *   accountHolderName?: string,
 *   notes?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const body = await request.json();
    const {
      id,
      bankName,
      accountType,
      routingNumber,
      accountNumber,
      accountHolderName,
      notes,
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Account ID required" },
        { status: 400 }
      );
    }

    if (routingNumber && !/^\d{9}$/.test(routingNumber)) {
      return NextResponse.json(
        { error: "Routing number must be 9 digits" },
        { status: 400 }
      );
    }

    if (accountNumber && !/^\d{4,17}$/.test(accountNumber)) {
      return NextResponse.json(
        { error: "Account number must be 4-17 digits" },
        { status: 400 }
      );
    }

    const data: Record<string, unknown> = {};
    if (bankName !== undefined) data.bankName = bankName;
    if (accountType !== undefined) data.accountType = accountType;
    if (routingNumber !== undefined) data.routingNumber = routingNumber;
    if (accountNumber !== undefined) data.accountNumber = accountNumber;
    if (accountHolderName !== undefined) {
      data.accountHolderName = accountHolderName;
    }
    if (notes !== undefined) data.notes = notes;

    const result = await database.employeeBankAccount.updateMany({
      where: { tenantId, id, deletedAt: null },
      data,
    });

    if (result.count === 0) {
      return NextResponse.json(
        { error: "Bank account not found" },
        { status: 404 }
      );
    }

    const updated = await database.employeeBankAccount.findUniqueOrThrow({
      where: { tenantId_id: { tenantId, id } },
      select: { id: true, accountNumberLast4: true },
    });

    return NextResponse.json({
      success: true,
      id: updated.id,
      last4: updated.accountNumberLast4,
    });
  } catch (error) {
    captureException(error);
    console.error("Failed to update bank account:", error);
    return NextResponse.json(
      { error: "Failed to update bank account" },
      { status: 500 }
    );
  }
}
