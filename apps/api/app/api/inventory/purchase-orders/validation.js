/**
 * Purchase Order Validation Functions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validatePOStatus = validatePOStatus;
exports.validateQualityStatus = validateQualityStatus;
exports.validateDiscrepancyType = validateDiscrepancyType;
exports.validateNonNegativeNumber = validateNonNegativeNumber;
exports.validateUpdateQuantityReceivedRequest =
  validateUpdateQuantityReceivedRequest;
exports.validateUpdateQualityStatusRequest = validateUpdateQualityStatusRequest;
exports.validateCompleteReceivingRequest = validateCompleteReceivingRequest;
const invariant_1 = require("@/app/lib/invariant");
const types_1 = require("./types");
/**
 * Validate PO status
 */
function validatePOStatus(value) {
  if (!value) {
    throw new invariant_1.InvariantError("Status is required");
  }
  const status = value;
  if (!types_1.PO_STATUSES.includes(status)) {
    throw new invariant_1.InvariantError(
      `Invalid PO status: ${status}. Must be one of: ${types_1.PO_STATUSES.join(", ")}`
    );
  }
}
/**
 * Validate quality status
 */
function validateQualityStatus(value) {
  if (!value) {
    throw new invariant_1.InvariantError("Quality status is required");
  }
  const status = value;
  if (!types_1.QUALITY_STATUSES.includes(status)) {
    throw new invariant_1.InvariantError(
      `Invalid quality status: ${status}. Must be one of: ${types_1.QUALITY_STATUSES.join(", ")}`
    );
  }
}
/**
 * Validate discrepancy type
 */
function validateDiscrepancyType(value) {
  if (!value) return; // Optional field
  const type = value;
  if (!types_1.DISCREPANCY_TYPES.includes(type)) {
    throw new invariant_1.InvariantError(
      `Invalid discrepancy type: ${type}. Must be one of: ${types_1.DISCREPANCY_TYPES.join(", ")}`
    );
  }
}
/**
 * Validate numeric fields are non-negative
 */
function validateNonNegativeNumber(value, fieldName) {
  if (value === undefined || value === null) return;
  const num = Number(value);
  if (isNaN(num) || num < 0) {
    throw new invariant_1.InvariantError(
      `${fieldName} must be a non-negative number`
    );
  }
}
/**
 * Validate update quantity received request
 */
function validateUpdateQuantityReceivedRequest(data) {
  if (!data || typeof data !== "object") {
    throw new invariant_1.InvariantError("Request body is required");
  }
  const body = data;
  // Required fields
  if (body.quantity_received === undefined || body.quantity_received === null) {
    throw new invariant_1.InvariantError("quantity_received is required");
  }
  // Validate numeric field
  validateNonNegativeNumber(body.quantity_received, "quantity_received");
}
/**
 * Validate update quality status request
 */
function validateUpdateQualityStatusRequest(data) {
  if (!data || typeof data !== "object") {
    throw new invariant_1.InvariantError("Request body is required");
  }
  const body = data;
  // Required fields
  if (!body.quality_status) {
    throw new invariant_1.InvariantError("quality_status is required");
  }
  // Validate quality status
  validateQualityStatus(body.quality_status);
  // Validate discrepancy type if provided
  if (body.discrepancy_type) {
    validateDiscrepancyType(body.discrepancy_type);
  }
  // Validate discrepancy amount if provided
  validateNonNegativeNumber(body.discrepancy_amount, "discrepancy_amount");
  // Validate notes is string if provided
  if (body.notes !== undefined && typeof body.notes !== "string") {
    throw new invariant_1.InvariantError("notes must be a string");
  }
}
/**
 * Validate complete receiving request
 */
function validateCompleteReceivingRequest(data) {
  if (!data || typeof data !== "object") {
    throw new invariant_1.InvariantError("Request body is required");
  }
  const body = data;
  // Required fields
  if (!(body.items && Array.isArray(body.items))) {
    throw new invariant_1.InvariantError("items array is required");
  }
  if (body.items.length === 0) {
    throw new invariant_1.InvariantError("At least one item must be provided");
  }
  // Validate each item
  for (let i = 0; i < body.items.length; i++) {
    const item = body.items[i];
    if (!item.id || typeof item.id !== "string") {
      throw new invariant_1.InvariantError(
        `items[${i}].id is required and must be a string`
      );
    }
    if (
      item.quantity_received === undefined ||
      item.quantity_received === null
    ) {
      throw new invariant_1.InvariantError(
        `items[${i}].quantity_received is required`
      );
    }
    validateNonNegativeNumber(
      item.quantity_received,
      `items[${i}].quantity_received`
    );
    if (!item.quality_status) {
      throw new invariant_1.InvariantError(
        `items[${i}].quality_status is required`
      );
    }
    validateQualityStatus(item.quality_status);
    // Optional fields
    if (item.discrepancy_type) {
      validateDiscrepancyType(item.discrepancy_type);
    }
    validateNonNegativeNumber(
      item.discrepancy_amount,
      `items[${i}].discrepancy_amount`
    );
    if (item.notes !== undefined && typeof item.notes !== "string") {
      throw new invariant_1.InvariantError(
        `items[${i}].notes must be a string`
      );
    }
  }
  // Validate notes is string if provided
  if (body.notes !== undefined && typeof body.notes !== "string") {
    throw new invariant_1.InvariantError("notes must be a string");
  }
}
