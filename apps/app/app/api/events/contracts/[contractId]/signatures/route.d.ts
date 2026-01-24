/**
 * @module ContractSignaturesAPI
 * @intent Handle contract signature creation
 * @responsibility Process signature captures with validation and storage
 * @domain Events
 * @tags contracts, api, signatures
 * @canonical true
 */
import { type NextRequest, NextResponse } from "next/server";
type ContractSignaturesAPIContext = {
  params: Promise<{
    contractId: string;
  }>;
};
/**
 * POST /api/events/contracts/[contractId]/signatures
 * Create a new signature for a contract
 */
export declare function POST(
  request: NextRequest,
  context: ContractSignaturesAPIContext
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
/**
 * GET /api/events/contracts/[contractId]/signatures
 * Get all signatures for a contract
 */
export declare function GET(
  request: NextRequest,
  context: ContractSignaturesAPIContext
): Promise<
  | NextResponse<{
      error: string;
    }>
  | NextResponse<{
      success: boolean;
      signatures: {
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
      }[];
    }>
>;
//# sourceMappingURL=route.d.ts.map
