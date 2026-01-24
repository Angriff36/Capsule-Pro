/**
 * Stock Levels Validation
 *
 * Validation functions for stock levels API requests.
 */
import {
  type AdjustmentReason,
  type CreateAdjustmentRequest,
  type StockReorderStatus,
  type TransactionType,
} from "./types";
/**
 * Validates that a value is a valid transaction type
 */
export declare function validateTransactionType(
  value: unknown
): asserts value is TransactionType;
/**
 * Validates that a value is a valid adjustment reason
 */
export declare function validateAdjustmentReason(
  value: unknown
): asserts value is AdjustmentReason;
/**
 * Validates that a value is a valid stock reorder status
 */
export declare function validateStockReorderStatus(
  value: unknown
): asserts value is StockReorderStatus;
/**
 * Validates that a value is a non-negative number
 */
export declare function validateNonNegativeNumber(
  value: unknown,
  fieldName: string
): asserts value is number;
/**
 * Validates that a value is a positive number
 */
export declare function validatePositiveNumber(
  value: unknown,
  fieldName: string
): asserts value is number;
/**
 * Validates that a string is not empty
 */
export declare function validateNonEmptyString(
  value: unknown,
  fieldName: string
): asserts value is string;
/**
 * Validates optional string field length
 */
export declare function validateOptionalStringLength(
  value: unknown,
  fieldName: string,
  maxLength: number
): void;
/**
 * Validates UUID format
 */
export declare function validateUUID(
  value: unknown,
  fieldName: string
): asserts value is string;
/**
 * Validates adjustment type (increase or decrease)
 */
export declare function validateAdjustmentType(
  value: unknown
): asserts value is "increase" | "decrease";
/**
 * Validates a create adjustment request
 */
export declare function validateCreateAdjustmentRequest(
  request: unknown
): asserts request is CreateAdjustmentRequest;
/**
 * Validates stock level filters
 */
export declare function validateStockLevelFilters(
  filters: unknown
): asserts filters is {
  search?: string;
  category?: string;
  locationId?: string;
  reorderStatus?: StockReorderStatus;
  lowStock?: boolean;
  outOfStock?: boolean;
  page?: number;
  limit?: number;
};
/**
 * Validates transaction filters
 */
export declare function validateTransactionFilters(filters: unknown): void;
//# sourceMappingURL=validation.d.ts.map
