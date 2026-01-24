/**
 * Individual Event Budget API Endpoints
 *
 * GET    /api/events/budgets/[id]      - Get a specific budget
 * PUT    /api/events/budgets/[id]      - Update a budget
 * DELETE /api/events/budgets/[id]      - Soft delete a budget
 */
import { NextResponse } from "next/server";
interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}
/**
 * GET /api/events/budgets/[id]
 * Get a specific budget with line items
 */
export declare function GET(
  request: Request,
  context: RouteContext
): Promise<
  | NextResponse<{
      message: string;
    }>
  | NextResponse<
      {
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
      } & {
        id: string;
        status: string;
        tenantId: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        notes: string | null;
        eventId: string;
        version: number;
        totalBudgetAmount: import("@prisma/client/runtime/client").Decimal;
        totalActualAmount: import("@prisma/client/runtime/client").Decimal;
        varianceAmount: import("@prisma/client/runtime/client").Decimal;
        variancePercentage: import("@prisma/client/runtime/client").Decimal;
      }
    >
>;
/**
 * PUT /api/events/budgets/[id]
 * Update a budget
 */
export declare function PUT(
  request: Request,
  context: RouteContext
): Promise<
  | NextResponse<{
      message: string;
    }>
  | NextResponse<
      | ({
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
        } & {
          id: string;
          status: string;
          tenantId: string;
          createdAt: Date;
          updatedAt: Date;
          deletedAt: Date | null;
          notes: string | null;
          eventId: string;
          version: number;
          totalBudgetAmount: import("@prisma/client/runtime/client").Decimal;
          totalActualAmount: import("@prisma/client/runtime/client").Decimal;
          varianceAmount: import("@prisma/client/runtime/client").Decimal;
          variancePercentage: import("@prisma/client/runtime/client").Decimal;
        })
      | null
    >
>;
/**
 * DELETE /api/events/budgets/[id]
 * Soft delete a budget
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
