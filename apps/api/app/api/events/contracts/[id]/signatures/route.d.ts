/**
 * Event Contract Signatures API Endpoints
 *
 * GET  /api/events/contracts/[id]/signatures - List all signatures for a contract
 * POST /api/events/contracts/[id]/signatures - Create a new signature for a contract
 */
import { type NextRequest, NextResponse } from "next/server";
type SignatureListResponse = {
  data: Array<{
    id: string;
    contractId: string;
    signedAt: Date;
    signatureData: string;
    signerName: string;
    signerEmail: string | null;
    ipAddress: string | null;
    contractTitle: string;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};
/**
 * GET /api/events/contracts/[id]/signatures
 * List all signatures for a contract
 */
export declare function GET(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  }
): Promise<
  | NextResponse<SignatureListResponse>
  | NextResponse<{
      message: any;
    }>
>;
/**
 * POST /api/events/contracts/[id]/signatures
 * Create a new signature for a contract
 */
export declare function POST(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  }
): Promise<
  | NextResponse<{
      error: string;
    }>
  | NextResponse<{
      success: boolean;
      signature: {
        id: string;
        tenantId: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        ipAddress: string | null;
        contractId: string;
        signedAt: Date;
        signatureData: string;
        signerName: string;
        signerEmail: string | null;
      };
    }>
>;
//# sourceMappingURL=route.d.ts.map
