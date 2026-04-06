import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

/**
 * POST /api/payroll/bank-accounts/commands/delete
 * Soft-delete a bank account.
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
      return NextResponse.json(
        { error: "Account ID required" },
        { status: 400 }
      );
    }

    const [deleted] = await database.$queryRaw<
      Array<{ id: string; employee_id: string; is_default: boolean }>
    >(
      Prisma.sql`
        UPDATE tenant_staff.employee_bank_accounts
        SET deleted_at = NOW(), updated_at = NOW()
        WHERE tenant_id = ${tenantId} AND id = ${id} AND deleted_at IS NULL
        RETURNING id, employee_id, is_default
      `
    );

    if (!deleted) {
      return NextResponse.json(
        { error: "Bank account not found" },
        { status: 404 }
      );
    }

    // If deleted account was default, set the most recent remaining account as default
    if (deleted.is_default) {
      const [newDefault] = await database.$queryRaw<Array<{ id: string }>>(
        Prisma.sql`
          UPDATE tenant_staff.employee_bank_accounts
          SET is_default = true, updated_at = NOW()
          WHERE id = (
            SELECT id FROM tenant_staff.employee_bank_accounts
            WHERE tenant_id = ${tenantId}
              AND employee_id = ${deleted.employee_id}
              AND deleted_at IS NULL
            ORDER BY created_at DESC
            LIMIT 1
          )
          RETURNING id
        `
      );

      // If no accounts remain, reset payout_method to check
      if (!newDefault) {
        await database.$executeRaw(
          Prisma.sql`
            UPDATE tenant_staff.employees
            SET payout_method = 'check', updated_at = NOW()
            WHERE tenant_id = ${tenantId} AND id = ${deleted.employee_id}
          `
        );
      }
    }

    return NextResponse.json({ success: true, id: deleted.id });
  } catch (error) {
    captureException(error);
    console.error("Failed to delete bank account:", error);
    return NextResponse.json(
      { error: "Failed to delete bank account" },
      { status: 500 }
    );
  }
}
