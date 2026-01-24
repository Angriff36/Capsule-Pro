/**
 * Event Budget API Validation
 */

import { z } from "zod";

// Event Budget Status Enum
export const EventBudgetStatusSchema = z.enum([
  "draft",
  "approved",
  "active",
  "completed",
  "exceeded",
]);

// Budget Line Item Category Enum
export const BudgetCategorySchema = z.enum([
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
export const CreateEventBudgetSchema = z.object({
  eventId: z.string().uuid("Invalid event ID format"),
  status: EventBudgetStatusSchema.optional().default("draft"),
  totalBudgetAmount: z.number().min(0, "Budget amount must be positive"),
  notes: z.string().optional(),
  lineItems: z
    .array(
      z.object({
        category: BudgetCategorySchema,
        name: z.string().min(1, "Line item name is required"),
        description: z.string().optional(),
        budgetedAmount: z.number().min(0, "Budgeted amount must be positive"),
        sortOrder: z.number().int().min(0).optional().default(0),
        notes: z.string().optional(),
      })
    )
    .optional()
    .default([]),
});

// Update Event Budget Schema
export const UpdateEventBudgetSchema = z
  .object({
    status: EventBudgetStatusSchema.optional(),
    totalBudgetAmount: z
      .number()
      .min(0, "Budget amount must be positive")
      .optional(),
    notes: z.string().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });

// Create Budget Line Item Schema
export const CreateBudgetLineItemSchema = z.object({
  category: BudgetCategorySchema,
  name: z.string().min(1, "Line item name is required"),
  description: z.string().optional(),
  budgetedAmount: z.number().min(0, "Budgeted amount must be positive"),
  sortOrder: z.number().int().min(0).optional().default(0),
  notes: z.string().optional(),
});

// Update Budget Line Item Schema
export const UpdateBudgetLineItemSchema = z
  .object({
    category: BudgetCategorySchema.optional(),
    name: z.string().min(1, "Line item name is required").optional(),
    description: z.string().optional(),
    budgetedAmount: z
      .number()
      .min(0, "Budgeted amount must be positive")
      .optional(),
    actualAmount: z
      .number()
      .min(0, "Actual amount must be positive")
      .optional(),
    sortOrder: z.number().int().min(0).optional(),
    notes: z.string().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });

// List Filters Schema
export const EventBudgetListFiltersSchema = z.object({
  eventId: z.string().uuid().optional(),
  status: EventBudgetStatusSchema.optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// Types
export type CreateEventBudgetInput = z.infer<typeof CreateEventBudgetSchema>;
export type UpdateEventBudgetInput = z.infer<typeof UpdateEventBudgetSchema>;
export type CreateBudgetLineItemInput = z.infer<
  typeof CreateBudgetLineItemSchema
>;
export type UpdateBudgetLineItemInput = z.infer<
  typeof UpdateBudgetLineItemSchema
>;
export type EventBudgetListFilters = z.infer<
  typeof EventBudgetListFiltersSchema
>;

/**
 * Parse and validate create event budget request
 */
export function validateCreateEventBudget(
  data: unknown
): CreateEventBudgetInput {
  return CreateEventBudgetSchema.parse(data);
}

/**
 * Parse and validate update event budget request
 */
export function validateUpdateEventBudget(
  data: unknown
): UpdateEventBudgetInput {
  return UpdateEventBudgetSchema.parse(data);
}

/**
 * Parse and validate create budget line item request
 */
export function validateCreateBudgetLineItem(
  data: unknown
): CreateBudgetLineItemInput {
  return CreateBudgetLineItemSchema.parse(data);
}

/**
 * Parse and validate update budget line item request
 */
export function validateUpdateBudgetLineItem(
  data: unknown
): UpdateBudgetLineItemInput {
  return UpdateBudgetLineItemSchema.parse(data);
}

/**
 * Parse list filters from search params
 */
export function parseEventBudgetListFilters(
  searchParams: URLSearchParams
): EventBudgetListFilters {
  const filters = Object.fromEntries(searchParams.entries());
  return EventBudgetListFiltersSchema.parse(filters);
}
