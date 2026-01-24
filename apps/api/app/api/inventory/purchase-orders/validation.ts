/**
 * Purchase Order Validation Functions
 */

import { InvariantError } from "@/app/lib/invariant";
import type {
  CompleteReceivingRequest,
  DiscrepancyType,
  POStatus,
  QualityStatus,
  UpdateQuantityReceivedRequest,
  UpdateQualityStatusRequest,
} from "./types";
import { DISCREPANCY_TYPES, PO_STATUSES, QUALITY_STATUSES } from "./types";

/**
 * Validate PO status
 */
export function validatePOStatus(value: unknown): asserts value is POStatus {
  if (!value) {
    throw new InvariantError("Status is required");
  }

  const status = value as string;
  if (!PO_STATUSES.includes(status as POStatus)) {
    throw new InvariantError(
      `Invalid PO status: ${status}. Must be one of: ${PO_STATUSES.join(", ")}`
    );
  }
}

/**
 * Validate quality status
 */
export function validateQualityStatus(
  value: unknown
): asserts value is QualityStatus {
  if (!value) {
    throw new InvariantError("Quality status is required");
  }

  const status = value as string;
  if (!QUALITY_STATUSES.includes(status as QualityStatus)) {
    throw new InvariantError(
      `Invalid quality status: ${status}. Must be one of: ${QUALITY_STATUSES.join(", ")}`
    );
  }
}

/**
 * Validate discrepancy type
 */
export function validateDiscrepancyType(
  value: unknown
): asserts value is DiscrepancyType {
  if (!value) return; // Optional field

  const type = value as string;
  if (!DISCREPANCY_TYPES.includes(type as DiscrepancyType)) {
    throw new InvariantError(
      `Invalid discrepancy type: ${type}. Must be one of: ${DISCREPANCY_TYPES.join(", ")}`
    );
  }
}

/**
 * Validate numeric fields are non-negative
 */
export function validateNonNegativeNumber(
  value: unknown,
  fieldName: string
): asserts value is number {
  if (value === undefined || value === null) return;

  const num = Number(value);
  if (isNaN(num) || num < 0) {
    throw new InvariantError(`${fieldName} must be a non-negative number`);
  }
}

/**
 * Validate update quantity received request
 */
export function validateUpdateQuantityReceivedRequest(
  data: unknown
): asserts data is UpdateQuantityReceivedRequest {
  if (!data || typeof data !== "object") {
    throw new InvariantError("Request body is required");
  }

  const body = data as UpdateQuantityReceivedRequest;

  // Required fields
  if (
    body.quantity_received === undefined ||
    body.quantity_received === null
  ) {
    throw new InvariantError("quantity_received is required");
  }

  // Validate numeric field
  validateNonNegativeNumber(body.quantity_received, "quantity_received");
}

/**
 * Validate update quality status request
 */
export function validateUpdateQualityStatusRequest(
  data: unknown
): asserts data is UpdateQualityStatusRequest {
  if (!data || typeof data !== "object") {
    throw new InvariantError("Request body is required");
  }

  const body = data as UpdateQualityStatusRequest;

  // Required fields
  if (!body.quality_status) {
    throw new InvariantError("quality_status is required");
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
    throw new InvariantError("notes must be a string");
  }
}

/**
 * Validate complete receiving request
 */
export function validateCompleteReceivingRequest(
  data: unknown
): asserts data is CompleteReceivingRequest {
  if (!data || typeof data !== "object") {
    throw new InvariantError("Request body is required");
  }

  const body = data as CompleteReceivingRequest;

  // Required fields
  if (!body.items || !Array.isArray(body.items)) {
    throw new InvariantError("items array is required");
  }

  if (body.items.length === 0) {
    throw new InvariantError("At least one item must be provided");
  }

  // Validate each item
  for (let i = 0; i < body.items.length; i++) {
    const item = body.items[i];

    if (!item.id || typeof item.id !== "string") {
      throw new InvariantError(`items[${i}].id is required and must be a string`);
    }

    if (
      item.quantity_received === undefined ||
      item.quantity_received === null
    ) {
      throw new InvariantError(
        `items[${i}].quantity_received is required`
      );
    }

    validateNonNegativeNumber(
      item.quantity_received,
      `items[${i}].quantity_received`
    );

    if (!item.quality_status) {
      throw new InvariantError(`items[${i}].quality_status is required`);
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
      throw new InvariantError(`items[${i}].notes must be a string`);
    }
  }

  // Validate notes is string if provided
  if (body.notes !== undefined && typeof body.notes !== "string") {
    throw new InvariantError("notes must be a string");
  }
}
