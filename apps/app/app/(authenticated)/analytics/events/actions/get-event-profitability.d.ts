import "server-only";
export type EventProfitabilityMetrics = {
  eventId: string;
  eventTitle: string;
  eventDate: Date;
  guestCount: number;
  budgetedRevenue: number;
  budgetedFoodCost: number;
  budgetedLaborCost: number;
  budgetedOverhead: number;
  budgetedTotalCost: number;
  budgetedGrossMargin: number;
  budgetedGrossMarginPct: number;
  actualRevenue: number;
  actualFoodCost: number;
  actualLaborCost: number;
  actualOverhead: number;
  actualTotalCost: number;
  actualGrossMargin: number;
  actualGrossMarginPct: number;
  revenueVariance: number;
  foodCostVariance: number;
  laborCostVariance: number;
  totalCostVariance: number;
  marginVariancePct: number;
  marginTrend: Array<{
    date: Date;
    marginPct: number;
  }>;
};
export type HistoricalProfitabilityData = {
  period: string;
  totalEvents: number;
  averageGrossMarginPct: number;
  totalRevenue: number;
  totalCost: number;
  averageFoodCostPct: number;
  averageLaborCostPct: number;
  averageOverheadPct: number;
};
export declare function calculateEventProfitability(
  eventId: string
): Promise<EventProfitabilityMetrics>;
export declare function getHistoricalProfitability(
  months?: number
): Promise<HistoricalProfitabilityData[]>;
export declare function getEventProfitabilityList(
  limit?: number
): Promise<EventProfitabilityMetrics[]>;
//# sourceMappingURL=get-event-profitability.d.ts.map
