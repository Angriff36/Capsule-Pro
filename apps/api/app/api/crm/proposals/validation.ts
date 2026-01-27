/**
 * Proposal Validation Helpers
 */

import { invariant } from "@/app/lib/invariant";
import type {
  CreateLineItemRequest,
  CreateProposalRequest,
  ProposalFilters,
  SendProposalRequest,
} from "./types";

/**
 * Email validation regex (defined at top level for performance)
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const VALID_STATUSES = [
  "draft",
  "sent",
  "viewed",
  "accepted",
  "rejected",
  "expired",
];

export function parseProposalFilters(
  searchParams: URLSearchParams
): ProposalFilters {
  const filters: ProposalFilters = {
    search: searchParams.get("search") || undefined,
    status: searchParams.get("status") || undefined,
    clientId: searchParams.get("clientId") || undefined,
    leadId: searchParams.get("leadId") || undefined,
    eventId: searchParams.get("eventId") || undefined,
    dateFrom: searchParams.get("dateFrom") || undefined,
    dateTo: searchParams.get("dateTo") || undefined,
  };

  if (filters.status && !VALID_STATUSES.includes(filters.status)) {
    invariant(
      false,
      `Invalid status: ${filters.status}. Must be one of: ${VALID_STATUSES.join(", ")}`
    );
  }

  return filters;
}

export function parsePaginationParams(searchParams: URLSearchParams) {
  const page = Math.max(1, Number(searchParams.get("page") || "1"));
  const limit = Math.min(
    100,
    Math.max(1, Number(searchParams.get("limit") || "50"))
  );

  return { page, limit };
}

/**
 * Validate required title field
 */
function validateTitle(data: Record<string, unknown>) {
  invariant(
    typeof data.title === "string" && data.title.trim().length > 0,
    "title is required and must be a non-empty string"
  );
}

/**
 * Validate optional string ID fields
 */
function validateIdFields(data: Record<string, unknown>) {
  if (data.clientId !== undefined && data.clientId !== null) {
    invariant(
      typeof data.clientId === "string" && data.clientId.trim().length > 0,
      "clientId must be a string"
    );
  }

  if (data.leadId !== undefined && data.leadId !== null) {
    invariant(
      typeof data.leadId === "string" && data.leadId.trim().length > 0,
      "leadId must be a string"
    );
  }

  if (data.eventId !== undefined && data.eventId !== null) {
    invariant(
      typeof data.eventId === "string" && data.eventId.trim().length > 0,
      "eventId must be a string"
    );
  }
}

/**
 * Validate that at least one reference is provided
 */
function validateAtLeastOneReference(data: Record<string, unknown>) {
  const hasClient = !!data.clientId;
  const hasLead = !!data.leadId;
  const hasEvent = !!data.eventId;

  invariant(
    hasClient || hasLead || hasEvent,
    "At least one of clientId, leadId, or eventId must be provided"
  );
}

/**
 * Validate optional date fields
 */
function validateDateFields(data: Record<string, unknown>) {
  if (data.eventDate !== undefined && data.eventDate !== null) {
    invariant(
      typeof data.eventDate === "string" || data.eventDate instanceof Date,
      "eventDate must be a string or Date"
    );
  }

  if (data.validUntil !== undefined && data.validUntil !== null) {
    invariant(
      typeof data.validUntil === "string" || data.validUntil instanceof Date,
      "validUntil must be a string or Date"
    );
  }
}

/**
 * Validate optional numeric fields
 */
function validateNumericFields(data: Record<string, unknown>) {
  if (data.guestCount !== undefined && data.guestCount !== null) {
    invariant(
      typeof data.guestCount === "number" && data.guestCount >= 0,
      "guestCount must be a non-negative number"
    );
  }

  if (data.subtotal !== undefined && data.subtotal !== null) {
    invariant(
      typeof data.subtotal === "number" && data.subtotal >= 0,
      "subtotal must be a non-negative number"
    );
  }

  if (data.taxRate !== undefined && data.taxRate !== null) {
    invariant(
      typeof data.taxRate === "number" && data.taxRate >= 0,
      "taxRate must be a non-negative number"
    );
  }

  if (data.total !== undefined && data.total !== null) {
    invariant(
      typeof data.total === "number" && data.total >= 0,
      "total must be a non-negative number"
    );
  }
}

/**
 * Validate optional status field
 */
function validateStatus(data: Record<string, unknown>) {
  if (data.status) {
    invariant(
      VALID_STATUSES.includes(data.status as string),
      `Invalid status: ${data.status}. Must be one of: ${VALID_STATUSES.join(", ")}`
    );
  }
}

/**
 * Validate line items array
 */
function validateLineItems(data: Record<string, unknown>) {
  if (data.lineItems !== undefined && data.lineItems !== null) {
    invariant(Array.isArray(data.lineItems), "lineItems must be an array");
    for (const item of data.lineItems) {
      validateLineItem(item);
    }
  }
}

export function validateCreateProposalRequest(
  body: unknown
): asserts body is CreateProposalRequest {
  invariant(
    body && typeof body === "object",
    "Request body must be a valid object"
  );

  const data = body as Record<string, unknown>;

  validateTitle(data);
  validateIdFields(data);
  validateAtLeastOneReference(data);
  validateDateFields(data);
  validateNumericFields(data);
  validateStatus(data);
  validateLineItems(data);
}

export function validateUpdateProposalRequest(
  body: unknown
): asserts body is { id: string } & Partial<CreateProposalRequest> {
  invariant(
    body && typeof body === "object",
    "Request body must be a valid object"
  );

  const data = body as Record<string, unknown>;

  invariant(
    typeof data.id === "string" && data.id.trim().length > 0,
    "id is required and must be a non-empty string"
  );

  validateCreateProposalRequest(data);
}

export function validateLineItem(
  body: unknown
): asserts body is CreateLineItemRequest {
  invariant(
    body && typeof body === "object",
    "Line item must be a valid object"
  );

  const item = body as Record<string, unknown>;

  invariant(
    typeof item.itemType === "string" && item.itemType.trim().length > 0,
    "itemType is required and must be a non-empty string"
  );

  invariant(
    typeof item.description === "string" && item.description.trim().length > 0,
    "description is required and must be a non-empty string"
  );

  invariant(
    typeof item.quantity === "number" && item.quantity >= 0,
    "quantity must be a non-negative number"
  );

  invariant(
    typeof item.unitPrice === "number" && item.unitPrice >= 0,
    "unitPrice must be a non-negative number"
  );

  if (item.total !== undefined && item.total !== null) {
    invariant(
      typeof item.total === "number" && item.total >= 0,
      "total must be a non-negative number"
    );
  }
}

export function validateSendProposalRequest(
  body: unknown
): asserts body is SendProposalRequest {
  invariant(
    body && typeof body === "object",
    "Request body must be a valid object"
  );

  const data = body as Record<string, unknown>;

  if (data.recipientEmail !== undefined && data.recipientEmail !== null) {
    invariant(
      typeof data.recipientEmail === "string" &&
        EMAIL_REGEX.test(data.recipientEmail.trim()),
      "recipientEmail must be a valid email address"
    );
  }

  if (data.message !== undefined && data.message !== null) {
    invariant(typeof data.message === "string", "message must be a string");
  }
}
