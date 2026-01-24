/**
 * Command Board Validation Functions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateBoardStatus = validateBoardStatus;
exports.validateCardType = validateCardType;
exports.validateCardStatus = validateCardStatus;
exports.validateUpdateCommandBoardRequest = validateUpdateCommandBoardRequest;
exports.validateCreateCommandBoardRequest = validateCreateCommandBoardRequest;
const invariant_1 = require("@/app/lib/invariant");
const types_1 = require("./types");
/**
 * Validate board status
 */
function validateBoardStatus(value) {
  if (value === undefined || value === null) {
    return;
  }
  const status = value;
  if (!types_1.BOARD_STATUSES.includes(status)) {
    throw new invariant_1.InvariantError(
      `Invalid board status: ${status}. Must be one of: ${types_1.BOARD_STATUSES.join(", ")}`
    );
  }
}
/**
 * Validate card type
 */
function validateCardType(value) {
  if (value === undefined || value === null) {
    return;
  }
  const type = value;
  if (!types_1.CARD_TYPES.includes(type)) {
    throw new invariant_1.InvariantError(
      `Invalid card type: ${type}. Must be one of: ${types_1.CARD_TYPES.join(", ")}`
    );
  }
}
/**
 * Validate card status
 */
function validateCardStatus(value) {
  if (value === undefined || value === null) {
    return;
  }
  const status = value;
  if (!types_1.CARD_STATUSES.includes(status)) {
    throw new invariant_1.InvariantError(
      `Invalid card status: ${status}. Must be one of: ${types_1.CARD_STATUSES.join(", ")}`
    );
  }
}
/**
 * Validate update command board request
 */
function validateUpdateCommandBoardRequest(data) {
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
  // Validate name if provided
  if (body.name !== undefined && typeof body.name !== "string") {
    throw new invariant_1.InvariantError("name must be a string");
  }
  // Validate description if provided
  if (body.description !== undefined && typeof body.description !== "string") {
    throw new invariant_1.InvariantError("description must be a string");
  }
  // Validate status if provided
  if (body.status !== undefined) {
    validateBoardStatus(body.status);
  }
  // Validate is_template if provided
  if (body.is_template !== undefined && typeof body.is_template !== "boolean") {
    throw new invariant_1.InvariantError("is_template must be a boolean");
  }
  // Validate tags if provided
  if (body.tags !== undefined && !Array.isArray(body.tags)) {
    throw new invariant_1.InvariantError("tags must be an array");
  }
  // Validate event_id if provided
  if (
    body.event_id !== undefined &&
    body.event_id !== null &&
    typeof body.event_id !== "string"
  ) {
    throw new invariant_1.InvariantError("event_id must be a string or null");
  }
}
/**
 * Validate create command board request
 */
function validateCreateCommandBoardRequest(data) {
  if (!data || typeof data !== "object") {
    throw new invariant_1.InvariantError("Request body is required");
  }
  const body = data;
  // Required fields
  if (!body.name || typeof body.name !== "string") {
    throw new invariant_1.InvariantError(
      "name is required and must be a string"
    );
  }
  if (body.name.trim().length === 0) {
    throw new invariant_1.InvariantError("name cannot be empty");
  }
  // Validate status if provided
  if (body.status !== undefined) {
    validateBoardStatus(body.status);
  }
  // Validate is_template if provided
  if (body.is_template !== undefined && typeof body.is_template !== "boolean") {
    throw new invariant_1.InvariantError("is_template must be a boolean");
  }
  // Validate tags is array if provided
  if (body.tags !== undefined && !Array.isArray(body.tags)) {
    throw new invariant_1.InvariantError("tags must be an array");
  }
  // Validate event_id if provided
  if (body.event_id !== undefined && typeof body.event_id !== "string") {
    throw new invariant_1.InvariantError("event_id must be a string");
  }
  // Validate description if provided
  if (body.description !== undefined && typeof body.description !== "string") {
    throw new invariant_1.InvariantError("description must be a string");
  }
}
