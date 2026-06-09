"use client";

import {
  listChartOfAccounts as _listChartOfAccounts,
  getChartOfAccount as _getChartOfAccount,
  chartOfAccountCreate,
  chartOfAccountUpdate,
} from "@/app/lib/manifest-client.generated";
import type { ChartOfAccount as GeneratedChartOfAccount } from "@/app/lib/manifest-types.generated";

/**
 * @module chart-of-accounts
 * @intent Client-side functions for Chart of Accounts operations
 * @responsibility Provide TypeScript types and API functions for managing chart of accounts
 * @domain Accounting
 * @tags chart-of-accounts, accounting
 * @canonical true
 */

// Account type constants
export const ACCOUNT_TYPES = [
  "ASSET",
  "LIABILITY",
  "EQUITY",
  "REVENUE",
  "EXPENSE",
] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

// Chart of Account types matching the Prisma schema
export interface ChartOfAccount {
  id: string;
  tenant_id: string;
  account_number: string;
  account_name: string;
  account_type: AccountType;
  parent_id: string | null;
  is_active: boolean;
  description: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface ChartOfAccountWithParent extends ChartOfAccount {
  parent_account_name: string | null;
}

// Request/Response types
export interface CreateChartOfAccountRequest {
  account_number: string;
  account_name: string;
  account_type: AccountType;
  parent_id?: string;
  description?: string;
  is_active?: boolean;
}

export interface UpdateChartOfAccountRequest {
  account_number?: string;
  account_name?: string;
  account_type?: AccountType;
  parent_id?: string | null;
  description?: string;
  is_active?: boolean;
}

export interface ChartOfAccountsListResponse {
  data: ChartOfAccountWithParent[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ChartOfAccountsFilters {
  search?: string;
  account_type?: AccountType;
  include_inactive?: boolean;
  page?: number;
  limit?: number;
}

// API Functions

/**
 * List chart of accounts with pagination and filters
 */
export async function listChartOfAccounts(
  params: ChartOfAccountsFilters = {}
): Promise<ChartOfAccountsListResponse> {
  const query: Record<string, string | number> = {};
  if (params.search) query.search = params.search;
  if (params.account_type) query.account_type = params.account_type;
  if (params.include_inactive) query.include_inactive = "true";
  query.page = params.page ?? 1;
  query.limit = params.limit ?? 50;

  return _listChartOfAccounts(query) as unknown as Promise<ChartOfAccountsListResponse>;
}

/**
 * Get a single chart of account by ID
 */
export async function getChartOfAccount(
  id: string
): Promise<ChartOfAccountWithParent> {
  const result = await _getChartOfAccount(id);
  if (!result) throw new Error("Failed to fetch chart of account");
  return result as unknown as ChartOfAccountWithParent;
}

/**
 * Create a new chart of account
 */
export async function createChartOfAccount(
  data: CreateChartOfAccountRequest
): Promise<GeneratedChartOfAccount> {
  const result = await chartOfAccountCreate({
    accountNumber: data.account_number,
    accountName: data.account_name,
    accountType: data.account_type,
    parentId: data.parent_id,
    description: data.description,
  });
  if (!result) throw new Error("Failed to create chart of account");
  return result;
}

/**
 * Update an existing chart of account
 */
export async function updateChartOfAccount(
  id: string,
  data: UpdateChartOfAccountRequest
): Promise<GeneratedChartOfAccount> {
  const result = await chartOfAccountUpdate({
    id,
    accountNumber: data.account_number,
    accountName: data.account_name,
    accountType: data.account_type,
    parentId: data.parent_id ?? undefined,
    description: data.description,
    isActive: data.is_active,
  });
  if (!result) throw new Error("Failed to update chart of account");
  return result;
}

// NOTE: Keeping apiFetch for delete — no generated chartOfAccountRemove/softDelete exists
import { apiFetch } from "@/app/lib/api";

/**
 * Delete a chart of account
 */
export async function deleteChartOfAccount(id: string): Promise<void> {
  const response = await apiFetch(`/api/accounting/accounts/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to delete chart of account");
  }
}

/**
 * Deactivate a chart of account
 */
export async function deactivateChartOfAccount(
  id: string
): Promise<GeneratedChartOfAccount> {
  return updateChartOfAccount(id, { is_active: false });
}

/**
 * Helper functions
 */

/**
 * Get display label for account type
 */
export function getAccountTypeLabel(type: AccountType): string {
  const labels: Record<AccountType, string> = {
    ASSET: "Asset",
    LIABILITY: "Liability",
    EQUITY: "Equity",
    REVENUE: "Revenue",
    EXPENSE: "Expense",
  };
  return labels[type] ?? type;
}

/**
 * Get color class for account type badge
 */
export function getAccountTypeColor(type: AccountType): string {
  const colors: Record<AccountType, string> = {
    ASSET: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    LIABILITY: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    EQUITY:
      "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    REVENUE:
      "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    EXPENSE:
      "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  };
  return (
    colors[type] ??
    "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
  );
}

/**
 * Get badge variant for account type
 */
export function getAccountTypeVariant(
  _type: AccountType
): "default" | "secondary" | "outline" {
  return "outline";
}
