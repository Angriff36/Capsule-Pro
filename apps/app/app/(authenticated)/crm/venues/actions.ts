"use server";

/**
 * Venue CRUD Server Actions
 *
 * Server actions for venue management operations
 */

import type { Venue } from "@repo/database";
import { database } from "@repo/database";
import { revalidatePath } from "next/cache";
import { invariant } from "@/app/lib/invariant";
import { requireTenantId } from "@/app/lib/tenant";

// Types matching the API
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
  const tenantId = await requireTenantId();

  const whereClause: Record<string, unknown> = {
    AND: [{ tenantId }, { deletedAt: null }],
  };

  // Add search filter
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    (whereClause.AND as Array<Record<string, unknown>>).push({
      OR: [
        { name: { contains: searchLower, mode: "insensitive" } },
        { city: { contains: searchLower, mode: "insensitive" } },
        { addressLine1: { contains: searchLower, mode: "insensitive" } },
      ],
    });
  }

  // Add tag filter
  if (filters.tags && filters.tags.length > 0) {
    (whereClause.AND as Array<Record<string, unknown>>).push({
      tags: { hasSome: filters.tags },
    });
  }

  // Add venueType filter
  if (filters.venueType) {
    (whereClause.AND as Array<Record<string, unknown>>).push({
      venueType: filters.venueType,
    });
  }

  // Add city filter
  if (filters.city) {
    (whereClause.AND as Array<Record<string, unknown>>).push({
      city: { contains: filters.city, mode: "insensitive" },
    });
  }

  // Add isActive filter
  if (filters.isActive !== undefined) {
    (whereClause.AND as Array<Record<string, unknown>>).push({
      isActive: filters.isActive,
    });
  }

  // Add minCapacity filter
  if (filters.minCapacity !== undefined) {
    (whereClause.AND as Array<Record<string, unknown>>).push({
      capacity: { gte: filters.minCapacity },
    });
  }

  const offset = (page - 1) * limit;

  const venues = await database.venue.findMany({
    where: whereClause,
    orderBy: [{ name: "asc" }],
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
  const tenantId = await requireTenantId();

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
  const tenantId = await requireTenantId();
  invariant(id, "Venue ID is required");

  const venue = await database.venue.findFirst({
    where: {
      AND: [{ tenantId }, { id }, { deletedAt: null }],
    },
  });

  invariant(venue, "Venue not found");

  // Get event count
  const eventCount = await database.event.count({
    where: {
      AND: [{ tenantId }, { venueId: id }, { deletedAt: null }],
    },
  });

  // Get upcoming events
  const upcomingEvents = await database.event.findMany({
    where: {
      AND: [
        { tenantId },
        { venueId: id },
        { deletedAt: null },
        { eventDate: { gte: new Date() } },
      ],
    },
    orderBy: [{ eventDate: "asc" }],
    take: 5,
    select: {
      id: true,
      title: true,
      eventDate: true,
      guestCount: true,
      status: true,
    },
  });

  return {
    ...venue,
    eventCount,
    upcomingEvents,
  };
}

/**
 * Get venue event history
 */
export async function getVenueEvents(
  venueId: string,
  status?: string,
  limit = 50,
  offset = 0
) {
  const tenantId = await requireTenantId();
  invariant(venueId, "Venue ID is required");

  // Verify venue exists
  const venue = await database.venue.findFirst({
    where: {
      AND: [{ tenantId }, { id: venueId }, { deletedAt: null }],
    },
  });

  invariant(venue, "Venue not found");

  const whereClause: Record<string, unknown> = {
    AND: [{ tenantId }, { venueId }, { deletedAt: null }],
  };

  // Add status filter if provided
  if (status) {
    (whereClause.AND as Array<Record<string, unknown>>).push({ status });
  }

  const events = await database.event.findMany({
    where: whereClause,
    orderBy: [{ eventDate: "desc" }],
    take: limit,
    skip: offset,
    select: {
      id: true,
      title: true,
      eventDate: true,
      event_type: true,
      guestCount: true,
      status: true,
    },
  });

  const totalCount = await database.event.count({
    where: whereClause,
  });

  return {
    data: events,
    pagination: {
      total: totalCount,
      limit,
      offset,
    },
  };
}

/**
 * Create a new venue
 */
export async function createVenue(input: CreateVenueInput) {
  const tenantId = await requireTenantId();

  // Check for duplicate name
  const existingVenue = await database.venue.findFirst({
    where: {
      AND: [
        { tenantId },
        { name: { equals: input.name.trim(), mode: "insensitive" } },
        { deletedAt: null },
      ],
    },
  });

  invariant(!existingVenue, "A venue with this name already exists");

  const venue = await database.venue.create({
    data: {
      tenantId,
      name: input.name.trim(),
      venueType: input.venueType || null,
      addressLine1: input.addressLine1?.trim() || null,
      addressLine2: input.addressLine2?.trim() || null,
      city: input.city?.trim() || null,
      stateProvince: input.stateProvince?.trim() || null,
      postalCode: input.postalCode?.trim() || null,
      countryCode: input.countryCode?.trim().toUpperCase() || null,
      capacity: input.capacity || null,
      contactName: input.contactName?.trim() || null,
      contactPhone: input.contactPhone?.trim() || null,
      contactEmail: input.contactEmail?.trim().toLowerCase() || null,
      equipmentList: input.equipmentList || [],
      preferredVendors: input.preferredVendors || {},
      accessNotes: input.accessNotes?.trim() || null,
      cateringNotes: input.cateringNotes?.trim() || null,
      layoutImageUrl: input.layoutImageUrl?.trim() || null,
      isActive: input.isActive ?? true,
      tags: input.tags || [],
    },
  });

  revalidatePath("/crm/venues");

  return venue;
}

/**
 * Update a venue
 */
export async function updateVenue(
  id: string,
  input: Partial<CreateVenueInput>
) {
  const tenantId = await requireTenantId();
  invariant(id, "Venue ID is required");

  // Check if venue exists
  const existingVenue = await database.venue.findFirst({
    where: {
      AND: [{ tenantId }, { id }, { deletedAt: null }],
    },
  });

  invariant(existingVenue, "Venue not found");

  // Check for duplicate name if changing
  if (
    input.name &&
    input.name.trim() &&
    input.name.trim().toLowerCase() !== existingVenue.name.toLowerCase()
  ) {
    const duplicateVenue = await database.venue.findFirst({
      where: {
        AND: [
          { tenantId },
          { name: { equals: input.name.trim(), mode: "insensitive" } },
          { deletedAt: null },
          { id: { not: id } },
        ],
      },
    });

    invariant(!duplicateVenue, "A venue with this name already exists");
  }

  const updatedVenue = await database.venue.update({
    where: {
      tenantId_id: { tenantId, id },
    },
    data: {
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.venueType !== undefined && { venueType: input.venueType }),
      ...(input.addressLine1 !== undefined && {
        addressLine1: input.addressLine1?.trim() || null,
      }),
      ...(input.addressLine2 !== undefined && {
        addressLine2: input.addressLine2?.trim() || null,
      }),
      ...(input.city !== undefined && { city: input.city?.trim() || null }),
      ...(input.stateProvince !== undefined && {
        stateProvince: input.stateProvince?.trim() || null,
      }),
      ...(input.postalCode !== undefined && {
        postalCode: input.postalCode?.trim() || null,
      }),
      ...(input.countryCode !== undefined && {
        countryCode: input.countryCode?.trim().toUpperCase() || null,
      }),
      ...(input.capacity !== undefined && { capacity: input.capacity }),
      ...(input.contactName !== undefined && {
        contactName: input.contactName?.trim() || null,
      }),
      ...(input.contactPhone !== undefined && {
        contactPhone: input.contactPhone?.trim() || null,
      }),
      ...(input.contactEmail !== undefined && {
        contactEmail: input.contactEmail?.trim().toLowerCase() || null,
      }),
      ...(input.equipmentList !== undefined && {
        equipmentList: input.equipmentList,
      }),
      ...(input.preferredVendors !== undefined && {
        preferredVendors: input.preferredVendors,
      }),
      ...(input.accessNotes !== undefined && {
        accessNotes: input.accessNotes?.trim() || null,
      }),
      ...(input.cateringNotes !== undefined && {
        cateringNotes: input.cateringNotes?.trim() || null,
      }),
      ...(input.layoutImageUrl !== undefined && {
        layoutImageUrl: input.layoutImageUrl?.trim() || null,
      }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
      ...(input.tags !== undefined && { tags: input.tags }),
    },
  });

  revalidatePath("/crm/venues");
  revalidatePath(`/crm/venues/${id}`);

  return updatedVenue;
}

/**
 * Delete a venue (soft delete)
 */
export async function deleteVenue(id: string) {
  const tenantId = await requireTenantId();
  invariant(id, "Venue ID is required");

  const existingVenue = await database.venue.findFirst({
    where: {
      AND: [{ tenantId }, { id }, { deletedAt: null }],
    },
  });

  invariant(existingVenue, "Venue not found");

  // Check for active events
  const activeEvents = await database.event.count({
    where: {
      AND: [
        { tenantId },
        { venueId: id },
        { deletedAt: null },
        { status: { notIn: ["completed", "cancelled"] } },
      ],
    },
  });

  invariant(
    activeEvents === 0,
    `Cannot delete venue with ${activeEvents} active event(s). Please cancel or complete the events first.`
  );

  await database.venue.update({
    where: {
      tenantId_id: { tenantId, id },
    },
    data: { deletedAt: new Date() },
  });

  revalidatePath("/crm/venues");

  return { success: true };
}
