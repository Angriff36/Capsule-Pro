/**
 * @module ContractAPI
 * @intent Handle contract CRUD operations - DELETE endpoint
 * @responsibility Process contract deletion with proper validation and soft delete
 * @domain Events
 * @tags contracts, api, delete
 * @canonical true
 */
import { type NextRequest, NextResponse } from "next/server";
type ContractAPIContext = {
  params: Promise<{
    contractId: string;
  }>;
};
/**
 * DELETE /api/events/contracts/[contractId]
 * Delete a contract (soft delete)
 */
export declare function DELETE(
  request: NextRequest,
  context: ContractAPIContext
): Promise<
  | NextResponse<{
      error: string;
    }>
  | NextResponse<{
      success: boolean;
    }>
>;
//# sourceMappingURL=route.d.ts.map
