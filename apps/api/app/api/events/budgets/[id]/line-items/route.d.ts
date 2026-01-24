/**
 * Budget Line Items API Endpoints
 *
 * GET    /api/events/budgets/[id]/line-items      - List line items for a budget
 * POST   /api/events/budgets/[id]/line-items      - Create a new line item
 */
import { NextResponse } from "next/server";
interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}
/**
 * GET /api/events/budgets/[id]/line-items
 * List line items for a budget
 */
export declare function GET(
  request: Request,
  context: RouteContext
): Promise<
  | NextResponse<{
      message: string;
    }>
  | NextResponse<{
      lineItems: {
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
      }[];
    }>
>;
/**
 * POST /api/events/budgets/[id]/line-items
 * Create a new line item
 */
export declare function POST(
  request: Request,
  context: RouteContext
): Promise<
  | NextResponse<{
      message: string;
    }>
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
>;
//# sourceMappingURL=route.d.ts.map
