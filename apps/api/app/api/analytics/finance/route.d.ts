import { NextResponse } from "next/server";
/**
 * GET /api/analytics/finance
 * Get finance analytics including revenue vs budget, COGS, labor costs, and ledger summary
 */
export declare function GET(request: Request): Promise<
  | NextResponse<{
      message: string;
    }>
  | NextResponse<{
      summary: {
        period: string;
        startDate: string;
        endDate: string;
        locationId: string | null;
      };
      financeHighlights: {
        label: string;
        value: string;
        trend: string;
        isPositive: boolean;
      }[];
      ledgerSummary: {
        label: string;
        amount: string;
      }[];
      financeAlerts: {
        message: string;
        severity: string;
      }[];
      metrics: {
        totalEvents: number;
        budgetedRevenue: number;
        actualRevenue: number;
        budgetedFoodCost: number;
        actualFoodCost: number;
        budgetedLaborCost: number;
        actualLaborCost: number;
        budgetedOtherCost: number;
        actualOtherCost: number;
        totalCost: number;
        grossProfit: number;
        grossProfitMargin: number;
      };
    }>
>;
//# sourceMappingURL=route.d.ts.map
