import { z } from 'zod';

export const ingredientLineSchema = z.object({
  item: z.string().min(1),
  quantity: z.number().positive().optional(),
  unit: z.string().optional(),
  preparation: z.string().optional(),
});

export const menuItemSchema = z.object({
  kind: z.literal('menu_item'),
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.string().optional(),
  servingSize: z.string().optional(),
  dietaryFlags: z.array(z.string()).optional(),
  modifiers: z.array(z.string()).optional(),
  price: z.number().nonnegative().optional(),
  sourceBlockIds: z.array(z.string()),
});

export const recipeSchema = z.object({
  kind: z.literal('recipe'),
  name: z.string().min(1),
  ingredients: z.array(ingredientLineSchema).min(1),
  instructions: z.array(z.string()),
  yield: z.string().optional(),
  prepTime: z.string().optional(),
  sourceBlockIds: z.array(z.string()),
});

export const prepTaskSchema = z.object({
  kind: z.literal('prep_task'),
  task: z.string().min(1),
  assignedTo: z.string().optional(),
  deadline: z.string().optional(),
  relatedItems: z.array(z.string()).optional(),
  sourceBlockIds: z.array(z.string()),
});

export const inventoryNeedSchema = z.object({
  kind: z.literal('inventory_need'),
  item: z.string().min(1),
  quantity: z.number().positive().optional(),
  unit: z.string().optional(),
  category: z.string().optional(),
  urgency: z.enum(['low', 'medium', 'high']).optional(),
  sourceBlockIds: z.array(z.string()),
});

export const staffingAssignmentSchema = z.object({
  kind: z.literal('staffing_assignment'),
  role: z.string().min(1),
  person: z.string().optional(),
  shift: z.string().optional(),
  station: z.string().optional(),
  eventDate: z.string().optional(),
  sourceBlockIds: z.array(z.string()),
});

export const domainEntitySchema = z.discriminatedUnion('kind', [
  menuItemSchema,
  recipeSchema,
  prepTaskSchema,
  inventoryNeedSchema,
  staffingAssignmentSchema,
]);

export type ValidatedMenuItem = z.infer<typeof menuItemSchema>;
export type ValidatedRecipe = z.infer<typeof recipeSchema>;
export type ValidatedPrepTask = z.infer<typeof prepTaskSchema>;
export type ValidatedInventoryNeed = z.infer<typeof inventoryNeedSchema>;
export type ValidatedStaffingAssignment = z.infer<typeof staffingAssignmentSchema>;
export type ValidatedDomainEntity = z.infer<typeof domainEntitySchema>;

export function validateEntity(entity: unknown): {
  success: boolean;
  data?: ValidatedDomainEntity;
  errors?: z.ZodError;
} {
  const result = domainEntitySchema.safeParse(entity);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}
