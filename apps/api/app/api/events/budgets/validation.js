/**
 * Event Budget API Validation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventBudgetListFiltersSchema =
  exports.UpdateBudgetLineItemSchema =
  exports.CreateBudgetLineItemSchema =
  exports.UpdateEventBudgetSchema =
  exports.CreateEventBudgetSchema =
  exports.BudgetCategorySchema =
  exports.EventBudgetStatusSchema =
    void 0;
exports.validateCreateEventBudget = validateCreateEventBudget;
exports.validateUpdateEventBudget = validateUpdateEventBudget;
exports.validateCreateBudgetLineItem = validateCreateBudgetLineItem;
exports.validateUpdateBudgetLineItem = validateUpdateBudgetLineItem;
exports.parseEventBudgetListFilters = parseEventBudgetListFilters;
const zod_1 = require("zod");
// Event Budget Status Enum
exports.EventBudgetStatusSchema = zod_1.z.enum([
  "draft",
  "approved",
  "active",
  "completed",
  "exceeded",
]);
// Budget Line Item Category Enum
exports.BudgetCategorySchema = zod_1.z.enum([
  "food",
  "labor",
  "equipment",
  "rental",
  "transportation",
  "beverage",
  "decor",
  "entertainment",
  "service",
  "other",
]);
// Create Event Budget Schema
exports.CreateEventBudgetSchema = zod_1.z.object({
  eventId: zod_1.z.string().uuid("Invalid event ID format"),
  status: exports.EventBudgetStatusSchema.optional().default("draft"),
  totalBudgetAmount: zod_1.z.number().min(0, "Budget amount must be positive"),
  notes: zod_1.z.string().optional(),
  lineItems: zod_1.z
    .array(
      zod_1.z.object({
        category: exports.BudgetCategorySchema,
        name: zod_1.z.string().min(1, "Line item name is required"),
        description: zod_1.z.string().optional(),
        budgetedAmount: zod_1.z
          .number()
          .min(0, "Budgeted amount must be positive"),
        sortOrder: zod_1.z.number().int().min(0).optional().default(0),
        notes: zod_1.z.string().optional(),
      })
    )
    .optional()
    .default([]),
});
// Update Event Budget Schema
exports.UpdateEventBudgetSchema = zod_1.z
  .object({
    status: exports.EventBudgetStatusSchema.optional(),
    totalBudgetAmount: zod_1.z
      .number()
      .min(0, "Budget amount must be positive")
      .optional(),
    notes: zod_1.z.string().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });
// Create Budget Line Item Schema
exports.CreateBudgetLineItemSchema = zod_1.z.object({
  category: exports.BudgetCategorySchema,
  name: zod_1.z.string().min(1, "Line item name is required"),
  description: zod_1.z.string().optional(),
  budgetedAmount: zod_1.z.number().min(0, "Budgeted amount must be positive"),
  sortOrder: zod_1.z.number().int().min(0).optional().default(0),
  notes: zod_1.z.string().optional(),
});
// Update Budget Line Item Schema
exports.UpdateBudgetLineItemSchema = zod_1.z
  .object({
    category: exports.BudgetCategorySchema.optional(),
    name: zod_1.z.string().min(1, "Line item name is required").optional(),
    description: zod_1.z.string().optional(),
    budgetedAmount: zod_1.z
      .number()
      .min(0, "Budgeted amount must be positive")
      .optional(),
    actualAmount: zod_1.z
      .number()
      .min(0, "Actual amount must be positive")
      .optional(),
    sortOrder: zod_1.z.number().int().min(0).optional(),
    notes: zod_1.z.string().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });
// List Filters Schema
exports.EventBudgetListFiltersSchema = zod_1.z.object({
  eventId: zod_1.z.string().uuid().optional(),
  status: exports.EventBudgetStatusSchema.optional(),
  search: zod_1.z.string().optional(),
  page: zod_1.z.coerce.number().int().min(1).default(1),
  limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
});
/**
 * Parse and validate create event budget request
 */
function validateCreateEventBudget(data) {
  return exports.CreateEventBudgetSchema.parse(data);
}
/**
 * Parse and validate update event budget request
 */
function validateUpdateEventBudget(data) {
  return exports.UpdateEventBudgetSchema.parse(data);
}
/**
 * Parse and validate create budget line item request
 */
function validateCreateBudgetLineItem(data) {
  return exports.CreateBudgetLineItemSchema.parse(data);
}
/**
 * Parse and validate update budget line item request
 */
function validateUpdateBudgetLineItem(data) {
  return exports.UpdateBudgetLineItemSchema.parse(data);
}
/**
 * Parse list filters from search params
 */
function parseEventBudgetListFilters(searchParams) {
  const filters = Object.fromEntries(searchParams.entries());
  return exports.EventBudgetListFiltersSchema.parse(filters);
}
