export interface StationThroughput {
  stationId: string;
  stationName: string;
  load: number;
  completed: number;
  avgTime: string;
  totalItems: number;
  completedItems: number;
  pendingItems: number;
}
export interface KitchenHealth {
  prepListsSync: {
    rate: number;
    total: number;
    completed: number;
  };
  allergenWarnings: number;
  wasteAlerts: number;
  timeToCompletion: string;
  avgMinutes: number;
}
export interface StationTrend {
  stationName: string;
  total: number;
  completed: number;
  completionRate: number;
}
export interface DateTrend {
  date: string;
  stations: StationTrend[];
}
export interface TopPerformer {
  employeeId: string;
  firstName: string;
  lastName: string;
  completedTasks: number;
  avgMinutes: number;
}
export interface KitchenAnalyticsResponse {
  summary: {
    period: string;
    startDate: string;
    endDate: string;
    locationId: string | null;
  };
  stationThroughput: StationThroughput[];
  kitchenHealth: KitchenHealth;
  trends: DateTrend[];
  topPerformers: TopPerformer[];
}
export interface UseKitchenAnalyticsResult {
  data: KitchenAnalyticsResponse | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}
export declare function useKitchenAnalytics(
  period?: string,
  locationId?: string
): UseKitchenAnalyticsResult;
export declare function formatCompletionTime(minutes: number): string;
export declare function getLoadColor(load: number): string;
export declare function getCompletionColor(rate: number): string;
//# sourceMappingURL=use-kitchen-analytics.d.ts.map
