import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
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

    // Build the select list — exclude account_number unless explicitly requested
    const accountFields = includeHistory
      ? Prisma.sql`ba.id, ba.employee_id, ba.bank_name, ba.account_type, ba.routing_number,
         ba.account_number_last4, ba.account_holder_name, ba.is_default, ba.status,
         ba.verified_at, ba.verification_method, ba.deposit_history, ba.notes,
         ba.created_at, ba.updated_at`
      : Prisma.sql`ba.id, ba.employee_id, ba.bank_name, ba.account_type, ba.routing_number,
         ba.account_number_last4, ba.account_holder_name, ba.is_default, ba.status,
         ba.verified_at, ba.verification_method, ba.notes,
         ba.created_at, ba.updated_at`;

    const [accounts, employees] = await Promise.all([
      database.$queryRaw<
        Array<{
          id: string;
          employee_id: string;
          bank_name: string;
          account_type: string;
          routing_number: string;
          account_number_last4: string;
          account_holder_name: string;
          is_default: boolean;
          status: string;
          verified_at: Date | null;
          verification_method: string | null;
          deposit_history: any[] | null;
          notes: string | null;
          created_at: Date;
          updated_at: Date;
        }>
      >(
        Prisma.sql`
          SELECT ${accountFields}
          FROM tenant_staff.employee_bank_accounts ba
          WHERE ba.tenant_id = ${tenantId}
            AND ba.deleted_at IS NULL
            ${employeeId ? Prisma.sql`AND ba.employee_id = ${employeeId}` : Prisma.empty}
            ${status ? Prisma.sql`AND ba.status = ${status}` : Prisma.empty}
          ORDER BY ba.is_default DESC, ba.created_at DESC
        `
      ),
      database.$queryRaw<
        Array<{
          id: string;
          first_name: string | null;
          last_name: string | null;
          email: string;
          payout_method: string;
        }>
      >(
        Prisma.sql`
          SELECT id, first_name, last_name, email, payout_method
          FROM tenant_staff.employees
          WHERE tenant_id = ${tenantId}
            AND deleted_at IS NULL
            AND is_active = true
          ORDER BY first_name, last_name
        `
      ),
    ]);

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
