import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { log } from "@repo/observability/log";

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

    const result = await database.$transaction(async (tx) => {
      const existing = await tx.employeeBankAccount.findFirst({
        where: { tenantId, id, deletedAt: null },
        select: { id: true, employeeId: true, isDefault: true },
      });

      if (!existing) {
        return null;
      }

      await tx.employeeBankAccount.update({
        where: { tenantId_id: { tenantId, id } },
        data: { deletedAt: new Date() },
      });

      if (existing.isDefault) {
        const newDefault = await tx.employeeBankAccount.findFirst({
          where: {
            tenantId,
            employeeId: existing.employeeId,
            deletedAt: null,
          },
          orderBy: { createdAt: "desc" },
          select: { tenantId: true, id: true },
        });

        if (newDefault) {
          await tx.employeeBankAccount.update({
            where: {
              tenantId_id: { tenantId: newDefault.tenantId, id: newDefault.id },
            },
            data: { isDefault: true },
          });
        } else {
          await tx.user.update({
            where: { tenantId_id: { tenantId, id: existing.employeeId } },
            data: { payoutMethod: "check" },
          });
        }
      }

      return existing;
    });

    if (!result) {
      return NextResponse.json(
        { error: "Bank account not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, id: result.id });
  } catch (error) {
    captureException(error);
    log.error("Failed to delete bank account:", error);
    return NextResponse.json(
      { error: "Failed to delete bank account" },
      { status: 500 }
    );
  }
}
