/**
 * Stock Levels Validation
 *
 * Validation functions for stock levels API requests.
 */

import { invariant } from "@/app/lib/invariant";
import {
  ADJUSTMENT_REASONS,
  type AdjustmentReason,
  type CreateAdjustmentRequest,
  STOCK_REORDER_STATUSES,
  type StockReorderStatus,
  TRANSACTION_TYPES,
  type TransactionType,
} from "./types";

// ============================================================================
// Validation Constants
// ============================================================================

const MAX_QUANTITY = 999_999_999.999;
const MAX_NOTES_LENGTH = 1000;
const MAX_REFERENCE_LENGTH = 255;

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validates that a value is a valid transaction type
 */
export function validateTransactionType(
  value: unknown
): asserts value is TransactionType {
  invariant(
    typeof value === "string",
    `transactionType must be a string, received ${typeof value}`
  );
  invariant(
    TRANSACTION_TYPES.includes(value as TransactionType),
    `transactionType must be one of ${TRANSACTION_TYPES.join(", ")}, received "${value}"`
  );
}

/**
 * Validates that a value is a valid adjustment reason
 */
export function validateAdjustmentReason(
  value: unknown
): asserts value is AdjustmentReason {
  invariant(
    typeof value === "string",
    `reason must be a string, received ${typeof value}`
  );
  invariant(
    ADJUSTMENT_REASONS.includes(value as AdjustmentReason),
    `reason must be one of ${ADJUSTMENT_REASONS.join(", ")}, received "${value}"`
  );
}

/**
 * Validates that a value is a valid stock reorder status
 */
export function validateStockReorderStatus(
  value: unknown
): asserts value is StockReorderStatus {
  invariant(
    typeof value === "string",
    `reorderStatus must be a string, received ${typeof value}`
  );
  invariant(
    STOCK_REORDER_STATUSES.includes(value as StockReorderStatus),
    `reorderStatus must be one of ${STOCK_REORDER_STATUSES.join(", ")}, received "${value}"`
  );
}

/**
 * Validates that a value is a non-negative number
 */
export function validateNonNegativeNumber(
  value: unknown,
  fieldName: string
): asserts value is number {
  invariant(
    typeof value === "number",
    `${fieldName} must be a number, received ${typeof value}`
  );
  invariant(value >= 0, `${fieldName} must be non-negative, received ${value}`);
  invariant(
    value <= MAX_QUANTITY,
    `${fieldName} must not exceed ${MAX_QUANTITY}, received ${value}`
  );
}

/**
 * Validates that a value is a positive number
 */
export function validatePositiveNumber(
  value: unknown,
  fieldName: string
): asserts value is number {
  invariant(
    typeof value === "number",
    `${fieldName} must be a number, received ${typeof value}`
  );
  invariant(value > 0, `${fieldName} must be positive, received ${value}`);
}

/**
 * Validates that a string is not empty
 */
export function validateNonEmptyString(
  value: unknown,
  fieldName: string
): asserts value is string {
  invariant(
    typeof value === "string",
    `${fieldName} must be a string, received ${typeof value}`
  );
  invariant(value.trim().length > 0, `${fieldName} must not be empty`);
}

/**
 * Validates optional string field length
 */
export function validateOptionalStringLength(
  value: unknown,
  fieldName: string,
  maxLength: number
): void {
  if (value === null || value === undefined) {
    return;
  }
  invariant(
    typeof value === "string",
    `${fieldName} must be a string or null, received ${typeof value}`
  );
  invariant(
    value.length <= maxLength,
    `${fieldName} must not exceed ${maxLength} characters, received ${value.length}`
  );
}

/**
 * Validates UUID format
 */
export function validateUUID(
  value: unknown,
  fieldName: string
): asserts value is string {
  invariant(
    typeof value === "string",
    `${fieldName} must be a string, received ${typeof value}`
  );
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  invariant(
    uuidRegex.test(value),
    `${fieldName} must be a valid UUID, received "${value}"`
  );
}

/**
 * Validates adjustment type (increase or decrease)
 */
export function validateAdjustmentType(
  value: unknown
): asserts value is "increase" | "decrease" {
  invariant(
    typeof value === "string",
    `adjustmentType must be a string, received ${typeof value}`
  );
  invariant(
    value === "increase" || value === "decrease",
    `adjustmentType must be either "increase" or "decrease", received "${value}"`
  );
}

