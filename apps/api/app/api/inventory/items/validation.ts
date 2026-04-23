/**
 * Inventory Item Validation Functions
 */

import { InvariantError } from "@/app/lib/invariant";
import type {
  CreateInventoryItemRequest,
  FSAStatus,
  ItemCategory,
  UnitOfMeasure,
  UpdateInventoryItemRequest,
} from "./types";
import { FSA_STATUSES, ITEM_CATEGORIES, UNITS_OF_MEASURE } from "./types";

/**
 * Validate FSA status
 */
export function validateFSAStatus(value: unknown): asserts value is FSAStatus {
  if (!value) {
    return; // Optional field
  }

  const status = value as string;
  if (!FSA_STATUSES.includes(status as FSAStatus)) {
    throw new InvariantError(
      `Invalid FSA status: ${status}. Must be one of: ${FSA_STATUSES.join(", ")}`
    );
  }
}

/**
 * Validate item category
 */
export function validateItemCategory(
  value: unknown
): asserts value is ItemCategory {
  if (!value) {
    throw new InvariantError("Category is required");
  }

  const category = value as string;
  if (!ITEM_CATEGORIES.includes(category as ItemCategory)) {
    throw new InvariantError(
      `Invalid category: ${category}. Must be one of: ${ITEM_CATEGORIES.join(", ")}`
    );
  }
}

/**
 * Validate numeric fields are non-negative
 */
export function validateNonNegativeNumber(
  value: unknown,
  fieldName: string
): asserts value is number {
  if (value === undefined || value === null) {
    return;
  }

  const num = Number(value);
  if (Number.isNaN(num) || num < 0) {
    throw new InvariantError(`${fieldName} must be a non-negative number`);
  }
}

/**
 * Validate unit of measure against known units
 */
export function validateUnitOfMeasure(
  value: unknown
): asserts value is UnitOfMeasure {
  if (!value) {
    return; // Optional — defaults to "each"
  }

  const unit = value as string;
  if (!UNITS_OF_MEASURE.includes(unit as UnitOfMeasure)) {
    throw new InvariantError(
      `Invalid unit of measure: ${unit}. Must be one of: ${UNITS_OF_MEASURE.join(", ")}`
    );
  }
}

/**
 * Validate create inventory item request
 */
export function validateCreateInventoryItemRequest(
  data: unknown
): asserts data is CreateInventoryItemRequest {
  if (!data || typeof data !== "object") {
    throw new InvariantError("Request body is required");
  }

  const body = data as CreateInventoryItemRequest;

  // Required fields
  if (!body.item_number || typeof body.item_number !== "string") {
    throw new InvariantError("item_number is required and must be a string");
  }

  if (!body.name || typeof body.name !== "string") {
    throw new InvariantError("name is required and must be a string");
  }

  // Validate category
  if (body.category) {
    validateItemCategory(body.category);
  }

  // Validate numeric fields
  validateNonNegativeNumber(body.unit_cost, "unit_cost");
  validateNonNegativeNumber(body.quantity_on_hand, "quantity_on_hand");
  validateNonNegativeNumber(body.reorder_level, "reorder_level");
  validateNonNegativeNumber(body.par_level, "par_level");

  // Validate unit of measure
  if (body.unit_of_measure) {
    validateUnitOfMeasure(body.unit_of_measure);
  }

  // Validate FSA status
  if (body.fsa_status) {
    validateFSAStatus(body.fsa_status);
  }

  // Validate tags is array
  if (body.tags !== undefined && !Array.isArray(body.tags)) {
    throw new InvariantError("tags must be an array");
  }

  // Validate boolean fields
  const booleanFields = [
    "fsa_temp_logged",
    "fsa_allergen_info",
    "fsa_traceable",
  ] as const;
  for (const field of booleanFields) {
    if (body[field] !== undefined && typeof body[field] !== "boolean") {
      throw new InvariantError(`${field} must be a boolean`);
    }
  }
}

/**
 * Validate update inventory item request
 */
export function validateUpdateInventoryItemRequest(
  data: unknown
): asserts data is UpdateInventoryItemRequest {
  if (!data || typeof data !== "object") {
    throw new InvariantError("Request body is required");
  }

  const body = data as UpdateInventoryItemRequest;

  // At least one field must be provided
  if (Object.keys(body).length === 0) {
    throw new InvariantError("At least one field must be provided for update");
  }

  // Validate category if provided
  if (body.category) {
    validateItemCategory(body.category);
  }

  // Validate numeric fields
  validateNonNegativeNumber(body.unit_cost, "unit_cost");
  validateNonNegativeNumber(body.quantity_on_hand, "quantity_on_hand");
  validateNonNegativeNumber(body.reorder_level, "reorder_level");
  validateNonNegativeNumber(body.par_level, "par_level");

  // Validate unit of measure if provided
  if (body.unit_of_measure) {
    validateUnitOfMeasure(body.unit_of_measure);
  }

  // Validate FSA status if provided
  if (body.fsa_status) {
    validateFSAStatus(body.fsa_status);
  }

  // Validate tags is array if provided
  if (body.tags !== undefined && !Array.isArray(body.tags)) {
    throw new InvariantError("tags must be an array");
  }

  // Validate boolean fields
  const booleanFields = [
    "fsa_temp_logged",
    "fsa_allergen_info",
    "fsa_traceable",
  ] as const;
  for (const field of booleanFields) {
    if (body[field] !== undefined && typeof body[field] !== "boolean") {
      throw new InvariantError(`${field} must be a boolean`);
    }
  }
}
