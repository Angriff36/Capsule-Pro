/**
 * Shipment Validation Functions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateShipmentStatus = validateShipmentStatus;
exports.validateItemCondition = validateItemCondition;
exports.validateDateString = validateDateString;
exports.validateNonNegativeNumber = validateNonNegativeNumber;
exports.validatePositiveNumber = validatePositiveNumber;
exports.validateUUID = validateUUID;
exports.validateCreateShipmentRequest = validateCreateShipmentRequest;
exports.validateUpdateShipmentRequest = validateUpdateShipmentRequest;
exports.validateUpdateShipmentStatusRequest =
  validateUpdateShipmentStatusRequest;
exports.validateCreateShipmentItemRequest = validateCreateShipmentItemRequest;
exports.validateUpdateShipmentItemRequest = validateUpdateShipmentItemRequest;
const invariant_1 = require("@/app/lib/invariant");
const types_1 = require("./types");
function validateShipmentStatus(value) {
  if (!value) {
    throw new invariant_1.InvariantError("Status is required");
  }
  const status = value;
  if (!types_1.SHIPMENT_STATUSES.includes(status)) {
    throw new invariant_1.InvariantError("Invalid shipment status");
  }
}
function validateItemCondition(value) {
  if (!value) return;
  const condition = value;
  if (!types_1.ITEM_CONDITIONS.includes(condition)) {
    throw new invariant_1.InvariantError("Invalid item condition");
  }
}
function validateDateString(value, fieldName) {
  if (value === undefined || value === null) return;
  if (typeof value !== "string") {
    throw new invariant_1.InvariantError(fieldName + " must be a string");
  }
  const date = new Date(value);
  if (isNaN(date.getTime())) {
    throw new invariant_1.InvariantError(
      fieldName + " must be a valid ISO 8601 date string"
    );
  }
}
function validateNonNegativeNumber(value, fieldName) {
  if (value === undefined || value === null) return;
  const num = Number(value);
  if (isNaN(num) || num < 0) {
    throw new invariant_1.InvariantError(
      fieldName + " must be a non-negative number"
    );
  }
}
function validatePositiveNumber(value, fieldName) {
  if (value === undefined || value === null) {
    throw new invariant_1.InvariantError(fieldName + " is required");
  }
  const num = Number(value);
  if (isNaN(num) || num <= 0) {
    throw new invariant_1.InvariantError(
      fieldName + " must be a positive number"
    );
  }
}
function validateUUID(value, fieldName) {
  if (value === undefined || value === null) return;
  if (typeof value !== "string") {
    throw new invariant_1.InvariantError(fieldName + " must be a string");
  }
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(value)) {
    throw new invariant_1.InvariantError(fieldName + " must be a valid UUID");
  }
}
function validateCreateShipmentRequest(data) {
  if (!data || typeof data !== "object") {
    throw new invariant_1.InvariantError("Request body is required");
  }
  const body = data;
  if (body.status) validateShipmentStatus(body.status);
  validateUUID(body.event_id, "event_id");
  validateUUID(body.supplier_id, "supplier_id");
  validateUUID(body.location_id, "location_id");
  validateDateString(body.scheduled_date, "scheduled_date");
  validateDateString(body.estimated_delivery_date, "estimated_delivery_date");
  validateNonNegativeNumber(body.shipping_cost, "shipping_cost");
  if (
    body.shipment_number !== undefined &&
    typeof body.shipment_number !== "string"
  ) {
    throw new invariant_1.InvariantError("shipment_number must be a string");
  }
}
function validateUpdateShipmentRequest(data) {
  if (!data || typeof data !== "object") {
    throw new invariant_1.InvariantError("Request body is required");
  }
  const body = data;
  if (Object.keys(body).length === 0) {
    throw new invariant_1.InvariantError(
      "At least one field must be provided for update"
    );
  }
  if (body.status) validateShipmentStatus(body.status);
  validateUUID(body.event_id, "event_id");
  validateUUID(body.supplier_id, "supplier_id");
  validateUUID(body.location_id, "location_id");
  validateUUID(body.delivered_by, "delivered_by");
}
function validateUpdateShipmentStatusRequest(data) {
  if (!data || typeof data !== "object") {
    throw new invariant_1.InvariantError("Request body is required");
  }
  const body = data;
  if (!body.status) {
    throw new invariant_1.InvariantError("status is required");
  }
  validateShipmentStatus(body.status);
  validateDateString(body.actual_delivery_date, "actual_delivery_date");
  validateUUID(body.delivered_by, "delivered_by");
}
function validateCreateShipmentItemRequest(data) {
  if (!data || typeof data !== "object") {
    throw new invariant_1.InvariantError("Request body is required");
  }
  const body = data;
  if (!body.item_id || typeof body.item_id !== "string") {
    throw new invariant_1.InvariantError("item_id is required");
  }
  validateUUID(body.item_id, "item_id");
  validatePositiveNumber(body.quantity_shipped, "quantity_shipped");
  validateNonNegativeNumber(body.quantity_received, "quantity_received");
  validateNonNegativeNumber(body.quantity_damaged, "quantity_damaged");
  if (body.condition) validateItemCondition(body.condition);
}
function validateUpdateShipmentItemRequest(data) {
  if (!data || typeof data !== "object") {
    throw new invariant_1.InvariantError("Request body is required");
  }
  const body = data;
  if (Object.keys(body).length === 0) {
    throw new invariant_1.InvariantError(
      "At least one field must be provided for update"
    );
  }
  validateNonNegativeNumber(body.quantity_shipped, "quantity_shipped");
  validateNonNegativeNumber(body.quantity_received, "quantity_received");
  validateNonNegativeNumber(body.quantity_damaged, "quantity_damaged");
  if (body.condition) validateItemCondition(body.condition);
}
