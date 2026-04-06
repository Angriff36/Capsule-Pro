import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
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
    const { orgId, userId } = await auth();
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

    // Validate routing number (9 digits)
    if (!/^\d{9}$/.test(routingNumber)) {
      return NextResponse.json(
        { error: "Routing number must be 9 digits" },
        { status: 400 }
      );
    }

    // Validate account number (4-17 digits)
    if (!/^\d{4,17}$/.test(accountNumber)) {
      return NextResponse.json(
        { error: "Account number must be 4-17 digits" },
        { status: 400 }
      );
    }

    // If setting as default, unset other defaults for this employee
    if (isDefault) {
      await database.$executeRaw(
        Prisma.sql`
          UPDATE tenant_staff.employee_bank_accounts
          SET is_default = false
          WHERE tenant_id = ${tenantId}
            AND employee_id = ${employeeId}
            AND is_default = true
            AND deleted_at IS NULL
        `
      );
    }

    const [account] = await database.$queryRaw<
      Array<{
        id: string;
        employee_id: string;
        account_number_last4: string;
        status: string;
      }>
    >(
      Prisma.sql`
        INSERT INTO tenant_staff.employee_bank_accounts
          (tenant_id, employee_id, bank_name, account_type, routing_number, account_number, account_holder_name, is_default, notes)
        VALUES
          (${tenantId}, ${employeeId}, ${bankName}, ${accountType}, ${routingNumber}, ${accountNumber}, ${accountHolderName}, ${isDefault}, ${notes || null})
        RETURNING id, employee_id, account_number_last4, status
      `
    );

    // Update employee payout_method to direct_deposit if this is their first account or they set it as default
    const existingCount = await database.$queryRaw<[{ count: bigint }]>(
      Prisma.sql`
        SELECT COUNT(*)::bigint FROM tenant_staff.employee_bank_accounts
        WHERE tenant_id = ${tenantId} AND employee_id = ${employeeId} AND deleted_at IS NULL
      `
    );

    if (Number(existingCount[0].count) <= 1 || isDefault) {
      await database.$executeRaw(
        Prisma.sql`
          UPDATE tenant_staff.employees
          SET payout_method = 'direct_deposit', updated_at = NOW()
          WHERE tenant_id = ${tenantId} AND id = ${employeeId}
        `
      );
    }

    return NextResponse.json(
      { success: true, id: account.id, last4: account.account_number_last4 },
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
