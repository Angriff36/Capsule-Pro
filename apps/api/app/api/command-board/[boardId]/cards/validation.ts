/**
 * Command Board Cards Validation Helpers
 *
 * Validation functions using invariant() for card operations
 */

import { invariant } from "@/app/lib/invariant";
import type { CreateCardRequest } from "../../types";

const VALID_CARD_TYPES = [
  "generic",
  "event",
  "client",
  "task",
  "employee",
  "inventory",
  "recipe",
  "note",
  "alert",
  "info",
] as const;
const VALID_CARD_STATUSES = [
  "active",
  "completed",
  "archived",
  "pending",
  "in_progress",
  "blocked",
] as const;

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
 * Validate an optional enum field
 */
function validateEnumField(
  data: Record<string, unknown>,
  field: string,
  validValues: readonly string[]
): string | undefined {
  const value = data[field];
  if (value === undefined) {
    return undefined;
  }
  invariant(
    typeof value === "string" && validValues.includes(value),
    `${field} must be one of: ${validValues.join(", ")}`
  );
  return value as string;
}

/**
 * Validate an integer field
 */
function validateIntegerField(
  data: Record<string, unknown>,
  field: string,
  positive = false
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
  if (positive) {
    invariant(numValue > 0, `${field} must be a positive integer`);
  }
  return numValue;
}

/**
 * Validate optional object field
 */
function validateObjectField(
  data: Record<string, unknown>,
  field: string
): Record<string, unknown> | undefined {
  const value = data[field];
  if (value === undefined) {
    return undefined;
  }
  invariant(
    typeof value === "object" && value !== null && !Array.isArray(value),
    `${field} must be an object`
  );
  return value as Record<string, unknown>;
}

/**
 * Validate create card request
 */
export function validateCreateCardRequest(
  body: unknown
): asserts body is CreateCardRequest {
  invariant(
    body && typeof body === "object",
    "Request body must be a valid object"
  );

  const data = body as Record<string, unknown>;

  // Title is required
  const title = validateStringField(data, "title", true);
  invariant(
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
    invariant(
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
export function parseCardListFilters(searchParams: URLSearchParams): {
  cardType?: string;
  status?: string;
} {
  const filters: Record<string, string> = {};

  const cardType = searchParams.get("cardType");
  if (cardType) {
    invariant(
      [
        "generic",
        "event",
        "client",
        "task",
        "employee",
        "inventory",
        "recipe",
        "note",
        "alert",
        "info",
      ].includes(cardType),
      "cardType must be one of: generic, event, client, task, employee, inventory, recipe, note, alert, info"
    );
    filters.cardType = cardType;
  }

  const status = searchParams.get("status");
  if (status) {
    invariant(
      [
        "active",
        "completed",
        "archived",
        "pending",
        "in_progress",
        "blocked",
      ].includes(status),
      "status must be one of: active, completed, archived, pending, in_progress, blocked"
    );
    filters.status = status;
  }

  return filters;
}
