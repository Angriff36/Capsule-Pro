export type RecipeSeed = {
  id: string;
  name: string;
  version: number;
  cuisine: string;
  cost: number;
  yield: number;
  allergens: string[];
};
export type PrepListSeed = {
  id: string;
  name: string;
  station: string;
  eventId: string;
  assignedTo: string;
  status: "pending" | "in-progress" | "complete";
};
export type EventSeed = {
  id: string;
  name: string;
  date: string;
  location: string;
  budget: number;
  margin: number;
  status: "planning" | "on-site" | "complete";
};
export type StaffSeed = {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  station: string;
  availability: string[];
};
export type ClientSeed = {
  id: string;
  name: string;
  contact: string;
  lifetimeValue: number;
  lastEvent: string;
};
export type FinanceSeed = {
  period: string;
  revenue: number;
  cogs: number;
  labor: number;
  netMargin: number;
};
export declare const seedRecipes: RecipeSeed[];
export declare const seedPrepLists: PrepListSeed[];
export declare const seedEvents: EventSeed[];
export declare const seedStaff: StaffSeed[];
export declare const seedClients: ClientSeed[];
export declare const seedFinance: FinanceSeed[];
export declare const seedKitchenAnalytics: {
  stationThroughput: {
    stationId: string;
    stationName: string;
    load: number;
    completed: number;
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
//# sourceMappingURL=seed-data.d.ts.map
