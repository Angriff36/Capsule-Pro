/**
 * Individual Budget Line Item API Endpoints
 *
 * GET    /api/events/budgets/[id]/line-items/[lineItemId]      - Get a specific line item
 * PUT    /api/events/budgets/[id]/line-items/[lineItemId]      - Update a line item
 * DELETE /api/events/budgets/[id]/line-items/[lineItemId]      - Delete a line item
 */
import { NextResponse } from "next/server";
interface RouteContext {
  params: Promise<{
    id: string;
    lineItemId: string;
  }>;
}
/**
 * GET /api/events/budgets/[id]/line-items/[lineItemId]
 * Get a specific line item
 */
export declare function GET(
  request: Request,
  context: RouteContext
): Promise<
  | NextResponse<{
      id: string;
      description: string | null;
      category: string;
      name: string;
      tenantId: string;
      createdAt: Date;
      updatedAt: Date;
      deletedAt: Date | null;
      notes: string | null;
      sortOrder: number;
      varianceAmount: import("@prisma/client/runtime/client").Decimal;
      budgetId: string;
      budgetedAmount: import("@prisma/client/runtime/client").Decimal;
      actualAmount: import("@prisma/client/runtime/client").Decimal;
    }>
  | NextResponse<{
      message: string;
    }>
>;
/**
 * PUT /api/events/budgets/[id]/line-items/[lineItemId]
 * Update a line item
 */
export declare function PUT(
  request: Request,
  context: RouteContext
): Promise<
  | NextResponse<{
      id: string;
      description: string | null;
      category: string;
      name: string;
      tenantId: string;
      createdAt: Date;
      updatedAt: Date;
      deletedAt: Date | null;
      notes: string | null;
      sortOrder: number;
      varianceAmount: import("@prisma/client/runtime/client").Decimal;
      budgetId: string;
      budgetedAmount: import("@prisma/client/runtime/client").Decimal;
      actualAmount: import("@prisma/client/runtime/client").Decimal;
    }>
  | NextResponse<{
      message: string;
    }>
>;
/**
 * DELETE /api/events/budgets/[id]/line-items/[lineItemId]
 * Delete a line item
 */
export declare function DELETE(
  request: Request,
  context: RouteContext
): Promise<
  NextResponse<{
    message: string;
  }>
>;
//# sourceMappingURL=route.d.ts.map
