/**
 * Mock for @repo/database package
 *
 * This mock prevents loading the actual database module which requires
 * server-only environment and Prisma client generation.
 */

import { vi } from "vitest";

type PrismaSqlFn = (
  strings: TemplateStringsArray,
  ...values: unknown[]
) => {
  strings: TemplateStringsArray;
  values: unknown[];
  readonly sql: string;
};

type PrismaJoinFn = (parts: unknown[], separator: unknown) => string;

// Mock Prisma sql tag function and all exports from generated/client
const sqlImpl: PrismaSqlFn = vi.fn((strings, ...values) => ({
  strings,
  values,
  get sql() {
    return strings.reduce(
      (acc: string, str: string, i: number) =>
        acc + str + (values[i] !== undefined ? String(values[i]) : ""),
      ""
    );
  },
}));

const joinImpl: PrismaJoinFn = vi.fn((parts, separator) => {
  return parts.filter(Boolean).join(separator);
});

// Minimal Decimal stand-in for routes that use `new Prisma.Decimal(value)`
class MockDecimal {
  value: string;
  constructor(v: string | number) {
    this.value = String(v);
  }
  toString() {
    return this.value;
  }
  gt(other: unknown) {
    return Number(this.value) > Number(other);
  }
  lt(other: unknown) {
    return Number(this.value) < Number(other);
  }
}

export const Prisma: {
  sql: PrismaSqlFn;
  join: PrismaJoinFn;
  empty: {};
  PrismaClient: unknown;
  Decimal: typeof MockDecimal;
} = {
  sql: sqlImpl,
  join: joinImpl,
  empty: {},
  // Add other commonly used Prisma types/mocks
  PrismaClient: vi.fn(),
  Decimal: MockDecimal as unknown as typeof MockDecimal,
};

// Re-export all Prisma types (you can add more as needed)
export const PrismaClient: unknown = vi.fn();

// Prisma enums used as VALUES by routes (Object.values(...) etc.). Keep in
// sync with the enum blocks in packages/database/prisma/schema/*.prisma —
// routes importing an enum missing here crash the whole route module in tests.
export const KitchenTaskStatus = {
  pending: "pending",
  in_progress: "in_progress",
  done: "done",
  cancelled: "cancelled",
} as const;

export const EntityType = {
  event: "event",
  client: "client",
  prep_task: "prep_task",
  kitchen_task: "kitchen_task",
  employee: "employee",
  inventory_item: "inventory_item",
  recipe: "recipe",
  dish: "dish",
  proposal: "proposal",
  shipment: "shipment",
  note: "note",
  risk: "risk",
  financial_projection: "financial_projection",
} as const;

export const webhook_event_type = {
  created: "created",
  updated: "updated",
  deleted: "deleted",
} as const;

// Helper to create a mock Prisma model
function createMockModel() {
  return {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    createMany: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
    aggregate: vi.fn(),
    groupBy: vi.fn(),
  };
}

// Auto-created delegate for models NOT explicitly listed below. Unlike the
// explicit delegates (which default to `undefined` so each test sets its own
// return), these get graceful defaults: a route that touches a model the test
// didn't stub returns empty results instead of crashing with "not a function".
// vi.fn(impl) defaults survive `restoreMocks: true` (verified), and tests can
// still override via vi.mocked(...).mockResolvedValue(...).
function createAutoMockModel() {
  return {
    findMany: vi.fn(async () => []),
    findUnique: vi.fn(async () => null),
    findFirst: vi.fn(async () => null),
    create: vi.fn(async () => ({})),
    createMany: vi.fn(async () => ({ count: 0 })),
    update: vi.fn(async () => ({})),
    updateMany: vi.fn(async () => ({ count: 0 })),
    upsert: vi.fn(async () => ({})),
    delete: vi.fn(async () => ({})),
    deleteMany: vi.fn(async () => ({ count: 0 })),
    count: vi.fn(async () => 0),
    aggregate: vi.fn(async () => ({})),
    groupBy: vi.fn(async () => []),
  };
}

