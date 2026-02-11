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
  includeInactive?: boolean;
  accountType?: AccountType;
  parentId?: string;
  search?: string;
}

/**
 * Create Chart of Account request
 */
export interface CreateAccountRequest {
  accountNumber: string;
  accountName: string;
  accountType: AccountType;
  parentId?: string;
  description?: string;
}

/**
 * Update Chart of Account request
 */
export interface UpdateAccountRequest {
  accountNumber?: string;
  accountName?: string;
  accountType?: AccountType;
  parentId?: string;
  description?: string;
  isActive?: boolean;
}

/**
 * Chart of Account response
 */
export interface AccountResponse {
  tenantId: string;
  id: string;
  accountNumber: string;
  accountName: string;
  accountType: AccountType;
  parentId: string | null;
  isActive: boolean;
  description: string | null;
  createdAt: Date;
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
  message: string;
  field?: string;
}
