"use server";

/**
 * Venue CRUD Server Actions
 *
 * Server actions for venue management operations
 */

import { auth } from "@repo/auth/server";
import type { Event, Venue } from "@repo/database";
import { database } from "@repo/database";
import { revalidatePath } from "next/cache";
import { invariant } from "@/app/lib/invariant";
import { getTenantId } from "@/app/lib/tenant";

// Types
export type VenueType =
  | "banquet_hall"
  | "outdoor"
  | "restaurant"
  | "hotel"
  | "private_home"
  | "corporate"
  | "other";

export interface VenueFilters {
  search?: string;
  tags?: string[];
  venueType?: VenueType;
  city?: string;
  isActive?: boolean;
  minCapacity?: number;
}

export interface CreateVenueInput {
  name: string;
  venueType?: VenueType;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  stateProvince?: string;
  postalCode?: string;
  countryCode?: string;
  capacity?: number;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  equipmentList?: unknown;
  preferredVendors?: unknown;
  accessNotes?: string;
  cateringNotes?: string;
  layoutImageUrl?: string;
  isActive?: boolean;
  tags?: string[];
}

/**
 * Get list of venues with filters and pagination
 */
export async function getVenues(
  filters: VenueFilters = {},
  page = 1,
  limit = 50
) {
  const { orgId } = await auth();
  invariant(orgId, "Unauthorized");

  const tenantId = await getTenantId();

  const whereClause: Record<string, unknown> = {
    AND: [{ tenantId }, { deletedAt: null }],
  };

  // Add search filter
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    (whereClause.AND as Record<string, unknown>[]).push({
      OR: [
        { name: { contains: searchLower, mode: "insensitive" } },
        { city: { contains: searchLower, mode: "insensitive" } },
        { contactName: { contains: searchLower, mode: "insensitive" } },
      ],
    });
  }

  // Add tag filter
  if (filters.tags && filters.tags.length > 0) {
    (whereClause.AND as Record<string, unknown>[]).push({
      tags: { hasSome: filters.tags },
    });
  }

  // Add venueType filter
  if (filters.venueType) {
    (whereClause.AND as Record<string, unknown>[]).push({
      venueType: filters.venueType,
    });
  }

  // Add city filter
  if (filters.city) {
    (whereClause.AND as Record<string, unknown>[]).push({
      city: { contains: filters.city, mode: "insensitive" },
    });
  }

  // Add isActive filter
  if (filters.isActive !== undefined) {
    (whereClause.AND as Record<string, unknown>[]).push({
      isActive: filters.isActive,
    });
  }

  // Add minCapacity filter
  if (filters.minCapacity !== undefined) {
    (whereClause.AND as Record<string, unknown>[]).push({
      capacity: { gte: filters.minCapacity },
    });
  }

  const offset = (page - 1) * limit;

  const venues = await database.venue.findMany({
    where: whereClause,
    orderBy: [{ createdAt: "desc" }],
    take: limit,
    skip: offset,
  });

  const totalCount = await database.venue.count({
    where: whereClause,
  });

  return {
    data: venues as Venue[],
    pagination: {
      page,
      limit,
      total: totalCount,
      totalPages: Math.ceil(totalCount / limit),
    },
  };
}

/**
 * Get venue count (for stats)
 */
export async function getVenueCount() {
  const { orgId } = await auth();
  invariant(orgId, "Unauthorized");

  const tenantId = await getTenantId();

  const count = await database.venue.count({
    where: {
      AND: [{ tenantId }, { deletedAt: null }],
    },
  });

  return count;
}

/**
 * Get venue by ID with full details
 */
export async function getVenueById(id: string) {
  const { orgId } = await auth();
  invariant(orgId, "Unauthorized");

  const tenantId = await getTenantId();
  invariant(id, "Venue ID is required");

  const venue = await database.venue.findFirst({
    where: {
      AND: [{ tenantId }, { id }, { deletedAt: null }],
    },
  });

  invariant(venue, "Venue not found");

  return venue as Venue;
}

/**
 * Get events for a venue (event history)
 */
export async function getVenueEvents(
  venueId: string,
  status?: string,
  limit = 50,
  offset = 0
) {
  const { orgId } = await auth();
  invariant(orgId, "Unauthorized");

  const tenantId = await getTenantId();
  invariant(venueId, "Venue ID is required");

  const whereClause: Record<string, unknown> = {
    AND: [{ tenantId }, { venueEntityId: venueId }, { deletedAt: null }],
  };

  if (status) {
    (whereClause.AND as Record<string, unknown>[]).push({ status });
  }

  const events = await database.event.findMany({
    where: whereClause,
    orderBy: [{ eventDate: "desc" }],
    take: limit,
    skip: offset,
  });

  return events as Event[];
}