// Mock database instance
const databaseTarget: Record<string, unknown> = {
  $queryRaw: vi.fn(),
  $executeRaw: vi.fn(),
  $transaction: vi.fn(),
  $connect: vi.fn(),
  $disconnect: vi.fn(),
  $on: vi.fn(),
  $use: vi.fn(),
  // Add Prisma models
  user: createMockModel(),
  alertsConfig: createMockModel(),
  prepMethod: createMockModel(),
  container: createMockModel(),
  wasteEntry: createMockModel(),
  workflow: createMockModel(),
  adminChatParticipant: createMockModel(),
  adminTask: createMockModel(),
  apiKey: createMockModel(),
  battleBoard: createMockModel(),
  budgetAlert: createMockModel(),
  budgetLineItem: createMockModel(),
  bulkOrderRule: createMockModel(),
  cateringOrder: createMockModel(),
  chartOfAccount: createMockModel(),
  client: createMockModel(),
  prepTask: createMockModel(),
  outboxEvent: createMockModel(),
  menu: createMockModel(),
  menuDish: createMockModel(),
  recipe: createMockModel(),
  recipeVersion: createMockModel(),
  ingredient: createMockModel(),
  recipeIngredient: createMockModel(),
  dish: createMockModel(),
  prepList: createMockModel(),
  prepListItem: createMockModel(),
  inventoryItem: createMockModel(),
  station: createMockModel(),
  units: createMockModel(),
  recipe_steps: createMockModel(),
  // Inventory forecasting models
  inventoryForecast: createMockModel(),
  reorderSuggestion: createMockModel(),
  inventoryTransaction: createMockModel(),
  // Inventory transfer models (5-state machine: pending → approved → in_transit → completed, or cancelled)
  inventoryTransfer: createMockModel(),
  inventoryTransferItem: createMockModel(),
  // Event model for forecasting tests
  event: createMockModel(),
  // Event followup model
  eventFollowup: createMockModel(),
  // Schedule models
  schedule: createMockModel(),
  scheduleShift: createMockModel(),
  // Shipment models
  shipment: createMockModel(),
  shipmentItem: createMockModel(),
  // Payroll models
  payroll_periods: createMockModel(),
  payroll_runs: createMockModel(),
  employeeDeduction: createMockModel(),
  employeeBankAccount: createMockModel(),
  payrollApprovalHistory: createMockModel(),
  taxConfiguration: createMockModel(),
  bankAccount: createMockModel(),
  // Communications models
  email_templates: createMockModel(),
  emailWorkflow: createMockModel(),
  sms_automation_rules: createMockModel(),
  // Logistics models
  driver: createMockModel(),
  vehicle: createMockModel(),
  deliveryRoute: createMockModel(),
  // Activity feed model
  activityFeed: createMockModel(),
  reactionLog: createMockModel(),
  // Allergen warning model
  allergenWarning: createMockModel(),
  // Accounting models
  laborBudget: createMockModel(),
  // Search models
  clientContact: createMockModel(),
  venue: createMockModel(),
  knowledgeBaseEntry: createMockModel(),
  // Document versioning models
  documentVersion: createMockModel(),
  // Kitchen task model
  kitchenTask: createMockModel(),
  kitchenTaskClaim: createMockModel(),
  // Workforce optimization model
  workforceOptimization: createMockModel(),
  // Supplier / vendor catalog models (webhook)
  inventorySupplier: createMockModel(),
  vendorCatalog: createMockModel(),
  // Procurement models
  purchaseOrder: createMockModel(),
  purchaseOrderItem: createMockModel(),
  vendorContact: createMockModel(),
  vendorRating: createMockModel(),
  // Contract & proposal models (public endpoints)
  lead: createMockModel(),
  eventContract: createMockModel(),
  contractSignature: createMockModel(),
  proposal: createMockModel(),
  proposalLineItem: createMockModel(),
  account: createMockModel(),
  // Accounting command models (PATCH dispatchers)
  paymentMethod: createMockModel(),
  invoice: createMockModel(),
  payment: createMockModel(),
  revenueRecognitionSchedule: createMockModel(),
  revenueRecognitionLine: createMockModel(),
  collectionCase: createMockModel(),
  collectionAction: createMockModel(),
  collectionPaymentPlan: createMockModel(),
  // Equipment & maintenance models
  equipment: createMockModel(),
  workOrder: createMockModel(),
  // Notification model
  notification: createMockModel(),
  // Training models
  trainingAssignment: createMockModel(),
  trainingModule: createMockModel(),
  // Email template model (camelCase accessor)
  emailTemplate: createMockModel(),
  // Payroll models (camelCase accessors)
  payrollPeriod: createMockModel(),
  payrollRun: createMockModel(),
  // Time tracking models
  timeEntry: createMockModel(),
  employeeTimeOffRequest: createMockModel(),
  employeeAvailability: createMockModel(),
  employeeCertification: createMockModel(),
  // Role policy model
  rolePolicy: createMockModel(),
  // Staff auto-assignment models
  employee_seniority: createMockModel(),
  employee_skills: createMockModel(),
  skills: createMockModel(),
  location: createMockModel(),
  // Budget models for auto-assignment budget checks
  budget: createMockModel(),
  eventBudget: createMockModel(),
  // Procurement requisition & vendor contract models
  purchaseRequisition: createMockModel(),
  purchaseRequisitionItem: createMockModel(),
  vendorContract: createMockModel(),
};

// Lazily auto-create a delegate for any model accessed but not explicitly
// listed above. This keeps the mock complete as routes reference new models
// without every test having to enumerate them. The delegate is cached on the
// target so repeated access returns the SAME object — vi.mocked() spies set by
// a test persist. Assignment (`(database as any).x = {...}`) writes through to
// the target unchanged. `restoreMocks`/`clearMocks` between tests still reset
// call history on the cached delegates.
export const database: Record<string, unknown> = new Proxy(databaseTarget, {
  get(target, prop, receiver) {
    if (prop in target || typeof prop === "symbol") {
      return Reflect.get(target, prop, receiver);
    }
    const delegate = createAutoMockModel();
    target[prop as string] = delegate;
    return delegate;
  },
});

databaseTarget.$transaction = vi.fn((fn: (tx: unknown) => unknown) =>
  fn(database)
);

// Mock analyticsDatabase — in the real package the analytics (read-replica)
// client falls back to the primary connection, so it shares the same models.
// Pointing it at `database` keeps a single mockable surface (mirrors
// packages/database/standalone.ts where `analyticsDatabase = database`).
export const analyticsDatabase: Record<string, unknown> = database;

// Mock tenantDatabase function
export const tenantDatabase = vi.fn(() => database);
