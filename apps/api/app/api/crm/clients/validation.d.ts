/**
 * Client CRUD Validation Helpers
 *
 * Validation functions using invariant() for client operations
 */
import type {
  ClientListFilters,
  CreateClientContactRequest,
  CreateClientInteractionRequest,
  CreateClientRequest,
  UpdateClientInteractionRequest,
  UpdateClientRequest,
} from "./types";
/**
 * Validate email format
 */
export declare function validateEmail(
  email: string | undefined | null
): boolean;
/**
 * Validate phone number format (basic check)
 */
export declare function validatePhone(
  phone: string | undefined | null
): boolean;
/**
 * Validate create client request
 */
export declare function validateCreateClientRequest(
  body: unknown
): asserts body is CreateClientRequest;
/**
 * Validate update client request (more lenient)
 */
export declare function validateUpdateClientRequest(
  body: unknown
): asserts body is UpdateClientRequest;
/**
 * Validate create client contact request
 */
export declare function validateCreateClientContactRequest(
  body: unknown
): asserts body is CreateClientContactRequest;
/**
 * Validate create client interaction request
 */
export declare function validateCreateClientInteractionRequest(
  body: unknown
): asserts body is CreateClientInteractionRequest;
/**
 * Parse and validate list filters
 */
export declare function parseClientListFilters(
  searchParams: URLSearchParams
): ClientListFilters;
/**
 * Parse pagination parameters
 */
export declare function parsePaginationParams(searchParams: URLSearchParams): {
  page: number;
  limit: number;
};
/**
 * Validate update client interaction request (more lenient - all optional)
 */
export declare function validateUpdateClientInteractionRequest(
  body: unknown
): asserts body is UpdateClientInteractionRequest;
//# sourceMappingURL=validation.d.ts.map
