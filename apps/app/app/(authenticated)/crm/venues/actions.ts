"use server";

/**
 * Venue CRUD Server Actions
 *
 * NOTE: Venue model does not exist in database schema.
 * This module is disabled until the Venue model is added.
 */

// Re-export types for consistency (even though they're stubs)
export type VenueType =
  | "banquet_hall"
  | "outdoor"
  | "restaurant"
  | "hotel"
  | "private_home"
  | "corporate"
  | "other";

export type VenueFilters = {
  search?: string;
  tags?: string[];
  venueType?: VenueType;
  city?: string;
  isActive?: boolean;
  minCapacity?: number;
};

export type CreateVenueInput = {
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
};

// Stub implementations that throw errors since Venue model doesn't exist
export async function getVenues(
  _filters: VenueFilters = {},
  _page = 1,
  _limit = 50
) {
  throw new Error("Venue model does not exist in database schema");
}

export async function getVenueCount() {
  throw new Error("Venue model does not exist in database schema");
}

export async function getVenueById(_id: string) {
  throw new Error("Venue model does not exist in database schema");
}

export async function getVenueEvents(
  _venueId: string,
  _status?: string,
  _limit = 50,
  _offset = 0
) {
  throw new Error("Venue model does not exist in database schema");
}

export async function createVenue(_input: CreateVenueInput) {
  throw new Error("Venue model does not exist in database schema");
}

export async function updateVenue(
  _id: string,
  _input: Partial<CreateVenueInput>
) {
  throw new Error("Venue model does not exist in database schema");
}

export async function deleteVenue(_id: string) {
  throw new Error("Venue model does not exist in database schema");
}
