export interface FinanceHighlight {
  label: string;
  value: string;
  trend: string;
  isPositive?: boolean;
}
export interface LedgerEntry {
  label: string;
  amount: string;
}
export interface FinanceAlert {
  message: string;
  severity: "High" | "Medium" | "Low";
}
export interface FinanceMetrics {
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
}
export interface FinanceAnalyticsData {
  summary: {
    period: string;
    startDate: string;
    endDate: string;
    locationId: string | null;
  };
  financeHighlights: FinanceHighlight[];
  ledgerSummary: LedgerEntry[];
  financeAlerts: FinanceAlert[];
  metrics: FinanceMetrics;
}
export interface UseFinanceAnalyticsOptions {
  period?: "7d" | "30d" | "90d" | "12m";
  locationId?: string;
  enabled?: boolean;
}
export interface UseFinanceAnalyticsReturn {
  data: FinanceAnalyticsData | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}
export declare function formatCurrency(amount: number): string;
export declare function formatPercentage(
  value: number,
  decimals?: number
): string;
export declare function getSeverityVariant(
  severity: string
): "destructive" | "outline" | "secondary";
export declare function fetchFinanceAnalytics(
  options?: UseFinanceAnalyticsOptions
): Promise<FinanceAnalyticsData>;
export declare function useFinanceAnalytics(
  options?: UseFinanceAnalyticsOptions
): UseFinanceAnalyticsReturn;
//# sourceMappingURL=use-finance-analytics.d.ts.map
