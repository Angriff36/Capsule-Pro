import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { log } from "@repo/observability/log";

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
      return NextResponse.json(
        { error: "Account ID required" },
        { status: 400 }
      );
    }

    const updated = await database.$transaction(async (tx) => {
      const account = await tx.employeeBankAccount.findFirst({
        where: { tenantId, id, deletedAt: null },
        select: { employeeId: true },
      });

      if (!account) {
        return null;
      }

      await tx.employeeBankAccount.updateMany({
        where: {
          tenantId,
          employeeId: account.employeeId,
          isDefault: true,
          deletedAt: null,
        },
        data: { isDefault: false },
      });

      await tx.employeeBankAccount.update({
        where: { tenantId_id: { tenantId, id } },
        data: { isDefault: true },
      });

      await tx.user.update({
        where: { tenantId_id: { tenantId, id: account.employeeId } },
        data: { payoutMethod: "direct_deposit" },
      });

      return { id };
    });

    if (!updated) {
      return NextResponse.json(
        { error: "Bank account not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, id: updated.id });
  } catch (error) {
    captureException(error);
    log.error("Failed to set default bank account:", error);
    return NextResponse.json(
      { error: "Failed to set default" },
      { status: 500 }
    );
  }
}
