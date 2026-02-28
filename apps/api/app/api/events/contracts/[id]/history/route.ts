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
import { type NextRequest, NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

interface ContractHistoryAPIContext {
  params: Promise<{
    id: string;
  }>;
}

interface HistoryEntry {
  id: string;
  action: string;
  performedBy: string | null;
  performerFirstName: string | null;
  performerLastName: string | null;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  createdAt: Date;
}

interface SignatureHistoryEntry {
  id: string;
  type: "signature";
  signerName: string;
  signerEmail: string | null;
  signedAt: Date;
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
    // Verify contract exists and belongs to tenant
    const contract = await database.eventContract.findUnique({
      where: {
        tenantId_id: {
          tenantId,
          id: contractId,
        },
      },
    });

    if (!contract) {
      return NextResponse.json(
        { error: "Contract not found" },
        { status: 404 }
      );
    }

    // Fetch audit log entries for this contract
    const auditEntries = await database.$queryRaw<HistoryEntry[]>`
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

    // Fetch signatures for this contract
    const signatures = await database.contractSignature.findMany({
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
    console.error("Error fetching contract history:", error);
    return NextResponse.json(
      { error: "Failed to fetch contract history" },
      { status: 500 }
    );
  }
}
