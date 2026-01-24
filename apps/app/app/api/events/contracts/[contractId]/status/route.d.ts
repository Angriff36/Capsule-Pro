/**
 * @module ContractStatusAPI
 * @intent Handle contract status updates
 * @responsibility Process status change requests with validation
 * @domain Events
 * @tags contracts, api, status
 * @canonical true
 */
import { type NextRequest, NextResponse } from "next/server";
type ContractStatusAPIContext = {
  params: Promise<{
    contractId: string;
  }>;
};
/**
 * PATCH /api/events/contracts/[contractId]/status
 * Update contract status
 */
export declare function PATCH(
  request: NextRequest,
  context: ContractStatusAPIContext
): Promise<
  | NextResponse<{
      error: string;
    }>
  | NextResponse<{
      success: boolean;
      contract: {
        id: string;
        title: string;
        status: string;
        tenantId: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        notes: string | null;
        clientId: string;
        eventId: string;
        contractNumber: string | null;
        documentUrl: string | null;
        documentType: string | null;
        expiresAt: Date | null;
      };
    }>
>;
//# sourceMappingURL=route.d.ts.map
