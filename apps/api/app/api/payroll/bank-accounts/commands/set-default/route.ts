import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

/**
 * POST /api/payroll/bank-accounts/commands/set-default
 * Set a bank account as the default for its employee.
 *
 * Body: { id: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: "Account ID required" }, { status: 400 });
    }

    // Get the account's employee_id first
    const [account] = await database.$queryRaw<
      Array<{ employee_id: string }>
    >(
      Prisma.sql`
        SELECT employee_id FROM tenant_staff.employee_bank_accounts
        WHERE tenant_id = ${tenantId} AND id = ${id} AND deleted_at IS NULL
      `
    );

    if (!account) {
      return NextResponse.json({ error: "Bank account not found" }, { status: 404 });
    }

    // Unset all defaults for this employee, then set the target
    await database.$executeRaw(
      Prisma.sql`
        UPDATE tenant_staff.employee_bank_accounts
        SET is_default = false, updated_at = NOW()
        WHERE tenant_id = ${tenantId}
          AND employee_id = ${account.employee_id}
          AND is_default = true
          AND deleted_at IS NULL
      `
    );

    await database.$executeRaw(
      Prisma.sql`
        UPDATE tenant_staff.employee_bank_accounts
        SET is_default = true, updated_at = NOW()
        WHERE tenant_id = ${tenantId} AND id = ${id}
      `
    );

    // Update employee payout_method
    await database.$executeRaw(
      Prisma.sql`
        UPDATE tenant_staff.employees
        SET payout_method = 'direct_deposit', updated_at = NOW()
        WHERE tenant_id = ${tenantId} AND id = ${account.employee_id}
      `
    );

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error("Failed to set default bank account:", error);
    return NextResponse.json({ error: "Failed to set default" }, { status: 500 });
  }
}
