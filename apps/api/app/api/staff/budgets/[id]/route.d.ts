import { NextResponse } from "next/server";
/**
 * GET /api/staff/budgets/[id]
 * Get a single labor budget by ID with current utilization
 */
export declare function GET(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  }
): Promise<
  | NextResponse<{
      message: string;
    }>
  | NextResponse<{
      budget: any;
    }>
>;
/**
 * PUT /api/staff/budgets/[id]
 * Update a labor budget
 *
 * Optional fields:
 * - name
 * - description
 * - budgetTarget
 * - status
 * - overrideReason
 * - threshold80Pct
 * - threshold90Pct
 * - threshold100Pct
 */
export declare function PUT(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  }
): Promise<
  | NextResponse<{
      message: string;
    }>
  | NextResponse<{
      budget: any;
    }>
>;
/**
 * DELETE /api/staff/budgets/[id]
 * Delete (soft delete) a labor budget
 */
export declare function DELETE(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  }
): Promise<
  | NextResponse<{
      message: string;
    }>
  | NextResponse<{
      success: boolean;
    }>
>;
//# sourceMappingURL=route.d.ts.map
