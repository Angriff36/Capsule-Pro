/**
 * Venue CRUD Server Actions
 *
 * NOTE: Venue model does not exist in database schema.
 * This module is disabled until the Venue model is added.
 */
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
export declare function getVenues(
  _filters?: VenueFilters,
  _page?: number,
  _limit?: number
): Promise<void>;
export declare function getVenueCount(): Promise<void>;
export declare function getVenueById(_id: string): Promise<void>;
export declare function getVenueEvents(
  _venueId: string,
  _status?: string,
  _limit?: number,
  _offset?: number
): Promise<void>;
export declare function createVenue(_input: CreateVenueInput): Promise<void>;
export declare function updateVenue(
  _id: string,
  _input: Partial<CreateVenueInput>
): Promise<void>;
export declare function deleteVenue(_id: string): Promise<void>;
//# sourceMappingURL=actions.d.ts.map
