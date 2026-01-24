/**
 * Command Board Cards Validation Helpers
 *
 * Validation functions using invariant() for card operations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateCreateCardRequest = validateCreateCardRequest;
exports.parseCardListFilters = parseCardListFilters;
const invariant_1 = require("@/app/lib/invariant");
const VALID_CARD_TYPES = ["task", "note", "alert", "info"];
const VALID_CARD_STATUSES = ["pending", "in_progress", "completed", "blocked"];
/**
 * Validate a string field
 */
function validateStringField(data, field, required) {
  const value = data[field];
  if (value === undefined || value === null) {
    (0, invariant_1.invariant)(!required, `${field} is required`);
    return null;
  }
  (0, invariant_1.invariant)(
    typeof value === "string",
    `${field} must be a string`
  );
  return value;
}
/**
 * Validate an optional enum field
 */
function validateEnumField(data, field, validValues) {
  const value = data[field];
  if (value === undefined) return undefined;
  (0, invariant_1.invariant)(
    typeof value === "string" && validValues.includes(value),
    `${field} must be one of: ${validValues.join(", ")}`
  );
  return value;
}
/**
 * Validate an integer field
 */
function validateIntegerField(data, field, positive = false) {
  const value = data[field];
  if (value === undefined) return undefined;
  (0, invariant_1.invariant)(
    typeof value === "number" && Number.isInteger(value),
    `${field} must be an integer`
  );
  if (positive) {
    (0, invariant_1.invariant)(
      value > 0,
      `${field} must be a positive integer`
    );
  }
  return value;
}
/**
 * Validate optional object field
 */
function validateObjectField(data, field) {
  const value = data[field];
  if (value === undefined) return undefined;
  (0, invariant_1.invariant)(
    typeof value === "object" && value !== null && !Array.isArray(value),
    `${field} must be an object`
  );
  return value;
}
/**
 * Validate create card request
 */
function validateCreateCardRequest(body) {
  (0, invariant_1.invariant)(
    body && typeof body === "object",
    "Request body must be a valid object"
  );
  const data = body;
  // Title is required
  const title = validateStringField(data, "title", true);
  (0, invariant_1.invariant)(
    title && title.trim().length > 0,
    "title is required and must not be empty"
  );
  // Validate content if provided
  if (data.content !== undefined) {
    validateStringField(data, "content", false);
  }
  // Validate optional enum fields
  validateEnumField(data, "cardType", VALID_CARD_TYPES);
  validateEnumField(data, "status", VALID_CARD_STATUSES);
  // Validate position fields
  validateIntegerField(data, "positionX", false);
  validateIntegerField(data, "positionY", false);
  // Validate dimension fields (must be positive)
  validateIntegerField(data, "width", true);
  validateIntegerField(data, "height", true);
  // Validate zIndex
  validateIntegerField(data, "zIndex", false);
  // Validate color if provided
  if (data.color !== undefined) {
    const color = validateStringField(data, "color", false);
    (0, invariant_1.invariant)(
      color === null || typeof color === "string",
      "color must be a string or null"
    );
  }
  // Validate metadata if provided
  validateObjectField(data, "metadata");
}
/**
 * Parse card list filters from URL search params
 */
function parseCardListFilters(searchParams) {
  const filters = {};
  const cardType = searchParams.get("cardType");
  if (cardType) {
    (0, invariant_1.invariant)(
      ["task", "note", "alert", "info"].includes(cardType),
      "cardType must be one of: task, note, alert, info"
    );
    filters.cardType = cardType;
  }
  const status = searchParams.get("status");
  if (status) {
    (0, invariant_1.invariant)(
      ["pending", "in_progress", "completed", "blocked"].includes(status),
      "status must be one of: pending, in_progress, completed, blocked"
    );
    filters.status = status;
  }
  return filters;
}
