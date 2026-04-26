import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

/**
 * POST /api/payroll/bank-accounts/commands/create
 * Add a bank account for an employee.
 *
 * Body: {
 *   employeeId: string,
 *   bankName: string,
 *   accountType: "checking" | "savings",
 *   routingNumber: string,
 *   accountNumber: string,
 *   accountHolderName: string,
 *   isDefault?: boolean,
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
      employeeId,
      bankName,
      accountType,
      routingNumber,
      accountNumber,
      accountHolderName,
      isDefault,
      notes,
    } = body;

    if (
      !(
        employeeId &&
        bankName &&
        accountType &&
        routingNumber &&
        accountNumber &&
        accountHolderName
      )
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!/^\d{9}$/.test(routingNumber)) {
      return NextResponse.json(
        { error: "Routing number must be 9 digits" },
        { status: 400 }
      );
    }

    if (!/^\d{4,17}$/.test(accountNumber)) {
      return NextResponse.json(
        { error: "Account number must be 4-17 digits" },
        { status: 400 }
      );
    }

    const account = await database.$transaction(async (tx) => {
      if (isDefault) {
        await tx.employeeBankAccount.updateMany({
          where: {
            tenantId,
            employeeId,
            isDefault: true,
            deletedAt: null,
          },
          data: { isDefault: false },
        });
      }

      const created = await tx.employeeBankAccount.create({
        data: {
          tenantId,
          employeeId,
          bankName,
          accountType,
          routingNumber,
          accountNumber,
          accountHolderName,
          isDefault: Boolean(isDefault),
          notes: notes ?? null,
        },
        select: { id: true, accountNumberLast4: true },
      });

      const remainingCount = await tx.employeeBankAccount.count({
        where: { tenantId, employeeId, deletedAt: null },
      });

      if (remainingCount <= 1 || isDefault) {
        await tx.user.update({
          where: { tenantId_id: { tenantId, id: employeeId } },
          data: { payoutMethod: "direct_deposit" },
        });
      }

      return created;
    });

    return NextResponse.json(
      { success: true, id: account.id, last4: account.accountNumberLast4 },
      { status: 201 }
    );
  } catch (error) {
    captureException(error);
    console.error("Failed to create bank account:", error);
    return NextResponse.json(
      { error: "Failed to create bank account" },
      { status: 500 }
    );
  }
}
