/**
 * API Key Scope Constants
 *
 * Canonical list of scopes that can be assigned to API keys.
 * Used for validation on key creation and scope enforcement at runtime.
 */

export const API_SCOPES = {
  EVENTS_READ: "read:events",
  EVENTS_WRITE: "write:events",
  KITCHEN_READ: "read:kitchen",
  KITCHEN_WRITE: "write:kitchen",
  INVENTORY_READ: "read:inventory",
  INVENTORY_WRITE: "write:inventory",
  STAFF_READ: "read:staff",
  STAFF_WRITE: "write:staff",
  CRM_READ: "read:crm",
  CRM_WRITE: "write:crm",
  FINANCE_READ: "read:finance",
  FINANCE_WRITE: "write:finance",
  ADMIN: "admin",
} as const;

export type ApiScope = (typeof API_SCOPES)[keyof typeof API_SCOPES];

export const VALID_SCOPES: readonly string[] = Object.values(API_SCOPES);
