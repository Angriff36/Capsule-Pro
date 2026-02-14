/**
 * Chart of Accounts Validation Helpers
 *
 * Validation functions using invariant() for account operations
 */

import type { AccountType } from "@repo/database";
import { invariant } from "@/app/lib/invariant";
import type {
  AccountListFilters,
  CreateAccountRequest,
  UpdateAccountRequest,
} from "./types";

/**
 * Valid account types
 */
const VALID_ACCOUNT_TYPES = [
  "ASSET",
  "LIABILITY",
  "EQUITY",
  "REVENUE",
  "EXPENSE",
];

/**
 * Regex for account number validation (alphanumeric with optional hyphens)
 */
const ACCOUNT_NUMBER_REGEX = /^[A-Z0-9-]+$/i;

/**
 * Validate account number format (alphanumeric with optional hyphens/underscores)
 */
function validateAccountNumber(accountNumber: string): boolean {
  return ACCOUNT_NUMBER_REGEX.test(accountNumber);
}

/**
 * Validate create account request
 */
export function validateCreateAccountRequest(
  body: unknown
): asserts body is CreateAccountRequest {
  invariant(
    body && typeof body === "object",
    "Request body must be a valid object"
  );

  const data = body as Record<string, unknown>;

  // accountNumber is required
  invariant(
    typeof data.accountNumber === "string" &&
      data.accountNumber.trim().length > 0,
    "accountNumber is required and must not be empty"
  );

  // Validate account number format
  invariant(
    validateAccountNumber(data.accountNumber.trim()),
    "accountNumber must contain only letters, numbers, and hyphens"
  );

  // accountName is required
  invariant(
    typeof data.accountName === "string" && data.accountName.trim().length > 0,
    "accountName is required and must not be empty"
  );

  // accountType is required
  invariant(
    typeof data.accountType === "string" &&
      VALID_ACCOUNT_TYPES.includes(data.accountType),
    `accountType must be one of: ${VALID_ACCOUNT_TYPES.join(", ")}`
  );

  // parentId if provided must be a string
  if (data.parentId !== undefined && data.parentId !== null) {
    invariant(
      typeof data.parentId === "string" && data.parentId.trim().length > 0,
      "parentId must be a valid UUID string"
    );
  }

  // description if provided must be a string
  if (data.description !== undefined) {
    invariant(
      typeof data.description === "string" || data.description === null,
      "description must be a string or null"
    );
  }
}

/**
 * Validate update account request (more lenient)
 */
export function validateUpdateAccountRequest(
  body: unknown
): asserts body is UpdateAccountRequest {
  invariant(
    body && typeof body === "object",
    "Request body must be a valid object"
  );

  const data = body as Record<string, unknown>;

  // accountNumber if provided must be a valid format
  if (data.accountNumber !== undefined) {
    invariant(
      typeof data.accountNumber === "string" &&
        data.accountNumber.trim().length > 0,
      "accountNumber must not be empty"
    );
    invariant(
      validateAccountNumber(data.accountNumber.trim()),
      "accountNumber must contain only letters, numbers, and hyphens"
    );
  }

  // accountName if provided must be a non-empty string
  if (data.accountName !== undefined) {
    invariant(
      typeof data.accountName === "string" &&
        data.accountName.trim().length > 0,
      "accountName must not be empty"
    );
  }

  // accountType if provided must be valid
  if (data.accountType !== undefined) {
    invariant(
      typeof data.accountType === "string" &&
        VALID_ACCOUNT_TYPES.includes(data.accountType),
      `accountType must be one of: ${VALID_ACCOUNT_TYPES.join(", ")}`
    );
  }

  // parentId if provided must be a string or null
  if (data.parentId !== undefined) {
    invariant(
      (typeof data.parentId === "string" && data.parentId.trim().length > 0) ||
        data.parentId === null,
      "parentId must be a valid UUID string or null"
    );
  }

  // description if provided must be a string or null
  if (data.description !== undefined) {
    invariant(
      typeof data.description === "string" || data.description === null,
      "description must be a string or null"
    );
  }

  // isActive if provided must be boolean
  if (data.isActive !== undefined) {
    invariant(typeof data.isActive === "boolean", "isActive must be a boolean");
  }

  // At least one field must be provided
  const hasData =
    data.accountNumber !== undefined ||
    data.accountName !== undefined ||
    data.accountType !== undefined ||
    data.parentId !== undefined ||
    data.description !== undefined ||
    data.isActive !== undefined;

  invariant(hasData, "At least one field must be provided for update");
}

/**
 * Parse and validate list filters
 */
export function parseAccountListFilters(
  searchParams: URLSearchParams
): AccountListFilters {
  const filters: AccountListFilters = {};

  const includeInactive = searchParams.get("includeInactive");
  if (includeInactive) {
    invariant(
      includeInactive === "true" || includeInactive === "false",
      "includeInactive must be a boolean"
    );
    filters.includeInactive = includeInactive === "true";
  }

  const accountType = searchParams.get("accountType");
  if (accountType) {
    invariant(
      VALID_ACCOUNT_TYPES.includes(accountType),
      `accountType must be one of: ${VALID_ACCOUNT_TYPES.join(", ")}`
    );
    filters.accountType = accountType as AccountType;
  }

  const parentId = searchParams.get("parentId");
  if (parentId) {
    invariant(
      typeof parentId === "string" && parentId.trim().length > 0,
      "parentId must be a valid UUID string"
    );
    filters.parentId = parentId;
  }

  const search = searchParams.get("search");
  if (search) {
    invariant(
      typeof search === "string" && search.length > 0,
      "search must be a non-empty string"
    );
    filters.search = search;
  }

  return filters;
}
