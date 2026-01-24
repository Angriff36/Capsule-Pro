/**
 * Inventory Item Validation Functions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateFSAStatus = validateFSAStatus;
exports.validateItemCategory = validateItemCategory;
exports.validateNonNegativeNumber = validateNonNegativeNumber;
exports.validateCreateInventoryItemRequest = validateCreateInventoryItemRequest;
exports.validateUpdateInventoryItemRequest = validateUpdateInventoryItemRequest;
const invariant_1 = require("@/app/lib/invariant");
const types_1 = require("./types");
/**
 * Validate FSA status
 */
function validateFSAStatus(value) {
  if (!value) return; // Optional field
  const status = value;
  if (!types_1.FSA_STATUSES.includes(status)) {
    throw new invariant_1.InvariantError(
      `Invalid FSA status: ${status}. Must be one of: ${types_1.FSA_STATUSES.join(", ")}`
    );
  }
}
/**
 * Validate item category
 */
function validateItemCategory(value) {
  if (!value) {
    throw new invariant_1.InvariantError("Category is required");
  }
  const category = value;
  if (!types_1.ITEM_CATEGORIES.includes(category)) {
    throw new invariant_1.InvariantError(
      `Invalid category: ${category}. Must be one of: ${types_1.ITEM_CATEGORIES.join(", ")}`
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
 * Validate create inventory item request
 */
function validateCreateInventoryItemRequest(data) {
  if (!data || typeof data !== "object") {
    throw new invariant_1.InvariantError("Request body is required");
  }
  const body = data;
  // Required fields
  if (!body.item_number || typeof body.item_number !== "string") {
    throw new invariant_1.InvariantError(
      "item_number is required and must be a string"
    );
  }
  if (!body.name || typeof body.name !== "string") {
    throw new invariant_1.InvariantError(
      "name is required and must be a string"
    );
  }
  // Validate category
  if (body.category) {
    validateItemCategory(body.category);
  }
  // Validate numeric fields
  validateNonNegativeNumber(body.unit_cost, "unit_cost");
  validateNonNegativeNumber(body.quantity_on_hand, "quantity_on_hand");
  validateNonNegativeNumber(body.reorder_level, "reorder_level");
  // Validate FSA status
  if (body.fsa_status) {
    validateFSAStatus(body.fsa_status);
  }
  // Validate tags is array
  if (body.tags !== undefined && !Array.isArray(body.tags)) {
    throw new invariant_1.InvariantError("tags must be an array");
  }
  // Validate boolean fields
  const booleanFields = [
    "fsa_temp_logged",
    "fsa_allergen_info",
    "fsa_traceable",
  ];
  for (const field of booleanFields) {
    if (body[field] !== undefined && typeof body[field] !== "boolean") {
      throw new invariant_1.InvariantError(`${field} must be a boolean`);
    }
  }
}
/**
 * Validate update inventory item request
 */
function validateUpdateInventoryItemRequest(data) {
  if (!data || typeof data !== "object") {
    throw new invariant_1.InvariantError("Request body is required");
  }
  const body = data;
  // At least one field must be provided
  if (Object.keys(body).length === 0) {
    throw new invariant_1.InvariantError(
      "At least one field must be provided for update"
    );
  }
  // Validate category if provided
  if (body.category) {
    validateItemCategory(body.category);
  }
  // Validate numeric fields
  validateNonNegativeNumber(body.unit_cost, "unit_cost");
  validateNonNegativeNumber(body.quantity_on_hand, "quantity_on_hand");
  validateNonNegativeNumber(body.reorder_level, "reorder_level");
  // Validate FSA status if provided
  if (body.fsa_status) {
    validateFSAStatus(body.fsa_status);
  }
  // Validate tags is array if provided
  if (body.tags !== undefined && !Array.isArray(body.tags)) {
    throw new invariant_1.InvariantError("tags must be an array");
  }
  // Validate boolean fields
  const booleanFields = [
    "fsa_temp_logged",
    "fsa_allergen_info",
    "fsa_traceable",
  ];
  for (const field of booleanFields) {
    if (body[field] !== undefined && typeof body[field] !== "boolean") {
      throw new invariant_1.InvariantError(`${field} must be a boolean`);
    }
  }
}
