/**
 * Command Board Validation Functions
 */

import { InvariantError } from "@/app/lib/invariant";
import type {
  BoardStatus,
  CardStatus,
  CardType,
  CreateCommandBoardRequest,
  UpdateCommandBoardRequest,
} from "./types";
import { BOARD_STATUSES, CARD_STATUSES, CARD_TYPES } from "./types";

/**
 * Validate board status
 */
export function validateBoardStatus(
  value: unknown
): asserts value is BoardStatus {
  if (value === undefined || value === null) {
    return;
  }

  const status = value as string;
  if (!BOARD_STATUSES.includes(status as BoardStatus)) {
    throw new InvariantError(
      `Invalid board status: ${status}. Must be one of: ${BOARD_STATUSES.join(", ")}`
    );
  }
}

/**
 * Validate card type
 */
export function validateCardType(value: unknown): asserts value is CardType {
  if (value === undefined || value === null) {
    return;
  }

  const type = value as string;
  if (!CARD_TYPES.includes(type as CardType)) {
    throw new InvariantError(
      `Invalid card type: ${type}. Must be one of: ${CARD_TYPES.join(", ")}`
    );
  }
}

/**
 * Validate card status
 */
export function validateCardStatus(
  value: unknown
): asserts value is CardStatus {
  if (value === undefined || value === null) {
    return;
  }

  const status = value as string;
  if (!CARD_STATUSES.includes(status as CardStatus)) {
    throw new InvariantError(
      `Invalid card status: ${status}. Must be one of: ${CARD_STATUSES.join(", ")}`
    );
  }
}

/**
 * Validate update command board request
 */
export function validateUpdateCommandBoardRequest(
  data: unknown
): asserts data is UpdateCommandBoardRequest {
  if (!data || typeof data !== "object") {
    throw new InvariantError("Request body is required");
  }

  const body = data as UpdateCommandBoardRequest;

  // At least one field must be provided
  if (Object.keys(body).length === 0) {
    throw new InvariantError("At least one field must be provided for update");
  }

  // Validate name if provided
  if (body.name !== undefined && typeof body.name !== "string") {
    throw new InvariantError("name must be a string");
  }

  // Validate description if provided
  if (body.description !== undefined && typeof body.description !== "string") {
    throw new InvariantError("description must be a string");
  }

  // Validate status if provided
  if (body.status !== undefined) {
    validateBoardStatus(body.status);
  }

  // Validate is_template if provided
  if (body.is_template !== undefined && typeof body.is_template !== "boolean") {
    throw new InvariantError("is_template must be a boolean");
  }

  // Validate tags if provided
  if (body.tags !== undefined && !Array.isArray(body.tags)) {
    throw new InvariantError("tags must be an array");
  }

  // Validate event_id if provided
  if (
    body.event_id !== undefined &&
    body.event_id !== null &&
    typeof body.event_id !== "string"
  ) {
    throw new InvariantError("event_id must be a string or null");
  }
}

/**
 * Validate create command board request
 */
export function validateCreateCommandBoardRequest(
  data: unknown
): asserts data is CreateCommandBoardRequest {
  if (!data || typeof data !== "object") {
    throw new InvariantError("Request body is required");
  }

  const body = data as CreateCommandBoardRequest;

  // Required fields
  if (!body.name || typeof body.name !== "string") {
    throw new InvariantError("name is required and must be a string");
  }

  if (body.name.trim().length === 0) {
    throw new InvariantError("name cannot be empty");
  }

  // Validate status if provided
  if (body.status !== undefined) {
    validateBoardStatus(body.status);
  }

  // Validate is_template if provided
  if (body.is_template !== undefined && typeof body.is_template !== "boolean") {
    throw new InvariantError("is_template must be a boolean");
  }

  // Validate tags is array if provided
  if (body.tags !== undefined && !Array.isArray(body.tags)) {
    throw new InvariantError("tags must be an array");
  }

  // Validate event_id if provided
  if (body.event_id !== undefined && typeof body.event_id !== "string") {
    throw new InvariantError("event_id must be a string");
  }

  // Validate description if provided
  if (body.description !== undefined && typeof body.description !== "string") {
    throw new InvariantError("description must be a string");
  }
}
