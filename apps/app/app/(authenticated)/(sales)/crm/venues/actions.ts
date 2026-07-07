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
import { getTenantId, requireCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest-command";

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
  city?: string;
  isActive?: boolean;
  minCapacity?: number;
  search?: string;
  tags?: string[];
  venueType?: VenueType;
}

export interface CreateVenueInput {
  accessNotes?: string;
  addressLine1?: string;
  addressLine2?: string;
  capacity?: number;
  cateringNotes?: string;
  city?: string;
  contactEmail?: string;
  contactName?: string;
  contactPhone?: string;
  countryCode?: string;
  equipmentList?: unknown;
  isActive?: boolean;
  layoutImageUrl?: string;
  name: string;
  postalCode?: string;
  preferredVendors?: unknown;
  stateProvince?: string;
  tags?: string[];
  venueType?: VenueType;
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
  // Governed write: Venue.create runs through the Manifest runtime (constitution
  // §9) — no direct database.venue.create. requireCurrentUser supplies the actor +
  // tenant the command needs for policy + audit context (§19). The full venue-form
  // field surface is forwarded. equipmentList/preferredVendors are intentionally
  // NOT sent: the venue UI never sets them, so they default to NULL exactly as the
  // prior `Prisma.JsonNull` path did (lossless, no JSON double-encoding).
  const user = await requireCurrentUser();
  const tenantId = user.tenantId;
  invariant(input.name, "Venue name is required");

  const result = await runManifestCommand({
    entity: "Venue",
    command: "create",
    body: {
      name: input.name.trim(),
      venueType: input.venueType ?? "other",
      addressLine1: input.addressLine1?.trim() || "",
      addressLine2: input.addressLine2?.trim() || "",
      city: input.city?.trim() || "",
      stateProvince: input.stateProvince?.trim() || "",
      postalCode: input.postalCode?.trim() || "",
      countryCode: input.countryCode?.trim() || "",
      capacity: input.capacity ?? 0,
      contactName: input.contactName?.trim() || "",
      contactPhone: input.contactPhone?.trim() || "",
      contactEmail: input.contactEmail?.trim() || "",
      accessNotes: input.accessNotes?.trim() || "",
      cateringNotes: input.cateringNotes?.trim() || "",
      layoutImageUrl: input.layoutImageUrl?.trim() || "",
      tags: input.tags ?? [],
    },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });

  if (!result.ok) {
    throw new Error(result.message || "Failed to create venue");
  }

  const createdId = (result.result as { id?: string } | null)?.id;
  invariant(createdId, "Venue.create did not return an id");

  // Read back the persisted row to preserve the Venue return shape.
  const venue = await database.venue.findFirst({
    where: { tenantId, id: createdId },
  });
  invariant(venue, "Created venue could not be loaded");

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
  const user = await requireCurrentUser();
  const tenantId = user.tenantId;
  invariant(id, "Venue ID is required");

  // Read existing (constitution §10) to verify tenant ownership AND merge partial
  // input over current values: the governed Venue.update mutates the FULL field
  // set, so any field the caller omits must carry its existing value to preserve
  // the prior partial-update semantics (undefined → keep current).
  const existing = await database.venue.findFirst({
    where: {
      AND: [{ tenantId }, { id }, { deletedAt: null }],
    },
  });

  invariant(existing, "Venue not found");

  const result = await runManifestCommand({
    entity: "Venue",
    command: "update",
    body: {
      id,
      name: input.name ?? existing.name,
      venueType: input.venueType ?? existing.venueType,
      addressLine1: input.addressLine1 ?? existing.addressLine1 ?? "",
      addressLine2: input.addressLine2 ?? existing.addressLine2 ?? "",
      city: input.city ?? existing.city ?? "",
      stateProvince: input.stateProvince ?? existing.stateProvince ?? "",
      postalCode: input.postalCode ?? existing.postalCode ?? "",
      countryCode: input.countryCode ?? existing.countryCode ?? "",
      capacity: input.capacity ?? existing.capacity ?? 0,
      contactName: input.contactName ?? existing.contactName ?? "",
      contactPhone: input.contactPhone ?? existing.contactPhone ?? "",
      contactEmail: input.contactEmail ?? existing.contactEmail ?? "",
      accessNotes: input.accessNotes ?? existing.accessNotes ?? "",
      cateringNotes: input.cateringNotes ?? existing.cateringNotes ?? "",
      layoutImageUrl: input.layoutImageUrl ?? existing.layoutImageUrl ?? "",
      tags: input.tags ?? existing.tags ?? [],
      isActive: input.isActive ?? existing.isActive,
    },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });

  if (!result.ok) {
    throw new Error(result.message || "Failed to update venue");
  }

  const venue = await database.venue.findFirst({ where: { tenantId, id } });
  invariant(venue, "Updated venue could not be loaded");

  revalidatePath("/crm/venues");
  revalidatePath(`/crm/venues/${id}`);

  return venue as Venue;
}

/**
 * Delete a venue (soft delete)
 * Per invariants: venues must never be deleted if linked to active events
 */
export async function deleteVenue(id: string) {
  const user = await requireCurrentUser();
  const tenantId = user.tenantId;
  invariant(id, "Venue ID is required");

  // Verify venue exists and belongs to tenant (read — constitution §10)
  const existing = await database.venue.findFirst({
    where: {
      AND: [{ tenantId }, { id }, { deletedAt: null }],
    },
  });

  invariant(existing, "Venue not found");

  // Domain read-guard: block soft-delete when the venue still has linked active
  // events. This is a cross-entity READ kept in the action (a Manifest guard can't
  // query another table); the governed write itself is Venue.softDelete.
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

  // Governed soft delete via the Manifest runtime (constitution §9) — sets
  // deletedAt + emits VenueDeleted, no direct database.venue.update.
  const result = await runManifestCommand({
    entity: "Venue",
    command: "softDelete",
    body: { id },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });

  if (!result.ok) {
    throw new Error(result.message || "Failed to delete venue");
  }

  revalidatePath("/crm/venues");

  return { success: true };
}
