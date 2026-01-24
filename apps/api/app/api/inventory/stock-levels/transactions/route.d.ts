/**
 * Inventory Transaction History API Endpoint
 *
 * GET    /api/inventory/stock-levels/transactions      - List transaction history
 */
import { NextResponse } from "next/server";
import type { TransactionListResponse } from "../types";
/**
 * GET /api/inventory/stock-levels/transactions - List transaction history
 */
export declare function GET(request: Request): Promise<
  | NextResponse<{
      message: string;
    }>
  | NextResponse<TransactionListResponse>
>;
//# sourceMappingURL=route.d.ts.map
