/**
 * @module ContractDocumentAPI
 * @intent Handle contract document uploads
 * @responsibility Process document uploads with validation and storage
 * @domain Events
 * @tags contracts, api, document-upload
 * @canonical true
 */
import { type NextRequest, NextResponse } from "next/server";
type ContractDocumentAPIContext = {
  params: Promise<{
    id: string;
  }>;
};
/**
 * POST /api/events/contracts/[id]/document
 * Upload a contract document
 */
export declare function POST(
  request: NextRequest,
  context: ContractDocumentAPIContext
): Promise<
  | NextResponse<{
      error: string;
    }>
  | NextResponse<{
      success: boolean;
      message: string;
    }>
>;
//# sourceMappingURL=route.d.ts.map
