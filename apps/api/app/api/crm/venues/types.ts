/**
 * Venue API Types
 *
 * Mirrors the request/response surface used by the venue CRM module.
 * Kept in sync with apps/app/app/(authenticated)/crm/venues/actions.ts so the
 * frontend can swap server actions for fetch calls without shape drift.
 */

export type VenueType =
  | "banquet_hall"
  | "outdoor"
  | "restaurant"
  | "hotel"
  | "private_home"
  | "corporate"
  | "other";

export interface VenueListFilters {
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

export type UpdateVenueInput = Partial<CreateVenueInput>;
