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

export type UpdateVenueInput = Partial<CreateVenueInput>;
