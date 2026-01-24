import "server-only";
export type ClientLTVMetrics = {
  totalClients: number;
  totalRevenue: number;
  averageOrderValue: number;
  averageLTV: number;
  medianLTV: number;
  retentionRate: number;
  topClients: Array<{
    id: string;
    name: string;
    email: string | null;
    lifetimeValue: number;
    orderCount: number;
    lastOrderDate: Date | null;
    averageOrderValue: number;
  }>;
  revenueByMonth: Array<{
    month: string;
    revenue: number;
    orders: number;
    clients: number;
  }>;
  cohortData: Array<{
    cohort: string;
    month0: number;
    month1: number;
    month2: number;
    month3: number;
    month4: number;
    month5: number;
    month6: number;
    month7: number;
    month8: number;
    month9: number;
    month10: number;
    month11: number;
  }>;
  predictiveLTV: {
    averagePredictedLTV: number;
    confidence: number;
    clientSegments: Array<{
      segment: string;
      count: number;
      avgHistoricalLTV: number;
      avgPredictedLTV: number;
      growthRate: number;
    }>;
  };
};
type ClientLTVData = {
  id: string;
  name: string;
  email: string | null;
  lifetimeValue: number;
  orderCount: number;
  lastOrderDate: Date | null;
  averageOrderValue: number;
  createdAt: Date;
};
export declare function getClientLTVMetrics(): Promise<ClientLTVMetrics>;
export declare function getClientList(
  sortBy?: "ltv" | "orders" | "recent",
  limit?: number
): Promise<ClientLTVData[]>;
//# sourceMappingURL=get-client-ltv.d.ts.map
