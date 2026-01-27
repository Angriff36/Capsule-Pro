/**
 * Shipment Validation Functions
 */

import { InvariantError } from "@/app/lib/invariant";
import type {
  CreateShipmentItemRequest,
  CreateShipmentRequest,
  ItemCondition,
  ShipmentStatus,
  UpdateShipmentItemRequest,
  UpdateShipmentRequest,
  UpdateShipmentStatusRequest,
} from "./types";
import { ITEM_CONDITIONS, SHIPMENT_STATUSES } from "./types";

export function validateShipmentStatus(
  value: unknown
): asserts value is ShipmentStatus {
  if (!value) {
    throw new InvariantError("Status is required");
  }
  const status = value as string;
  if (!SHIPMENT_STATUSES.includes(status as ShipmentStatus)) {
    throw new InvariantError("Invalid shipment status");
  }
}

export function validateItemCondition(
  value: unknown
): asserts value is ItemCondition {
  if (!value) {
    return;
  }
  const condition = value as string;
  if (!ITEM_CONDITIONS.includes(condition as ItemCondition)) {
    throw new InvariantError("Invalid item condition");
  }
}

export function validateDateString(
  value: unknown,
  fieldName: string
): asserts value is string {
  if (value === undefined || value === null) {
    return;
  }
  if (typeof value !== "string") {
    throw new InvariantError(`${fieldName} must be a string`);
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new InvariantError(
      `${fieldName} must be a valid ISO 8601 date string`
    );
  }
}

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

export function validatePositiveNumber(
  value: unknown,
  fieldName: string
): asserts value is number {
  if (value === undefined || value === null) {
    throw new InvariantError(`${fieldName} is required`);
  }
  const num = Number(value);
  if (Number.isNaN(num) || num <= 0) {
    throw new InvariantError(`${fieldName} must be a positive number`);
  }
}

export function validateUUID(
  value: unknown,
  fieldName: string
): asserts value is string {
  if (value === undefined || value === null) {
    return;
  }
  if (typeof value !== "string") {
    throw new InvariantError(`${fieldName} must be a string`);
  }
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(value)) {
    throw new InvariantError(`${fieldName} must be a valid UUID`);
  }
}

export function validateCreateShipmentRequest(
  data: unknown
): asserts data is CreateShipmentRequest {
  if (!data || typeof data !== "object") {
    throw new InvariantError("Request body is required");
  }
  const body = data as CreateShipmentRequest;
  if (body.status) {
    validateShipmentStatus(body.status);
  }
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
    throw new InvariantError("shipment_number must be a string");
  }
}

export function validateUpdateShipmentRequest(
  data: unknown
): asserts data is UpdateShipmentRequest {
  if (!data || typeof data !== "object") {
    throw new InvariantError("Request body is required");
  }
  const body = data as UpdateShipmentRequest;
  if (Object.keys(body).length === 0) {
    throw new InvariantError("At least one field must be provided for update");
  }
  if (body.status) {
    validateShipmentStatus(body.status);
  }
  validateUUID(body.event_id, "event_id");
  validateUUID(body.supplier_id, "supplier_id");
  validateUUID(body.location_id, "location_id");
  validateUUID(body.delivered_by, "delivered_by");
}

export function validateUpdateShipmentStatusRequest(
  data: unknown
): asserts data is UpdateShipmentStatusRequest {
  if (!data || typeof data !== "object") {
    throw new InvariantError("Request body is required");
  }
  const body = data as UpdateShipmentStatusRequest;
  if (!body.status) {
    throw new InvariantError("status is required");
  }
  validateShipmentStatus(body.status);
  validateDateString(body.actual_delivery_date, "actual_delivery_date");
  validateUUID(body.delivered_by, "delivered_by");
}

export function validateCreateShipmentItemRequest(
  data: unknown
): asserts data is CreateShipmentItemRequest {
  if (!data || typeof data !== "object") {
    throw new InvariantError("Request body is required");
  }
  const body = data as CreateShipmentItemRequest;
  if (!body.item_id || typeof body.item_id !== "string") {
    throw new InvariantError("item_id is required");
  }
  validateUUID(body.item_id, "item_id");
  validatePositiveNumber(body.quantity_shipped, "quantity_shipped");
  validateNonNegativeNumber(body.quantity_received, "quantity_received");
  validateNonNegativeNumber(body.quantity_damaged, "quantity_damaged");
  if (body.condition) {
    validateItemCondition(body.condition);
  }
}

export function validateUpdateShipmentItemRequest(
  data: unknown
): asserts data is UpdateShipmentItemRequest {
  if (!data || typeof data !== "object") {
    throw new InvariantError("Request body is required");
  }
  const body = data as UpdateShipmentItemRequest;
  if (Object.keys(body).length === 0) {
    throw new InvariantError("At least one field must be provided for update");
  }
  validateNonNegativeNumber(body.quantity_shipped, "quantity_shipped");
  validateNonNegativeNumber(body.quantity_received, "quantity_received");
  validateNonNegativeNumber(body.quantity_damaged, "quantity_damaged");
  if (body.condition) {
    validateItemCondition(body.condition);
  }
}
