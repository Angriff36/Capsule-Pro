/**
 * Venue CRUD API Types
 *
 * Shared types for venue management operations
 */

/**
 * Venue type
 */
export type VenueType =
  | "banquet_hall"
  | "outdoor"
  | "restaurant"
  | "hotel"
  | "private_home"
  | "corporate"
  | "other";

/**
 * Full venue record from database
 */
export type Venue = {
  tenantId: string;
  id: string;
  name: string;
  venueType: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  stateProvince: string | null;
  postalCode: string | null;
  countryCode: string | null;
  capacity: number | null;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  equipmentList: unknown; // JSONB
  preferredVendors: unknown; // JSONB
  accessNotes: string | null;
  cateringNotes: string | null;
  layoutImageUrl: string | null;
  isActive: boolean;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

/**
 * Venue with event count and history
 */
export type VenueWithDetails = Venue & {
  eventCount: number;
  upcomingEvents: Array<{
    id: string;
    title: string;
    eventDate: Date;
    guestCount: number;
    status: string;
  }>;
};

/**
 * Event history for a venue
 */
export type VenueEventHistory = {
  id: string;
  event_name: string;
  event_date: Date;
  guest_count: number;
  status: string;
};

/**
 * Create venue request body
 */
export type CreateVenueRequest = {
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

/**
 * Update venue request body (all fields optional)
 */
export type UpdateVenueRequest = Partial<CreateVenueRequest>;

/**
 * Venue list filters
 */
export type VenueListFilters = {
  search?: string; // Search by name, city, address
  tags?: string[]; // Filter by tags
  venueType?: VenueType; // Filter by venue type
  city?: string; // Filter by city
  isActive?: boolean; // Filter by active status
  minCapacity?: number; // Filter by minimum capacity
};

/**
 * Pagination parameters
 */
export type PaginationParams = {
  page?: number;
  limit?: number;
};

/**
 * Paginated response
 */
export type PaginatedResponse<T> = {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};