/**
 * Create a new venue
 */
export async function createVenue(input: CreateVenueInput) {
  const { orgId } = await auth();
  invariant(orgId, "Unauthorized");

  const tenantId = await getTenantId();
  invariant(input.name, "Venue name is required");

  const venue = await database.venue.create({
    data: {
      tenantId,
      name: input.name,
      venueType: input.venueType ?? "other",
      addressLine1: input.addressLine1,
      addressLine2: input.addressLine2,
      city: input.city,
      stateProvince: input.stateProvince,
      postalCode: input.postalCode,
      countryCode: input.countryCode,
      capacity: input.capacity ?? 0,
      contactName: input.contactName,
      contactPhone: input.contactPhone,
      contactEmail: input.contactEmail,
      equipmentList: input.equipmentList ?? null,
      preferredVendors: input.preferredVendors ?? null,
      accessNotes: input.accessNotes,
      cateringNotes: input.cateringNotes,
      layoutImageUrl: input.layoutImageUrl,
      isActive: input.isActive ?? true,
      tags: input.tags ?? [],
    },
  });

  revalidatePath("/crm/venues");

  return venue as Venue;
}

/**
 * Update a venue
 */
export async function updateVenue(
  id: string,
  input: Partial<CreateVenueInput>
) {
  const { orgId } = await auth();
  invariant(orgId, "Unauthorized");

  const tenantId = await getTenantId();
  invariant(id, "Venue ID is required");

  // Verify venue exists and belongs to tenant
  const existing = await database.venue.findFirst({
    where: {
      AND: [{ tenantId }, { id }, { deletedAt: null }],
    },
  });

  invariant(existing, "Venue not found");

  const venue = await database.venue.update({
    where: {
      tenantId_id: { tenantId, id },
    },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.venueType !== undefined && { venueType: input.venueType }),
      ...(input.addressLine1 !== undefined && {
        addressLine1: input.addressLine1,
      }),
      ...(input.addressLine2 !== undefined && {
        addressLine2: input.addressLine2,
      }),
      ...(input.city !== undefined && { city: input.city }),
      ...(input.stateProvince !== undefined && {
        stateProvince: input.stateProvince,
      }),
      ...(input.postalCode !== undefined && { postalCode: input.postalCode }),
      ...(input.countryCode !== undefined && {
        countryCode: input.countryCode,
      }),
      ...(input.capacity !== undefined && { capacity: input.capacity }),
      ...(input.contactName !== undefined && {
        contactName: input.contactName,
      }),
      ...(input.contactPhone !== undefined && {
        contactPhone: input.contactPhone,
      }),
      ...(input.contactEmail !== undefined && {
        contactEmail: input.contactEmail,
      }),
      ...(input.equipmentList !== undefined && {
        equipmentList: input.equipmentList,
      }),
      ...(input.preferredVendors !== undefined && {
        preferredVendors: input.preferredVendors,
      }),
      ...(input.accessNotes !== undefined && {
        accessNotes: input.accessNotes,
      }),
      ...(input.cateringNotes !== undefined && {
        cateringNotes: input.cateringNotes,
      }),
      ...(input.layoutImageUrl !== undefined && {
        layoutImageUrl: input.layoutImageUrl,
      }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
      ...(input.tags !== undefined && { tags: input.tags }),
    },
  });

  revalidatePath("/crm/venues");
  revalidatePath(`/crm/venues/${id}`);

  return venue as Venue;
}

/**
 * Delete a venue (soft delete)
 * Per invariants: venues must never be deleted if linked to active events
 */
export async function deleteVenue(id: string) {
  const { orgId } = await auth();
  invariant(orgId, "Unauthorized");

  const tenantId = await getTenantId();
  invariant(id, "Venue ID is required");

  // Verify venue exists and belongs to tenant
  const existing = await database.venue.findFirst({
    where: {
      AND: [{ tenantId }, { id }, { deletedAt: null }],
    },
  });

  invariant(existing, "Venue not found");

  // Check for linked active events
  const activeEvents = await database.event.count({
    where: {
      AND: [
        { tenantId },
        { venueEntityId: id },
        { deletedAt: null },
        { status: { in: ["confirmed", "pending"] } },
      ],
    },
  });

  if (activeEvents > 0) {
    throw new Error(
      "Cannot delete venue with linked active events. Please reassign or complete the events first."
    );
  }

  // Soft delete
  await database.venue.update({
    where: {
      tenantId_id: { tenantId, id },
    },
    data: {
      deletedAt: new Date(),
    },
  });

  revalidatePath("/crm/venues");

  return { success: true };
}
