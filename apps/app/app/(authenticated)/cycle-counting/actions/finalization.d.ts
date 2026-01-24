import type { FinalizeResult, VarianceReport } from "../types";
export declare function generateVarianceReports(
  sessionId: string
): Promise<VarianceReport[]>;
export declare function finalizeCycleCountSession(input: {
  sessionId: string;
  approvedById: string;
  notes?: string;
}): Promise<FinalizeResult>;
export declare function getAuditLogs(sessionId: string): Promise<
  Array<{
    id: string;
    sessionId: string;
    recordId: string | null;
    action: string;
    entityType: string;
    entityId: string;
    oldValue: Record<string, unknown> | null;
    newValue: Record<string, unknown> | null;
    performedById: string;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: Date;
  }>
>;
//# sourceMappingURL=finalization.d.ts.map
