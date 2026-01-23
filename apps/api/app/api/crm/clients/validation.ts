/**
 * Client CRUD Validation Helpers
 *
 * Validation functions using invariant() for client operations
 */

import { invariant } from "@/app/lib/invariant";
import type {
  ClientListFilters,
  CreateClientContactRequest,
  CreateClientInteractionRequest,
  CreateClientRequest,
  UpdateClientRequest,
} from "./types";

/**
 * Email validation regex
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validate email format
 */
export function validateEmail(email: string | undefined | null): boolean {
  if (!email) return true; // Email is optional
  return EMAIL_REGEX.test(email);
}

/**
 * Validate phone number format (basic check)
 */
export function validatePhone(phone: string | undefined | null): boolean {
  if (!phone) return true; // Phone is optional
  const cleaned = phone.replace(/[\s\-()+]/g, "");
  return cleaned.length >= 10 && /^\d+$/.test(cleaned);
}

/**
 * Validate create client request
 */
export function validateCreateClientRequest(
  body: unknown
): asserts body is CreateClientRequest {
  invariant(
    body && typeof body === "object",
    "Request body must be a valid object"
  );

  const data = body as Record<string, unknown>;

  // At least company name OR individual name is required
  invariant(
    data.company_name || (data.first_name && data.last_name),
    "Either company_name or both first_name and last_name are required"
  );

  // Validate email format if provided
  if (data.email && typeof data.email === "string") {
    invariant(validateEmail(data.email), "email must be a valid email address");
  }

  // Validate phone format if provided
  if (data.phone && typeof data.phone === "string") {
    invariant(validatePhone(data.phone), "phone must be a valid phone number");
  }

  // Validate tags is an array if provided
  if (data.tags !== undefined) {
    invariant(Array.isArray(data.tags), "tags must be an array");
  }

  // Validate defaultPaymentTerms is positive if provided
  if (data.defaultPaymentTerms !== undefined) {
    invariant(
      typeof data.defaultPaymentTerms === "number" &&
        data.defaultPaymentTerms > 0,
      "defaultPaymentTerms must be a positive number"
    );
  }

  // Validate clientType
  if (data.clientType !== undefined) {
    invariant(
      typeof data.clientType === "string" &&
        ["company", "individual"].includes(data.clientType),
      "clientType must be either 'company' or 'individual'"
    );
  }
}

/**
 * Validate update client request (more lenient)
 */
export function validateUpdateClientRequest(
  body: unknown
): asserts body is UpdateClientRequest {
  invariant(
    body && typeof body === "object",
    "Request body must be a valid object"
  );

  const data = body as Record<string, unknown>;

  // Validate email format if provided
  if (data.email && typeof data.email === "string") {
    invariant(validateEmail(data.email), "email must be a valid email address");
  }

  // Validate phone format if provided
  if (data.phone && typeof data.phone === "string") {
    invariant(validatePhone(data.phone), "phone must be a valid phone number");
  }

  // Validate tags is an array if provided
  if (data.tags !== undefined) {
    invariant(Array.isArray(data.tags), "tags must be an array");
  }

  // Validate clientType if provided
  if (data.clientType !== undefined) {
    invariant(
      typeof data.clientType === "string" &&
        ["company", "individual"].includes(data.clientType),
      "clientType must be either 'company' or 'individual'"
    );
  }
}

/**
 * Validate create client contact request
 */
export function validateCreateClientContactRequest(
  body: unknown
): asserts body is CreateClientContactRequest {
  invariant(
    body && typeof body === "object",
    "Request body must be a valid object"
  );

  const data = body as Record<string, unknown>;

  invariant(
    typeof data.first_name === "string" && data.first_name.trim().length > 0,
    "first_name is required and must not be empty"
  );

  invariant(
    typeof data.last_name === "string" && data.last_name.trim().length > 0,
    "last_name is required and must not be empty"
  );

  // Validate email format if provided
  if (data.email && typeof data.email === "string") {
    invariant(validateEmail(data.email), "email must be a valid email address");
  }

  // Validate phone format if provided
  if (data.phone && typeof data.phone === "string") {
    invariant(validatePhone(data.phone), "phone must be a valid phone number");
  }
}

/**
 * Validate create client interaction request
 */
export function validateCreateClientInteractionRequest(
  body: unknown
): asserts body is CreateClientInteractionRequest {
  invariant(
    body && typeof body === "object",
    "Request body must be a valid object"
  );

  const data = body as Record<string, unknown>;

  invariant(
    typeof data.interactionType === "string" &&
      data.interactionType.trim().length > 0,
    "interactionType is required and must not be empty"
  );

  // Validate followUpDate format if provided
  if (data.followUpDate && typeof data.followUpDate === "string") {
    const date = new Date(data.followUpDate);
    invariant(
      !Number.isNaN(date.getTime()),
      "followUpDate must be a valid ISO date string"
    );
  }
}

/**
 * Parse and validate list filters
 */
export function parseClientListFilters(
  searchParams: URLSearchParams
): ClientListFilters {
  const filters: ClientListFilters = {};

  const search = searchParams.get("search");
  if (search) {
    invariant(
      typeof search === "string" && search.length > 0,
      "search must be a non-empty string"
    );
    filters.search = search;
  }

  const tags = searchParams.get("tags");
  if (tags) {
    try {
      const parsed = JSON.parse(tags);
      invariant(Array.isArray(parsed), "tags must be a valid JSON array");
      filters.tags = parsed;
    } catch {
      throw new Error("tags must be a valid JSON array");
    }
  }

  const assignedTo = searchParams.get("assignedTo");
  if (assignedTo) {
    invariant(
      typeof assignedTo === "string" && assignedTo.length > 0,
      "assignedTo must be a non-empty string"
    );
    filters.assignedTo = assignedTo;
  }

  const clientType = searchParams.get("clientType");
  if (clientType) {
    invariant(
      ["company", "individual"].includes(clientType),
      "clientType must be either 'company' or 'individual'"
    );
    filters.clientType = clientType as "company" | "individual";
  }

  const source = searchParams.get("source");
  if (source) {
    invariant(
      typeof source === "string" && source.length > 0,
      "source must be a non-empty string"
    );
    filters.source = source;
  }

  return filters;
}

/**
 * Parse pagination parameters
 */
export function parsePaginationParams(searchParams: URLSearchParams): {
  page: number;
  limit: number;
} {
  const page = Number.parseInt(searchParams.get("page") || "1", 10);
  const limit = Number.parseInt(searchParams.get("limit") || "50", 10);

  invariant(!Number.isNaN(page) && page > 0, "page must be a positive integer");

  invariant(
    !Number.isNaN(limit) && limit > 0 && limit <= 100,
    "limit must be a positive integer (max 100)"
  );

  return { page, limit };
}
