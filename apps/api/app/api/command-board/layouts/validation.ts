/**
 * Command Board Layouts Validation Helpers
 *
 * Validation functions using invariant() for layout operations
 */

import { invariant } from "@/app/lib/invariant";
import type {
  CreateLayoutRequest,
  UpdateLayoutRequest,
  ViewportState,
} from "../types";

/**
 * Validate viewport state object
 */
function validateViewportState(data: unknown): asserts data is ViewportState {
  if (data === undefined || data === null) {
    return;
  }

  invariant(
    typeof data === "object" && data !== null && !Array.isArray(data),
    "viewport must be an object"
  );

  const viewport = data as Record<string, unknown>;

  // Validate zoom (required in viewport)
  invariant(
    "zoom" in viewport && typeof viewport.zoom === "number",
    "viewport.zoom is required and must be a number"
  );

  // Validate panX (required in viewport)
  invariant(
    "panX" in viewport && typeof viewport.panX === "number",
    "viewport.panX is required and must be a number"
  );

  // Validate panY (required in viewport)
  invariant(
    "panY" in viewport && typeof viewport.panY === "number",
    "viewport.panY is required and must be a number"
  );
}

/**
 * Validate visible cards array
 */
function validateVisibleCards(data: unknown): asserts data is string[] {
  if (data === undefined) {
    return;
  }

  invariant(Array.isArray(data), "visibleCards must be an array");

  const cards = data as unknown[];
  for (const card of cards) {
    invariant(
      typeof card === "string",
      "visibleCards must contain only strings"
    );
  }
}

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
 * Validate create layout request
 */
export function validateCreateLayoutRequest(
  body: unknown
): asserts body is CreateLayoutRequest {
  invariant(
    body && typeof body === "object",
    "Request body must be a valid object"
  );

  const data = body as Record<string, unknown>;

  // boardId is required
  const boardId = validateStringField(data, "boardId", true);
  invariant(
    boardId && boardId.trim().length > 0,
    "boardId is required and must not be empty"
  );

  // name is required
  const name = validateStringField(data, "name", true);
  invariant(
    name && name.trim().length > 0,
    "name is required and must not be empty"
  );

  // Validate viewport if provided
  if (data.viewport !== undefined) {
    validateViewportState(data.viewport);
  }

  // Validate visibleCards if provided
  if (data.visibleCards !== undefined) {
    validateVisibleCards(data.visibleCards);
  }

  // Validate optional numeric field
  validateIntegerField(data, "gridSize", true);

  // Validate optional boolean fields
  validateBooleanField(data, "showGrid");
  validateBooleanField(data, "snapToGrid");
}

/**
 * Validate update layout request
 */
export function validateUpdateLayoutRequest(
  body: unknown
): asserts body is UpdateLayoutRequest {
  invariant(
    body && typeof body === "object",
    "Request body must be a valid object"
  );

  const data = body as Record<string, unknown>;

  // At least one field must be provided
  if (Object.keys(data).length === 0) {
    invariant(false, "At least one field must be provided for update");
  }

  // Validate name if provided
  if (data.name !== undefined) {
    const name = validateStringField(data, "name", false);
    if (name !== null && name.trim().length === 0) {
      invariant(false, "name cannot be empty");
    }
  }

  // Validate viewport if provided
  if (data.viewport !== undefined) {
    validateViewportState(data.viewport);
  }

  // Validate visibleCards if provided
  if (data.visibleCards !== undefined) {
    validateVisibleCards(data.visibleCards);
  }

  // Validate gridSize if provided
  validateIntegerField(data, "gridSize", true);

  // Validate optional boolean fields
  validateBooleanField(data, "showGrid");
  validateBooleanField(data, "snapToGrid");
}

/**
 * Validate layout ID parameter
 */
export function validateLayoutId(layoutId: string): void {
  if (!layoutId || typeof layoutId !== "string") {
    invariant(false, "Invalid layout ID");
  }
}

/**
 * Validate board ID parameter
 */
export function validateBoardId(boardId: string): void {
  if (!boardId || typeof boardId !== "string") {
    invariant(false, "Invalid board ID");
  }
}
