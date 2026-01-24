/**
 * Stock Levels Validation
 *
 * Validation functions for stock levels API requests.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateTransactionType = validateTransactionType;
exports.validateAdjustmentReason = validateAdjustmentReason;
exports.validateStockReorderStatus = validateStockReorderStatus;
exports.validateNonNegativeNumber = validateNonNegativeNumber;
exports.validatePositiveNumber = validatePositiveNumber;
exports.validateNonEmptyString = validateNonEmptyString;
exports.validateOptionalStringLength = validateOptionalStringLength;
exports.validateUUID = validateUUID;
exports.validateAdjustmentType = validateAdjustmentType;
exports.validateCreateAdjustmentRequest = validateCreateAdjustmentRequest;
exports.validateStockLevelFilters = validateStockLevelFilters;
exports.validateTransactionFilters = validateTransactionFilters;
const invariant_1 = require("@/app/lib/invariant");
const types_1 = require("./types");
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
function validateTransactionType(value) {
  (0, invariant_1.invariant)(
    typeof value === "string",
    `transactionType must be a string, received ${typeof value}`
  );
  (0, invariant_1.invariant)(
    types_1.TRANSACTION_TYPES.includes(value),
    `transactionType must be one of ${types_1.TRANSACTION_TYPES.join(", ")}, received "${value}"`
  );
}
/**
 * Validates that a value is a valid adjustment reason
 */
function validateAdjustmentReason(value) {
  (0, invariant_1.invariant)(
    typeof value === "string",
    `reason must be a string, received ${typeof value}`
  );
  (0, invariant_1.invariant)(
    types_1.ADJUSTMENT_REASONS.includes(value),
    `reason must be one of ${types_1.ADJUSTMENT_REASONS.join(", ")}, received "${value}"`
  );
}
/**
 * Validates that a value is a valid stock reorder status
 */
function validateStockReorderStatus(value) {
  (0, invariant_1.invariant)(
    typeof value === "string",
    `reorderStatus must be a string, received ${typeof value}`
  );
  (0, invariant_1.invariant)(
    types_1.STOCK_REORDER_STATUSES.includes(value),
    `reorderStatus must be one of ${types_1.STOCK_REORDER_STATUSES.join(", ")}, received "${value}"`
  );
}
/**
 * Validates that a value is a non-negative number
 */
function validateNonNegativeNumber(value, fieldName) {
  (0, invariant_1.invariant)(
    typeof value === "number",
    `${fieldName} must be a number, received ${typeof value}`
  );
  (0, invariant_1.invariant)(
    value >= 0,
    `${fieldName} must be non-negative, received ${value}`
  );
  (0, invariant_1.invariant)(
    value <= MAX_QUANTITY,
    `${fieldName} must not exceed ${MAX_QUANTITY}, received ${value}`
  );
}
/**
 * Validates that a value is a positive number
 */
function validatePositiveNumber(value, fieldName) {
  (0, invariant_1.invariant)(
    typeof value === "number",
    `${fieldName} must be a number, received ${typeof value}`
  );
  (0, invariant_1.invariant)(
    value > 0,
    `${fieldName} must be positive, received ${value}`
  );
}
/**
 * Validates that a string is not empty
 */
function validateNonEmptyString(value, fieldName) {
  (0, invariant_1.invariant)(
    typeof value === "string",
    `${fieldName} must be a string, received ${typeof value}`
  );
  (0, invariant_1.invariant)(
    value.trim().length > 0,
    `${fieldName} must not be empty`
  );
}
/**
 * Validates optional string field length
 */
function validateOptionalStringLength(value, fieldName, maxLength) {
  if (value === null || value === undefined) {
    return;
  }
  (0, invariant_1.invariant)(
    typeof value === "string",
    `${fieldName} must be a string or null, received ${typeof value}`
  );
  (0, invariant_1.invariant)(
    value.length <= maxLength,
    `${fieldName} must not exceed ${maxLength} characters, received ${value.length}`
  );
}
/**
 * Validates UUID format
 */
function validateUUID(value, fieldName) {
  (0, invariant_1.invariant)(
    typeof value === "string",
    `${fieldName} must be a string, received ${typeof value}`
  );
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  (0, invariant_1.invariant)(
    uuidRegex.test(value),
    `${fieldName} must be a valid UUID, received "${value}"`
  );
}
/**
 * Validates adjustment type (increase or decrease)
 */
function validateAdjustmentType(value) {
  (0, invariant_1.invariant)(
    typeof value === "string",
    `adjustmentType must be a string, received ${typeof value}`
  );
  (0, invariant_1.invariant)(
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
function validateCreateAdjustmentRequest(request) {
  (0, invariant_1.invariant)(
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
  } = request;
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
function validateStockLevelFilters(filters) {
  if (typeof filters !== "object" || filters === null) {
    return; // Empty filters are valid
  }
  const f = filters;
  // Validate search if provided
  if (f.search !== undefined) {
    (0, invariant_1.invariant)(
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
    (0, invariant_1.invariant)(
      typeof f.lowStock === "boolean",
      `lowStock must be a boolean, received ${typeof f.lowStock}`
    );
  }
  // Validate outOfStock if provided
  if (f.outOfStock !== undefined) {
    (0, invariant_1.invariant)(
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
function validateTransactionFilters(filters) {
  if (typeof filters !== "object" || filters === null) {
    return; // Empty filters are valid
  }
  const f = filters;
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
    (0, invariant_1.invariant)(
      typeof f.startDate === "string" && !isNaN(Date.parse(f.startDate)),
      `startDate must be a valid ISO date string, received "${f.startDate}"`
    );
  }
  // Validate endDate if provided
  if (f.endDate !== undefined) {
    (0, invariant_1.invariant)(
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
