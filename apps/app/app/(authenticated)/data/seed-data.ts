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

export const seedRecipes: RecipeSeed[] = [
  {
    id: "recipe-001",
    name: "Grilled Herb Chicken",
    version: 3,
    cuisine: "Contemporary",
    cost: 42.6,
    yield: 20,
    allergens: ["Dairy"],
  },
  {
    id: "recipe-002",
    name: "Roast Beef au Jus",
    version: 2,
    cuisine: "American",
    cost: 58.1,
    yield: 40,
    allergens: [],
  },
  {
    id: "recipe-003",
    name: "Chocolate Mousse",
    version: 1,
    cuisine: "Dessert",
    cost: 18.4,
    yield: 30,
    allergens: ["Eggs"],
  },
];

export const seedPrepLists: PrepListSeed[] = [
  {
    id: "prep-001",
    name: "Breakfast Prep",
    station: "Cold Line",
    eventId: "event-101",
    assignedTo: "Gia",
    status: "in-progress",
  },
  {
    id: "prep-002",
    name: "Main Service",
    station: "Grill",
    eventId: "event-102",
    assignedTo: "Elias",
    status: "pending",
  },
  {
    id: "prep-003",
    name: "Dessert Table",
    station: "Pastry",
    eventId: "event-101",
    assignedTo: "Rina",
    status: "complete",
  },
];

export const seedEvents: EventSeed[] = [
  {
    id: "event-101",
    name: "Acme Gala",
    date: "2026-01-28",
    location: "Harbor Loft",
    budget: 98_000,
    margin: 0.28,
    status: "planning",
  },
  {
    id: "event-102",
    name: "Field Crew Workshop",
    date: "2026-02-03",
    location: "Central Loft",
    budget: 46_000,
    margin: 0.19,
    status: "on-site",
  },
];

export const seedStaff: StaffSeed[] = [
  {
    id: "staff-001",
    firstName: "Mara",
    lastName: "Hunt",
    role: "Executive Chef",
    station: "Command",
    availability: ["Mon", "Tue", "Thu"],
  },
  {
    id: "staff-002",
    firstName: "Dom",
    lastName: "Larson",
    role: "Logistics",
    station: "Command",
    availability: ["Mon", "Wed", "Fri"],
  },
  {
    id: "staff-003",
    firstName: "Priya",
    lastName: "Singh",
    role: "Line Cook",
    station: "Grill",
    availability: ["Tue", "Wed", "Thu", "Fri"],
  },
];

export const seedClients: ClientSeed[] = [
  {
    id: "client-001",
    name: "Harmonic Events",
    contact: "Kara Sinclair",
    lifetimeValue: 248_000,
    lastEvent: "2026-01-22",
  },
  {
    id: "client-002",
    name: "Field & Feast",
    contact: "Dylan Cruz",
    lifetimeValue: 193_500,
    lastEvent: "2026-01-21",
  },
];

export const seedFinance: FinanceSeed[] = [
  {
    period: "January 2026",
    revenue: 362_000,
    cogs: 88_000,
    labor: 96_000,
    netMargin: 0.214,
  },
  {
    period: "December 2025",
    revenue: 338_000,
    cogs: 91_000,
    labor: 97_000,
    netMargin: 0.189,
  },
];

export const seedKitchenAnalytics = {
  stationThroughput: [
    {
      stationId: "station-grill",
      stationName: "Grill Station",
      load: 84,
      completed: 69,
      avgTime: "6m",
      completedItems: 56,
      pendingItems: 13,
    },
    {
      stationId: "station-sauces",
      stationName: "Sauces",
      load: 72,
      completed: 56,
      avgTime: "8m",
      completedItems: 41,
      pendingItems: 11,
    },
    {
      stationId: "station-plating",
      stationName: "Plating",
      load: 48,
      completed: 44,
      avgTime: "4m",
      completedItems: 34,
      pendingItems: 7,
    },
    {
      stationId: "station-cold",
      stationName: "Cold Line",
      load: 66,
      completed: 51,
      avgTime: "7m",
      completedItems: 48,
      pendingItems: 10,
    },
  ],
  kitchenHealth: {
    prepListsSync: {
      rate: 98,
      completed: 82,
      total: 84,
    },
    allergenWarnings: 2,
    wasteAlerts: 3,
    timeToCompletion: "8m",
  },
  topPerformers: [
    {
      employeeId: "staff-001",
      firstName: "Mara",
      lastName: "Hunt",
      completedTasks: 18,
    },
    {
      employeeId: "staff-003",
      firstName: "Priya",
      lastName: "Singh",
      completedTasks: 16,
    },
    {
      employeeId: "staff-002",
      firstName: "Dom",
      lastName: "Larson",
      completedTasks: 11,
    },
  ],
};
