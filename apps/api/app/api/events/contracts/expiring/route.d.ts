/**
 * Event Contracts Expiring API Endpoint
 *
 * GET /api/events/contracts/expiring - Get contracts expiring soon
 */
import { NextResponse } from "next/server";
import type { ContractListResponse } from "../types";
/**
 * GET /api/events/contracts/expiring
 * Get contracts expiring soon with pagination
 */
export declare function GET(request: Request): Promise<
  | NextResponse<{
      message: string;
    }>
  | NextResponse<ContractListResponse>
>;
//# sourceMappingURL=route.d.ts.map
