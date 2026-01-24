/**
 * Event Budget API Validation
 */
import { z } from "zod";
export declare const EventBudgetStatusSchema: z.ZodEnum<{
  draft: "draft";
  completed: "completed";
  active: "active";
  approved: "approved";
  exceeded: "exceeded";
}>;
export declare const BudgetCategorySchema: z.ZodEnum<{
  other: "other";
  food: "food";
  labor: "labor";
  equipment: "equipment";
  rental: "rental";
  transportation: "transportation";
  beverage: "beverage";
  decor: "decor";
  entertainment: "entertainment";
  service: "service";
}>;
export declare const CreateEventBudgetSchema: z.ZodObject<
  {
    eventId: z.ZodString;
    status: z.ZodDefault<
      z.ZodOptional<
        z.ZodEnum<{
          draft: "draft";
          completed: "completed";
          active: "active";
          approved: "approved";
          exceeded: "exceeded";
        }>
      >
    >;
    totalBudgetAmount: z.ZodNumber;
    notes: z.ZodOptional<z.ZodString>;
    lineItems: z.ZodDefault<
      z.ZodOptional<
        z.ZodArray<
          z.ZodObject<
            {
              category: z.ZodEnum<{
                other: "other";
                food: "food";
                labor: "labor";
                equipment: "equipment";
                rental: "rental";
                transportation: "transportation";
                beverage: "beverage";
                decor: "decor";
                entertainment: "entertainment";
                service: "service";
              }>;
              name: z.ZodString;
              description: z.ZodOptional<z.ZodString>;
              budgetedAmount: z.ZodNumber;
              sortOrder: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
              notes: z.ZodOptional<z.ZodString>;
            },
            z.core.$strip
          >
        >
      >
    >;
  },
  z.core.$strip
>;
export declare const UpdateEventBudgetSchema: z.ZodObject<
  {
    status: z.ZodOptional<
      z.ZodEnum<{
        draft: "draft";
        completed: "completed";
        active: "active";
        approved: "approved";
        exceeded: "exceeded";
      }>
    >;
    totalBudgetAmount: z.ZodOptional<z.ZodNumber>;
    notes: z.ZodOptional<z.ZodString>;
  },
  z.core.$strip
>;
export declare const CreateBudgetLineItemSchema: z.ZodObject<
  {
    category: z.ZodEnum<{
      other: "other";
      food: "food";
      labor: "labor";
      equipment: "equipment";
      rental: "rental";
      transportation: "transportation";
      beverage: "beverage";
      decor: "decor";
      entertainment: "entertainment";
      service: "service";
    }>;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    budgetedAmount: z.ZodNumber;
    sortOrder: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    notes: z.ZodOptional<z.ZodString>;
  },
  z.core.$strip
>;
export declare const UpdateBudgetLineItemSchema: z.ZodObject<
  {
    category: z.ZodOptional<
      z.ZodEnum<{
        other: "other";
        food: "food";
        labor: "labor";
        equipment: "equipment";
        rental: "rental";
        transportation: "transportation";
        beverage: "beverage";
        decor: "decor";
        entertainment: "entertainment";
        service: "service";
      }>
    >;
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    budgetedAmount: z.ZodOptional<z.ZodNumber>;
    actualAmount: z.ZodOptional<z.ZodNumber>;
    sortOrder: z.ZodOptional<z.ZodNumber>;
    notes: z.ZodOptional<z.ZodString>;
  },
  z.core.$strip
>;
export declare const EventBudgetListFiltersSchema: z.ZodObject<
  {
    eventId: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<
      z.ZodEnum<{
        draft: "draft";
        completed: "completed";
        active: "active";
        approved: "approved";
        exceeded: "exceeded";
      }>
    >;
    search: z.ZodOptional<z.ZodString>;
    page: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    limit: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
  },
  z.core.$strip
>;
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
export declare function validateCreateEventBudget(
  data: unknown
): CreateEventBudgetInput;
/**
 * Parse and validate update event budget request
 */
export declare function validateUpdateEventBudget(
  data: unknown
): UpdateEventBudgetInput;
/**
 * Parse and validate create budget line item request
 */
export declare function validateCreateBudgetLineItem(
  data: unknown
): CreateBudgetLineItemInput;
/**
 * Parse and validate update budget line item request
 */
export declare function validateUpdateBudgetLineItem(
  data: unknown
): UpdateBudgetLineItemInput;
/**
 * Parse list filters from search params
 */
export declare function parseEventBudgetListFilters(
  searchParams: URLSearchParams
): EventBudgetListFilters;
//# sourceMappingURL=validation.d.ts.map
