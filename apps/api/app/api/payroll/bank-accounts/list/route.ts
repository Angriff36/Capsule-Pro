import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

/**
 * GET /api/payroll/bank-accounts
 * List bank accounts for employees.
 *
 * Query params:
 *   employeeId (optional) — filter to one employee
 *   status (optional) — filter by status (pending/verified/disabled)
 *   includeDepositHistory (optional) — include deposit_history field
 *
 * Returns: { accounts: BankAccount[], employees: Employee[] }
 */
export async function GET(request: NextRequest) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const { searchParams } = new URL(request.url);

    const employeeId = searchParams.get("employeeId");
    const status = searchParams.get("status");
    const includeHistory = searchParams.get("includeDepositHistory") === "true";

    const [rawAccounts, rawEmployees] = await Promise.all([
      database.employeeBankAccount.findMany({
        where: {
          tenantId,
          deletedAt: null,
          ...(employeeId ? { employeeId } : {}),
          ...(status ? { status } : {}),
        },
        select: {
          id: true,
          employeeId: true,
          bankName: true,
          accountType: true,
          routingNumber: true,
          accountNumberLast4: true,
          accountHolderName: true,
          isDefault: true,
          status: true,
          verifiedAt: true,
          verificationMethod: true,
          notes: true,
          createdAt: true,
          updatedAt: true,
          ...(includeHistory ? { depositHistory: true } : {}),
        },
        orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
      }),
      database.user.findMany({
        where: { tenantId, deletedAt: null, isActive: true },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          payoutMethod: true,
        },
        orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      }),
    ]);

    const accounts = rawAccounts.map((a) => ({
      id: a.id,
      employee_id: a.employeeId,
      bank_name: a.bankName,
      account_type: a.accountType,
      routing_number: a.routingNumber,
      account_number_last4: a.accountNumberLast4,
      account_holder_name: a.accountHolderName,
      is_default: a.isDefault,
      status: a.status,
      verified_at: a.verifiedAt,
      verification_method: a.verificationMethod,
      notes: a.notes,
      created_at: a.createdAt,
      updated_at: a.updatedAt,
      ...(includeHistory && "depositHistory" in a
        ? { deposit_history: a.depositHistory }
        : {}),
    }));

    const employees = rawEmployees.map((e) => ({
      id: e.id,
      first_name: e.firstName,
      last_name: e.lastName,
      email: e.email,
      payout_method: e.payoutMethod,
    }));

    return NextResponse.json({ accounts, employees });
  } catch (error) {
    captureException(error);
    console.error("Failed to list bank accounts:", error);
    return NextResponse.json(
      { error: "Failed to list bank accounts" },
      { status: 500 }
    );
  }
}
