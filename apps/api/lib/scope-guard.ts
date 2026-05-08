import { API_SCOPES } from "./api-scopes";

interface ScopeRule {
  prefix: string;
  read: string;
  write: string;
}

interface FixedScopeRule {
  prefix: string;
  scope: string;
}

const DOMAIN_SCOPES: ScopeRule[] = [
  {
    prefix: "/api/events",
    read: API_SCOPES.EVENTS_READ,
    write: API_SCOPES.EVENTS_WRITE,
  },
  {
    prefix: "/api/kitchen",
    read: API_SCOPES.KITCHEN_READ,
    write: API_SCOPES.KITCHEN_WRITE,
  },
  {
    prefix: "/api/inventory",
    read: API_SCOPES.INVENTORY_READ,
    write: API_SCOPES.INVENTORY_WRITE,
  },
  {
    prefix: "/api/staff",
    read: API_SCOPES.STAFF_READ,
    write: API_SCOPES.STAFF_WRITE,
  },
  {
    prefix: "/api/staffing",
    read: API_SCOPES.STAFF_READ,
    write: API_SCOPES.STAFF_WRITE,
  },
  {
    prefix: "/api/schedule",
    read: API_SCOPES.STAFF_READ,
    write: API_SCOPES.STAFF_WRITE,
  },
  {
    prefix: "/api/crm",
    read: API_SCOPES.CRM_READ,
    write: API_SCOPES.CRM_WRITE,
  },
  {
    prefix: "/api/client",
    read: API_SCOPES.CRM_READ,
    write: API_SCOPES.CRM_WRITE,
  },
  {
    prefix: "/api/accounting",
    read: API_SCOPES.FINANCE_READ,
    write: API_SCOPES.FINANCE_WRITE,
  },
  {
    prefix: "/api/payroll",
    read: API_SCOPES.FINANCE_READ,
    write: API_SCOPES.FINANCE_WRITE,
  },
  {
    prefix: "/api/logistics",
    read: API_SCOPES.INVENTORY_READ,
    write: API_SCOPES.INVENTORY_WRITE,
  },
  {
    prefix: "/api/communications",
    read: API_SCOPES.EVENTS_READ,
    write: API_SCOPES.EVENTS_WRITE,
  },
  {
    prefix: "/api/collaboration",
    read: API_SCOPES.EVENTS_READ,
    write: API_SCOPES.EVENTS_WRITE,
  },
  {
    prefix: "/api/dish",
    read: API_SCOPES.KITCHEN_READ,
    write: API_SCOPES.KITCHEN_WRITE,
  },
  {
    prefix: "/api/recipe",
    read: API_SCOPES.KITCHEN_READ,
    write: API_SCOPES.KITCHEN_WRITE,
  },
  {
    prefix: "/api/menu",
    read: API_SCOPES.KITCHEN_READ,
    write: API_SCOPES.KITCHEN_WRITE,
  },
  {
    prefix: "/api/documents",
    read: API_SCOPES.EVENTS_READ,
    write: API_SCOPES.EVENTS_WRITE,
  },
  {
    prefix: "/api/proposals",
    read: API_SCOPES.EVENTS_READ,
    write: API_SCOPES.EVENTS_WRITE,
  },
];

const FIXED_SCOPES: FixedScopeRule[] = [
  { prefix: "/api/settings", scope: API_SCOPES.ADMIN },
  { prefix: "/api/integrations", scope: API_SCOPES.ADMIN },
  { prefix: "/api/analytics", scope: API_SCOPES.EVENTS_READ },
  { prefix: "/api/reports", scope: API_SCOPES.EVENTS_READ },
  { prefix: "/api/user-preferences", scope: API_SCOPES.EVENTS_READ },
];

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Maps an API route pathname and HTTP method to the required API key scope.
 * Returns null for routes that don't require a specific scope — any valid key works.
 *
 * Session (Clerk) auth is never scoped — only API key requests are checked.
 */
export function getRequiredScope(
  pathname: string,
  method: string
): string | null {
  for (const rule of DOMAIN_SCOPES) {
    if (pathname.startsWith(rule.prefix)) {
      return WRITE_METHODS.has(method.toUpperCase()) ? rule.write : rule.read;
    }
  }

  for (const rule of FIXED_SCOPES) {
    if (pathname.startsWith(rule.prefix)) {
      return rule.scope;
    }
  }

  return null;
}
