/**
 * Shared Dish.update full-body construction helpers.
 *
 * Kept outside `"use server"` modules — Next.js requires every export from a
 * Server Actions file to be an async function, and these are pure/data helpers.
 */

import { database } from "@repo/database";

export type DishUpdateFields = {
  allergens: string[] | null;
  category: string | null;
  cost_per_person: number | null;
  default_container_id: string | null;
  description: string | null;
  dietary_tags: string[] | null;
  is_active: boolean;
  name: string;
  portion_size_description: string | null;
  presentation_image_url: string | null;
  service_style: string | null;
};

export const loadDishUpdateFields = async (tenantId: string, dishId: string) => {
  const [row] = await database.$queryRaw<DishUpdateFields[]>`
    SELECT name, description, category, service_style, default_container_id,
           presentation_image_url, portion_size_description, dietary_tags,
           allergens, cost_per_person, is_active
    FROM tenant_kitchen.dishes
    WHERE tenant_id = ${tenantId} AND id = ${dishId}::uuid AND deleted_at IS NULL
    LIMIT 1
  `;
  return row;
};

/** Full Dish.update payload from a current row, overlaying any changed fields. */
export const dishUpdateBody = (
  current: DishUpdateFields,
  overrides: Partial<{
    name: string;
    description: string | null;
    category: string | null;
    serviceStyle: string | null;
    portionSizeDescription: string | null;
    dietaryTags: string[];
    allergens: string[];
  }> = {}
) => ({
  name: overrides.name ?? current.name,
  description: overrides.description ?? current.description,
  category: overrides.category ?? current.category,
  serviceStyle: overrides.serviceStyle ?? current.service_style,
  defaultContainerId: current.default_container_id,
  presentationImageUrl: current.presentation_image_url,
  portionSizeDescription:
    overrides.portionSizeDescription ?? current.portion_size_description,
  dietaryTags: overrides.dietaryTags ?? current.dietary_tags ?? [],
  allergens: overrides.allergens ?? current.allergens ?? [],
});