// ============================================================================
// Request Validation Functions
// ============================================================================

/**
 * Validates a create adjustment request
 */
export function validateCreateAdjustmentRequest(
  request: unknown
): asserts request is CreateAdjustmentRequest {
  invariant(
    typeof request === "object" && request !== null,
    "request must be an object"
  );

  const {
    inventoryItemId,
    storageLocationId,
    quantity,
    adjustmentType,
    reason,
    notes,
    referenceId,
  } = request as Record<string, unknown>;

  // inventoryItemId is required
  validateUUID(inventoryItemId, "inventoryItemId");

  // storageLocationId is optional but must be UUID if provided
  if (storageLocationId !== null && storageLocationId !== undefined) {
    validateUUID(storageLocationId, "storageLocationId");
  }

  // quantity is required and must be positive
  validatePositiveNumber(quantity, "quantity");

  // adjustmentType is required
  validateAdjustmentType(adjustmentType);

  // reason is required
  validateAdjustmentReason(reason);

  // notes is optional
  validateOptionalStringLength(notes, "notes", MAX_NOTES_LENGTH);

  // referenceId is optional
  validateOptionalStringLength(
    referenceId,
    "referenceId",
    MAX_REFERENCE_LENGTH
  );
}

/**
 * Validates stock level filters
 */
export function validateStockLevelFilters(
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
} {
  if (typeof filters !== "object" || filters === null) {
    return; // Empty filters are valid
  }

  const f = filters as Record<string, unknown>;

  // Validate search if provided
  if (f.search !== undefined) {
    invariant(
      typeof f.search === "string",
      `search must be a string, received ${typeof f.search}`
    );
  }

  // Validate category if provided
  if (f.category !== undefined) {
    validateNonEmptyString(f.category, "category");
  }

  // Validate locationId if provided
  if (f.locationId !== undefined) {
    validateUUID(f.locationId, "locationId");
  }

  // Validate reorderStatus if provided
  if (f.reorderStatus !== undefined) {
    validateStockReorderStatus(f.reorderStatus);
  }

  // Validate lowStock if provided
  if (f.lowStock !== undefined) {
    invariant(
      typeof f.lowStock === "boolean",
      `lowStock must be a boolean, received ${typeof f.lowStock}`
    );
  }

  // Validate outOfStock if provided
  if (f.outOfStock !== undefined) {
    invariant(
      typeof f.outOfStock === "boolean",
      `outOfStock must be a boolean, received ${typeof f.outOfStock}`
    );
  }

  // Validate page if provided
  if (f.page !== undefined) {
    validatePositiveNumber(f.page, "page");
  }

  // Validate limit if provided
  if (f.limit !== undefined) {
    validatePositiveNumber(f.limit, "limit");
  }
}

/**
 * Validates transaction filters
 */
export function validateTransactionFilters(filters: unknown): void {
  if (typeof filters !== "object" || filters === null) {
    return; // Empty filters are valid
  }

  const f = filters as Record<string, unknown>;

  // Validate inventoryItemId if provided
  if (f.inventoryItemId !== undefined) {
    validateUUID(f.inventoryItemId, "inventoryItemId");
  }

  // Validate transactionType if provided
  if (f.transactionType !== undefined) {
    validateTransactionType(f.transactionType);
  }

  // Validate locationId if provided
  if (f.locationId !== undefined) {
    validateUUID(f.locationId, "locationId");
  }

  // Validate startDate if provided
  if (f.startDate !== undefined) {
    invariant(
      typeof f.startDate === "string" && !isNaN(Date.parse(f.startDate)),
      `startDate must be a valid ISO date string, received "${f.startDate}"`
    );
  }

  // Validate endDate if provided
  if (f.endDate !== undefined) {
    invariant(
      typeof f.endDate === "string" && !isNaN(Date.parse(f.endDate)),
      `endDate must be a valid ISO date string, received "${f.endDate}"`
    );
  }

  // Validate page if provided
  if (f.page !== undefined) {
    validatePositiveNumber(f.page, "page");
  }

  // Validate limit if provided
  if (f.limit !== undefined) {
    validatePositiveNumber(f.limit, "limit");
  }
}
