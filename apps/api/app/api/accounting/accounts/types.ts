/**
 * Chart of Accounts API Types
 *
 * TypeScript types for Chart of Accounts CRUD operations
 */

import type { AccountType } from "@repo/database";

/**
 * Chart of Account list filters
 */
export interface AccountListFilters {
  accountType?: AccountType;
  includeInactive?: boolean;
  parentId?: string;
  search?: string;
}

/**
 * Create Chart of Account request
 */
export interface CreateAccountRequest {
  accountName: string;
  accountNumber: string;
  accountType: AccountType;
  description?: string;
  parentId?: string;
}

/**
 * Update Chart of Account request
 */
export interface UpdateAccountRequest {
  accountName?: string;
  accountNumber?: string;
  accountType?: AccountType;
  description?: string;
  isActive?: boolean;
  parentId?: string;
}

/**
 * Chart of Account response
 */
export interface AccountResponse {
  accountName: string;
  accountNumber: string;
  accountType: AccountType;
  createdAt: Date;
  description: string | null;
  id: string;
  isActive: boolean;
  parentId: string | null;
  tenantId: string;
  updatedAt: Date;
}

/**
 * Chart of Account with children (hierarchical view)
 */
export interface AccountWithChildren extends AccountResponse {
  children: AccountWithChildren[];
}

/**
 * Account validation error response
 */
export interface AccountErrorResponse {
  field?: string;
  message: string;
}
