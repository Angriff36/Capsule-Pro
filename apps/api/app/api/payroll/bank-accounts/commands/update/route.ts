import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
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
    const { id, bankName, accountType, routingNumber, accountNumber, accountHolderName, notes } = body;

    if (!id) {
      return NextResponse.json({ error: "Account ID required" }, { status: 400 });
    }

    // Validate routing number if provided
    if (routingNumber && !/^\d{9}$/.test(routingNumber)) {
      return NextResponse.json({ error: "Routing number must be 9 digits" }, { status: 400 });
    }

    // Validate account number if provided
    if (accountNumber && !/^\d{4,17}$/.test(accountNumber)) {
      return NextResponse.json({ error: "Account number must be 4-17 digits" }, { status: 400 });
    }

    const [updated] = await database.$queryRaw<
      Array<{ id: string; account_number_last4: string }>
    >(
      Prisma.sql`
        UPDATE tenant_staff.employee_bank_accounts
        SET
          bank_name = COALESCE(${bankName || null}, bank_name),
          account_type = COALESCE(${accountType || null}, account_type),
          routing_number = COALESCE(${routingNumber || null}, routing_number),
          account_number = COALESCE(${accountNumber || null}, account_number),
          account_holder_name = COALESCE(${accountHolderName || null}, account_holder_name),
          notes = COALESCE(${notes !== undefined ? notes : null}, notes),
          updated_at = NOW()
        WHERE tenant_id = ${tenantId} AND id = ${id} AND deleted_at IS NULL
        RETURNING id, account_number_last4
      `
    );

    if (!updated) {
      return NextResponse.json({ error: "Bank account not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, id: updated.id, last4: updated.account_number_last4 });
  } catch (error) {
    console.error("Failed to update bank account:", error);
    return NextResponse.json({ error: "Failed to update bank account" }, { status: 500 });
  }
}
