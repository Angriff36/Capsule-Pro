/**
 * @module ContractSendAPI
 * @intent Handle sending contracts to clients for signature
 * @responsibility Process send requests, update contract status, initiate notification flow
 * @domain Events
 * @tags contracts, api, send
 * @canonical true
 */
import { type NextRequest, NextResponse } from "next/server";
type ContractSendAPIContext = {
  params: Promise<{
    contractId: string;
  }>;
};
/**
 * POST /api/events/contracts/[contractId]/send
 * Send contract to client for signature
 */
export declare function POST(
  request: NextRequest,
  context: ContractSendAPIContext
): Promise<
  | NextResponse<{
      error: string;
    }>
  | NextResponse<{
      success: boolean;
      message: string;
      clientEmail: string;
    }>
>;
//# sourceMappingURL=route.d.ts.map
