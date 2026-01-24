/**
 * Event Budget CRUD API Endpoints
 *
 * GET    /api/events/budgets      - List event budgets with pagination and filters
 * POST   /api/events/budgets      - Create a new event budget
 */
import { NextResponse } from "next/server";
/**
 * GET /api/events/budgets
 * List event budgets with pagination, search, and filters
 */
export declare function GET(request: Request): Promise<
  | NextResponse<{
      message: string;
    }>
  | NextResponse<{
      budgets: ({
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
      })[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>
>;
/**
 * POST /api/events/budgets
 * Create a new event budget
 */
export declare function POST(request: Request): Promise<
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
//# sourceMappingURL=route.d.ts.map
