import "server-only";

import { database } from "@repo/database";

/**
 * Location context utilities for multi-location support
 *
 * These functions help manage location-scoped operations across the application,
 * following the same patterns as tenant.ts for consistency.
 */

export interface LocationInfo {
  id: string;
  tenantId: string;
  name: string;
  isPrimary: boolean;
  isActive: boolean;
}

/**
 * Get all active locations for a tenant
 */
export const getLocationsForTenant = async (
  tenantId: string
): Promise<LocationInfo[]> => {
  return database.location.findMany({
    where: {
      tenantId,
      deletedAt: null,
      isActive: true,
    },
    select: {
      id: true,
      tenantId: true,
      name: true,
      isPrimary: true,
      isActive: true,
    },
    orderBy: [{ isPrimary: "desc" }, { name: "asc" }],
  }) as Promise<LocationInfo[]>;
};

/**
 * Get the primary location for a tenant
 */
export const getPrimaryLocationForTenant = async (
  tenantId: string
): Promise<LocationInfo | null> => {
  const location = await database.location.findFirst({
    where: {
      tenantId,
      deletedAt: null,
      isActive: true,
      isPrimary: true,
    },
    select: {
      id: true,
      tenantId: true,
      name: true,
      isPrimary: true,
      isActive: true,
    },
  });

  return location as LocationInfo | null;
};

/**
 * Validate that a location belongs to the given tenant
 */
export const validateLocationForTenant = async (
  tenantId: string,
  locationId: string
): Promise<boolean> => {
  const location = await database.location.findFirst({
    where: {
      tenantId,
      id: locationId,
      deletedAt: null,
      isActive: true,
    },
    select: { id: true },
  });

  return location !== null;
};

/**
 * Get a specific location by ID for a tenant
 */
export const getLocationForTenant = async (
  tenantId: string,
  locationId: string
): Promise<LocationInfo | null> => {
  const location = await database.location.findFirst({
    where: {
      tenantId,
      id: locationId,
      deletedAt: null,
    },
    select: {
      id: true,
      tenantId: true,
      name: true,
      isPrimary: true,
      isActive: true,
    },
  });

  return location as LocationInfo | null;
};

/**
 * Build a location-scoped where clause for queries
 * This extends the standard tenant scoping with optional location filtering
 */
export const buildLocationScopedWhere = <T extends Record<string, unknown>>(
  baseWhere: T,
  locationId?: string | null
): T => {
  if (!locationId) {
    return baseWhere;
  }

  const whereClause = { ...baseWhere };
  if ("AND" in whereClause && Array.isArray(whereClause.AND)) {
    (whereClause.AND as Array<Record<string, unknown>>).push({
      locationId,
    });
  } else {
    (whereClause as Record<string, unknown>).locationId = locationId;
  }

  return whereClause;
};

/**
 * Get default location for a user's current session
 * This combines user preferences with tenant's primary location
 */
export const getDefaultLocationForSession = async (
  tenantId: string,
  userId?: string
): Promise<string | null> => {
  // If user has a preference, use that
  if (userId) {
    const userPreference = await database.userPreference.findFirst({
      where: {
        tenantId,
        userId,
        key: "defaultLocationId",
      },
      select: { value: true },
    });

    if (userPreference?.value) {
      const locationId = JSON.parse(userPreference.value) as string;
      const isValid = await validateLocationForTenant(tenantId, locationId);
      if (isValid) {
        return locationId;
      }
    }
  }

  // Fall back to tenant's primary location
  const primaryLocation = await getPrimaryLocationForTenant(tenantId);
  return primaryLocation?.id ?? null;
};
