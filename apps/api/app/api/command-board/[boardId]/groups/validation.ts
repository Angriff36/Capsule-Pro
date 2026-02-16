/**
 * Command Board Groups Validation Helpers
 *
 * Validation functions using invariant() for group operations
 */

import { invariant } from "@/app/lib/invariant";
import type {
  AddCardsToGroupRequest,
  CreateGroupRequest,
  RemoveCardsFromGroupRequest,
  UpdateGroupRequest,
} from "../../types";

/**
 * Validate a string field
 */
function validateStringField(
  data: Record<string, unknown>,
  field: string,
  required: boolean
): string | null {
  const value = data[field];
  if (value === undefined || value === null) {
    invariant(!required, `${field} is required`);
    return null;
  }
  invariant(typeof value === "string", `${field} must be a string`);
  return value as string;
}

/**
 * Validate a boolean field
 */
function validateBooleanField(
  data: Record<string, unknown>,
  field: string
): boolean | undefined {
  const value = data[field];
  if (value === undefined) {
    return undefined;
  }
  invariant(typeof value === "boolean", `${field} must be a boolean`);
  return value as boolean;
}

/**
 * Validate an integer field
 */
function validateIntegerField(
  data: Record<string, unknown>,
  field: string,
  nonNegative = false
): number | undefined {
  const value = data[field];
  if (value === undefined) {
    return undefined;
  }
  invariant(
    typeof value === "number" && Number.isInteger(value),
    `${field} must be an integer`
  );
  const numValue = value as number;
  if (nonNegative) {
    invariant(numValue >= 0, `${field} must be a non-negative integer`);
  }
  return numValue;
}

/**
 * Validate an array of strings field
 */
function validateStringArrayField(
  data: Record<string, unknown>,
  field: string,
  required: boolean
): string[] | undefined {
  const value = data[field];
  if (value === undefined) {
    invariant(!required, `${field} is required`);
    return undefined;
  }
  invariant(Array.isArray(value), `${field} must be an array`);
  const arrValue = value as unknown[];
  invariant(arrValue.length > 0, `${field} must not be empty`);

  for (let i = 0; i < arrValue.length; i++) {
    const item = arrValue[i];
    invariant(typeof item === "string", `${field}[${i}] must be a string`);
    const strItem = item as string;
    invariant(strItem.length > 0, `${field}[${i}] must not be empty`);
  }

  return arrValue as string[];
}

/**
 * Validate create group request
 */
export function validateCreateGroupRequest(
  body: unknown
): asserts body is CreateGroupRequest {
  invariant(
    body && typeof body === "object",
    "Request body must be a valid object"
  );

  const data = body as Record<string, unknown>;

  // Name is required
  const name = validateStringField(data, "name", true);
  invariant(
    name && name.trim().length > 0,
    "name is required and must not be empty"
  );

  // Validate optional color field
  if (data.color !== undefined) {
    const color = validateStringField(data, "color", false);
    invariant(
      color === null || typeof color === "string",
      "color must be a string or null"
    );
  }

  // Validate optional boolean field
  validateBooleanField(data, "collapsed");

  // Validate position fields (non-negative)
  validateIntegerField(data, "positionX", true);
  validateIntegerField(data, "positionY", true);

  // Validate dimension fields (non-negative)
  validateIntegerField(data, "width", true);
  validateIntegerField(data, "height", true);

  // Validate zIndex (non-negative)
  validateIntegerField(data, "zIndex", true);
}

/**
 * Validate update group request
 */
export function validateUpdateGroupRequest(
  body: unknown
): asserts body is UpdateGroupRequest {
  invariant(
    body && typeof body === "object",
    "Request body must be a valid object"
  );

  const data = body as Record<string, unknown>;

  // At least one field should be present
  const hasAnyField = Object.keys(data).some((key) =>
    [
      "name",
      "color",
      "collapsed",
      "position_x",
      "position_y",
      "width",
      "height",
      "z_index",
    ].includes(key)
  );
  invariant(hasAnyField, "At least one field must be provided for update");

  // Validate optional name field
  if (data.name !== undefined) {
    const name = validateStringField(data, "name", false);
    invariant(
      !name || name.trim().length > 0,
      "name must not be empty if provided"
    );
  }

  // Validate optional color field
  if (data.color !== undefined) {
    const color = validateStringField(data, "color", false);
    invariant(
      color === null || typeof color === "string",
      "color must be a string or null"
    );
  }

  // Validate optional boolean field
  validateBooleanField(data, "collapsed");

  // Validate position fields (non-negative)
  validateIntegerField(data, "position_x", true);
  validateIntegerField(data, "position_y", true);

  // Validate dimension fields (non-negative)
  validateIntegerField(data, "width", true);
  validateIntegerField(data, "height", true);

  // Validate zIndex (non-negative)
  validateIntegerField(data, "z_index", true);
}

/**
 * Validate add cards to group request
 */
export function validateAddCardsToGroupRequest(
  body: unknown
): asserts body is AddCardsToGroupRequest {
  invariant(
    body && typeof body === "object",
    "Request body must be a valid object"
  );

  const data = body as Record<string, unknown>;

  // Validate cardIds array
  const cardIds = validateStringArrayField(data, "cardIds", true);
  invariant(
    cardIds && cardIds.length > 0,
    "cardIds is required and must not be empty"
  );
}

/**
 * Validate remove cards from group request
 */
export function validateRemoveCardsFromGroupRequest(
  body: unknown
): asserts body is RemoveCardsFromGroupRequest {
  invariant(
    body && typeof body === "object",
    "Request body must be a valid object"
  );

  const data = body as Record<string, unknown>;

  // Validate cardIds array
  const cardIds = validateStringArrayField(data, "cardIds", true);
  invariant(
    cardIds && cardIds.length > 0,
    "cardIds is required and must not be empty"
  );
}
