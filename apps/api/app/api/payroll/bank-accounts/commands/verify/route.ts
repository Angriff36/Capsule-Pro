import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { captureException } from "@sentry/nextjs";
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
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const body = await request.json();
    const { id, method } = body;

    if (!(id && method)) {
      return NextResponse.json(
        { error: "Account ID and verification method required" },
        { status: 400 }
      );
    }

    const validMethods = ["micro_deposit", "plaid", "manual"];
    if (!validMethods.includes(method)) {
      return NextResponse.json(
        { error: `Invalid method. Must be one of: ${validMethods.join(", ")}` },
        { status: 400 }
      );
    }

    const result = await database.employeeBankAccount.updateMany({
      where: { tenantId, id, deletedAt: null },
      data: {
        status: "verified",
        verifiedAt: new Date(),
        verificationMethod: method,
      },
    });

    if (result.count === 0) {
      return NextResponse.json(
        { error: "Bank account not found" },
        { status: 404 }
      );
    }

    const verified = await database.employeeBankAccount.findUniqueOrThrow({
      where: { tenantId_id: { tenantId, id } },
      select: { id: true, accountNumberLast4: true },
    });

    return NextResponse.json({
      success: true,
      id: verified.id,
      last4: verified.accountNumberLast4,
      method,
    });
  } catch (error) {
    captureException(error);
    console.error("Failed to verify bank account:", error);
    return NextResponse.json(
      { error: "Failed to verify bank account" },
      { status: 500 }
    );
  }
}
