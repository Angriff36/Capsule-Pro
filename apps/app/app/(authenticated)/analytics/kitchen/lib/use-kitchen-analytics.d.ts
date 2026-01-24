export declare function getCompletionColor(
  value: number
): "bg-orange-500" | "bg-amber-500" | "bg-emerald-500" | "bg-red-500";
export declare function useKitchenAnalytics(period: string): {
  data: {
    stationThroughput: {
      load: number;
      completed: number;
      stationId: string;
      stationName: string;
      avgTime: string;
      completedItems: number;
      pendingItems: number;
    }[];
    kitchenHealth: {
      prepListsSync: {
        rate: number;
        completed: number;
        total: number;
      };
      allergenWarnings: number;
      wasteAlerts: number;
      timeToCompletion: string;
    };
    topPerformers: {
      employeeId: string;
      firstName: string;
      lastName: string;
      completedTasks: number;
    }[];
  };
  isLoading: boolean;
  error: null;
};
//# sourceMappingURL=use-kitchen-analytics.d.ts.map
