/**
 * @module ContractHistoryAPI
 * @intent Fetch contract history from audit log
 * @responsibility Return contract status changes and other modifications
 * @domain Events
 * @tags contracts, api, history, audit
 * @canonical true
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

interface ContractHistoryAPIContext {
  params: Promise<{
    id: string;
  }>;
}

interface HistoryEntry {
  action: string;
  createdAt: Date;
  id: string;
  newValues: Record<string, unknown> | null;
  oldValues: Record<string, unknown> | null;
  performedBy: string | null;
  performerFirstName: string | null;
  performerLastName: string | null;
}

interface SignatureHistoryEntry {
  id: string;
  signedAt: Date;
  signerEmail: string | null;
  signerName: string;
  type: "signature";
}

type CombinedHistoryEntry =
  | (HistoryEntry & { type: "audit" })
  | SignatureHistoryEntry;

/**
 * GET /api/events/contracts/[id]/history
 * Get contract history including status changes and signatures
 */
export async function GET(
  _request: NextRequest,
  context: ContractHistoryAPIContext
) {
  const { id: contractId } = await context.params;
  const { orgId } = await auth();

  if (!orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);

  try {
    // Verify contract exists and belongs to tenant (existence guard — only `id` is needed)
    const contract = await database.eventContract.findUnique({
      where: {
        tenantId_id: {
          tenantId,
          id: contractId,
        },
      },
      select: { id: true },
    });

    if (!contract) {
      return NextResponse.json(
        { error: "Contract not found" },
        { status: 404 }
      );
    }

    // ponytail: audit log + signatures are independent (each keys off route
    // contractId/tenantId, never the other read's result) — fire both, then await
    // together (2 serial round-trips -> 1). The existence guard stays serial so a
    // 404 still skips these reads.
    const auditPromise = database.$queryRaw<HistoryEntry[]>`
      SELECT
        al.id,
        al.action,
        al.performed_by,
        u.first_name as performer_first_name,
        u.last_name as performer_last_name,
        al.old_values,
        al.new_values,
        al.created_at
      FROM platform.audit_log al
      LEFT JOIN auth.users u ON al.performed_by = u.id
      WHERE al.table_name = 'event_contracts'
        AND al.record_id = ${contractId}::uuid
        AND (al.tenant_id = ${tenantId}::uuid OR al.tenant_id IS NULL)
      ORDER BY al.created_at DESC
      LIMIT 50
    `;

    const signaturesPromise = database.contractSignature.findMany({
      where: {
        contractId,
      },
      orderBy: {
        signedAt: "desc",
      },
      select: {
        id: true,
        signerName: true,
        signerEmail: true,
        signedAt: true,
      },
    });

    const [auditEntries, signatures] = await Promise.all([
      auditPromise,
      signaturesPromise,
    ]);

    // Combine audit entries and signatures into a unified history
    const history: CombinedHistoryEntry[] = [
      ...auditEntries.map((entry) => ({
        ...entry,
        type: "audit" as const,
      })),
      ...signatures.map((sig) => ({
        ...sig,
        type: "signature" as const,
      })),
    ];

    // Sort by created_at/signed_at descending
    history.sort((a, b) => {
      const dateA = a.type === "audit" ? a.createdAt : a.signedAt;
      const dateB = b.type === "audit" ? b.createdAt : b.signedAt;
      return dateB.getTime() - dateA.getTime();
    });

    return NextResponse.json({
      history,
    });
  } catch (error) {
    captureException(error);
    log.error("Error fetching contract history:", error);
    return NextResponse.json(
      { error: "Failed to fetch contract history" },
      { status: 500 }
    );
  }
}
