/**
 * Bank Reconciliation API
 *
 * GET /api/accounting/bank-reconciliation
 * Returns bank-type chart accounts plus real tenant-wide payment aggregates.
 *
 * NOTE: There is no BankReconciliation model and payments are not linked to
 * specific bank accounts, so this route deliberately returns NO per-account
 * balances or reconciliation statuses — earlier versions fabricated statement
 * balances (round-robin payment split + synthetic variance), which presented
 * fake financial data as operational truth. When a bank-feed/statement model
 * lands, per-account matching belongs here.
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

export const runtime = "nodejs";

/**
 * GET /api/accounting/bank-reconciliation
 */
export async function GET(request: Request) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json(
        { message: "Tenant not found" },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get("page") ?? "1");
    const limit = Math.min(Number(searchParams.get("limit") ?? "25"), 100);
    const skip = (page - 1) * limit;

    const bankAccountWhere = {
      tenantId,
      accountType: "ASSET" as const,
      accountName: { contains: "bank", mode: "insensitive" as const },
      isActive: true,
    };

    const [bankAccounts, totalCount, paymentAggregate, lastPayment] =
      await Promise.all([
        database.chartOfAccount.findMany({
          where: bankAccountWhere,
          orderBy: { accountNumber: "asc" },
          skip,
          take: limit,
          select: {
            id: true,
            accountNumber: true,
            accountName: true,
            description: true,
          },
        }),
        database.chartOfAccount.count({ where: bankAccountWhere }),
        database.payment.aggregate({
          where: { tenantId, status: "COMPLETED", deletedAt: null },
          _count: { id: true },
          _sum: { amount: true },
        }),
        database.payment.findFirst({
          where: { tenantId, status: "COMPLETED", deletedAt: null },
          orderBy: { completedAt: "desc" },
          select: { completedAt: true },
        }),
      ]);

    return NextResponse.json({
      data: bankAccounts,
      metrics: {
        totalAccounts: totalCount,
        completedPaymentCount: paymentAggregate._count.id,
        completedPaymentTotal: Number(paymentAggregate._sum.amount ?? 0),
        lastPaymentDate: lastPayment?.completedAt ?? null,
      },
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    log.error("Error fetching bank reconciliation data:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
