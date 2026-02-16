/**
 * Command Board Connections Validation Helpers
 *
 * Validation functions using invariant() for connection operations
 */

import { invariant } from "@/app/lib/invariant";
import type {
  CreateConnectionRequest,
  UpdateConnectionRequest,
} from "../../types";

const VALID_CONNECTION_TYPES = [
  "client_to_event",
  "event_to_task",
  "task_to_employee",
  "event_to_inventory",
  "generic",
] as const;

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
 * Validate an optional boolean field
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
 * Validate a UUID field
 */
function validateUuidField(
  data: Record<string, unknown>,
  field: string,
  required: boolean
): string | undefined {
  const value = data[field];
  if (value === undefined || value === null) {
    invariant(!required, `${field} is required`);
    return undefined;
  }
  invariant(typeof value === "string", `${field} must be a string`);

  invariant(UUID_REGEX.test(value as string), `${field} must be a valid UUID`);

  return value as string;
}

/**
 * Validate create connection request
 */
export function validateCreateConnectionRequest(
  body: unknown
): asserts body is CreateConnectionRequest {
  invariant(
    body && typeof body === "object",
    "Request body must be a valid object"
  );

  const data = body as Record<string, unknown>;

  // fromCardId is required
  const fromCardId = validateUuidField(data, "fromCardId", true);
  invariant(fromCardId, "fromCardId is required");

  // toCardId is required
  const toCardId = validateUuidField(data, "toCardId", true);
  invariant(toCardId, "toCardId is required");

  // Ensure fromCardId and toCardId are not the same
  invariant(
    fromCardId !== toCardId,
    "fromCardId and toCardId cannot be the same"
  );

  // Validate optional enum field
  validateEnumField(data, "relationshipType", VALID_CONNECTION_TYPES);

  // Validate optional label field
  if (data.label !== undefined) {
    const label = validateStringField(data, "label", false);
    invariant(
      label === null || typeof label === "string",
      "label must be a string or null"
    );
    if (typeof label === "string") {
      invariant(
        label.trim().length <= 255,
        "label must be 255 characters or less"
      );
    }
  }

  // Validate optional visible field
  validateBooleanField(data, "visible");
}

/**
 * Validate update connection request
 */
export function validateUpdateConnectionRequest(
  body: unknown
): asserts body is UpdateConnectionRequest {
  invariant(
    body && typeof body === "object",
    "Request body must be a valid object"
  );

  const data = body as Record<string, unknown>;

  // At least one field must be provided
  invariant(
    data.relationshipType !== undefined ||
      data.label !== undefined ||
      data.visible !== undefined,
    "At least one field must be provided for update"
  );

  // Validate optional enum field
  validateEnumField(data, "relationshipType", VALID_CONNECTION_TYPES);

  // Validate optional label field
  if (data.label !== undefined) {
    const label = validateStringField(data, "label", false);
    invariant(
      label === null || typeof label === "string",
      "label must be a string or null"
    );
    if (typeof label === "string") {
      invariant(
        label.trim().length <= 255,
        "label must be 255 characters or less"
      );
    }
  }

  // Validate optional visible field
  validateBooleanField(data, "visible");
}

/**
 * Parse connection list filters from URL search params
 */
export function parseConnectionListFilters(searchParams: URLSearchParams): {
  fromCardId?: string;
  toCardId?: string;
  relationshipType?: string;
} {
  const filters: Record<string, string> = {};

  const fromCardId = searchParams.get("fromCardId");
  if (fromCardId) {
    filters.fromCardId = fromCardId;
  }

  const toCardId = searchParams.get("toCardId");
  if (toCardId) {
    filters.toCardId = toCardId;
  }

  const relationshipType = searchParams.get("relationshipType");
  if (relationshipType) {
    invariant(
      (VALID_CONNECTION_TYPES as readonly string[]).includes(relationshipType),
      `relationshipType must be one of: ${VALID_CONNECTION_TYPES.join(", ")}`
    );
    filters.relationshipType = relationshipType;
  }

  return filters;
}
