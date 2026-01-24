/**
 * Event Contract Signature API Endpoints
 *
 * POST   /api/events/contracts/[id]/signature - Capture new signature
 */
import { NextResponse } from "next/server";
/**
 * POST /api/events/contracts/[id]/signature
 * Capture new signature for a contract
 */
export declare function POST(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  }
): Promise<
  | NextResponse<{
      data: {
        contractId: string;
        contractTitle: string;
        id: string;
        tenantId: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        ipAddress: string | null;
        signedAt: Date;
        signatureData: string;
        signerName: string;
        signerEmail: string | null;
      };
    }>
  | NextResponse<{
      message: any;
    }>
>;
//# sourceMappingURL=route.d.ts.map
