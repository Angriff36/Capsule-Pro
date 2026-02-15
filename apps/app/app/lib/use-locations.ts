import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/app/lib/api";

/**
 * Tenant Locations Client API Functions
 *
 * Client-side functions for interacting with tenant locations API.
 */

// ============================================================================
// Type Definitions
// ============================================================================

export interface TenantLocation {
  id: string;
  name: string;
  address_line_1: string | null;
  address_line_2: string | null;
  city: string | null;
  state_province: string | null;
  postal_code: string | null;
  country_code: string | null;
  timezone: string | null;
  is_primary: boolean;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface LocationsResponse {
  locations: TenantLocation[];
}

// ============================================================================
// Locations API
// ============================================================================

/**
 * List all tenant locations
 */
export async function listLocations(
  isActive?: boolean
): Promise<LocationsResponse> {
  const params = new URLSearchParams();
  if (isActive !== undefined) {
    params.set("isActive", isActive.toString());
  }

  const queryString = params.toString();
  const url = `/api/locations${queryString ? `?${queryString}` : ""}`;

  const response = await apiFetch(url);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to fetch locations");
  }

  return response.json();
}

// ============================================================================
// React Query Hooks
// ============================================================================

/**
 * Hook for fetching tenant locations
 */
export function useLocations(options?: {
  isActive?: boolean;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: ["locations", options?.isActive],
    queryFn: () => listLocations(options?.isActive),
    enabled: options?.enabled ?? true,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
