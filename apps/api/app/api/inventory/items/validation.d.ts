/**
 * Inventory Item Validation Functions
 */
import type {
  CreateInventoryItemRequest,
  FSAStatus,
  ItemCategory,
  UpdateInventoryItemRequest,
} from "./types";
/**
 * Validate FSA status
 */
export declare function validateFSAStatus(
  value: unknown
): asserts value is FSAStatus;
/**
 * Validate item category
 */
export declare function validateItemCategory(
  value: unknown
): asserts value is ItemCategory;
/**
 * Validate numeric fields are non-negative
 */
export declare function validateNonNegativeNumber(
  value: unknown,
  fieldName: string
): asserts value is number;
/**
 * Validate create inventory item request
 */
export declare function validateCreateInventoryItemRequest(
  data: unknown
): asserts data is CreateInventoryItemRequest;
/**
 * Validate update inventory item request
 */
export declare function validateUpdateInventoryItemRequest(
  data: unknown
): asserts data is UpdateInventoryItemRequest;
//# sourceMappingURL=validation.d.ts.map
