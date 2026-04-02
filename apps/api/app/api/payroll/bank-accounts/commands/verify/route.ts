import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

/**
 * POST /api/payroll/bank-accounts/commands/verify
 * Verify a bank account (mark as verified).
 *
 * Body: {
 *   id: string,
 *   method: "micro_deposit" | "plaid" | "manual",
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
    const { id, method, notes } = body;

    if (!id || !method) {
      return NextResponse.json({ error: "Account ID and verification method required" }, { status: 400 });
    }

    const validMethods = ["micro_deposit", "plaid", "manual"];
    if (!validMethods.includes(method)) {
      return NextResponse.json({ error: `Invalid method. Must be one of: ${validMethods.join(", ")}` }, { status: 400 });
    }

    const [verified] = await database.$queryRaw<
      Array<{ id: string; employee_id: string; account_number_last4: string }>
    >(
      Prisma.sql`
        UPDATE tenant_staff.employee_bank_accounts
        SET status = 'verified', verified_at = NOW(), verification_method = ${method}, updated_at = NOW()
        WHERE tenant_id = ${tenantId} AND id = ${id} AND deleted_at IS NULL
        RETURNING id, employee_id, account_number_last4
      `
    );

    if (!verified) {
      return NextResponse.json({ error: "Bank account not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      id: verified.id,
      last4: verified.account_number_last4,
      method,
    });
  } catch (error) {
    console.error("Failed to verify bank account:", error);
    return NextResponse.json({ error: "Failed to verify bank account" }, { status: 500 });
  }
}
