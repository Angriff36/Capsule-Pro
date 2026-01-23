/**
 * Venue CRUD Validation Helpers
 *
 * Validation functions using invariant() for venue operations
 */

import { invariant } from "@/app/lib/invariant";
import type {
  CreateVenueRequest,
  UpdateVenueRequest,
  VenueListFilters,
} from "./types";

/**
 * Email validation regex
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validate email format
 */
export function validateEmail(email: string | undefined | null): boolean {
  if (!email) return true; // Email is optional
  return EMAIL_REGEX.test(email);
}

/**
 * Validate phone number format (basic check)
 */
export function validatePhone(phone: string | undefined | null): boolean {
  if (!phone) return true; // Phone is optional
  const cleaned = phone.replace(/[\s\-()+]/g, "");
  return cleaned.length >= 10 && /^\d+$/.test(cleaned);
}

/**
 * Venue types enum
 */
const VENUE_TYPES = [
  "banquet_hall",
  "outdoor",
  "restaurant",
  "hotel",
  "private_home",
  "corporate",
  "other",
] as const;

/**
 * Validate venue type
 */
export function validateVenueType(venueType: string): boolean {
  return VENUE_TYPES.includes(venueType as (typeof VENUE_TYPES)[number]);
}

/**
 * Validate create venue request
 */
export function validateCreateVenueRequest(
  body: unknown
): asserts body is CreateVenueRequest {
  invariant(
    body && typeof body === "object",
    "Request body must be a valid object"
  );

  const data = body as Record<string, unknown>;

  // Name is required
  invariant(
    typeof data.name === "string" && data.name.trim().length > 0,
    "name is required and must not be empty"
  );

  // Validate venueType if provided
  if (data.venueType && typeof data.venueType === "string") {
    invariant(
      validateVenueType(data.venueType),
      `venueType must be one of: ${VENUE_TYPES.join(", ")}`
    );
  }

  // Validate email format if provided
  if (data.contactEmail && typeof data.contactEmail === "string") {
    invariant(
      validateEmail(data.contactEmail),
      "contactEmail must be a valid email address"
    );
  }

  // Validate phone format if provided
  if (data.contactPhone && typeof data.contactPhone === "string") {
    invariant(
      validatePhone(data.contactPhone),
      "contactPhone must be a valid phone number"
    );
  }

  // Validate capacity if provided
  if (data.capacity !== undefined) {
    invariant(
      typeof data.capacity === "number" && data.capacity > 0,
      "capacity must be a positive number"
    );
  }

  // Validate tags is an array if provided
  if (data.tags !== undefined) {
    invariant(Array.isArray(data.tags), "tags must be an array");
  }

  // Validate isActive if provided
  if (data.isActive !== undefined) {
    invariant(typeof data.isActive === "boolean", "isActive must be a boolean");
  }

  // Validate equipmentList if provided (must be array or object)
  if (data.equipmentList !== undefined) {
    invariant(
      typeof data.equipmentList === "object" && data.equipmentList !== null,
      "equipmentList must be a valid object"
    );
  }

  // Validate preferredVendors if provided (must be object)
  if (data.preferredVendors !== undefined) {
    invariant(
      typeof data.preferredVendors === "object" &&
        data.preferredVendors !== null,
      "preferredVendors must be a valid object"
    );
  }

  // Validate countryCode if provided (must be 2 char ISO code)
  if (data.countryCode && typeof data.countryCode === "string") {
    invariant(
      data.countryCode.length === 2,
      "countryCode must be a 2-character ISO country code"
    );
  }
}

/**
 * Validate update venue request (more lenient - all optional)
 */
export function validateUpdateVenueRequest(
  body: unknown
): asserts body is UpdateVenueRequest {
  invariant(
    body && typeof body === "object",
    "Request body must be a valid object"
  );

  const data = body as Record<string, unknown>;

  // Validate venueType if provided
  if (data.venueType && typeof data.venueType === "string") {
    invariant(
      validateVenueType(data.venueType),
      `venueType must be one of: ${VENUE_TYPES.join(", ")}`
    );
  }

  // Validate name if provided
  if (data.name && typeof data.name === "string") {
    invariant(data.name.trim().length > 0, "name must not be empty");
  }

  // Validate email format if provided
  if (data.contactEmail && typeof data.contactEmail === "string") {
    invariant(
      validateEmail(data.contactEmail),
      "contactEmail must be a valid email address"
    );
  }

  // Validate phone format if provided
  if (data.contactPhone && typeof data.contactPhone === "string") {
    invariant(
      validatePhone(data.contactPhone),
      "contactPhone must be a valid phone number"
    );
  }

  // Validate capacity if provided
  if (data.capacity !== undefined) {
    invariant(
      typeof data.capacity === "number" && data.capacity > 0,
      "capacity must be a positive number"
    );
  }

  // Validate tags is an array if provided
  if (data.tags !== undefined) {
    invariant(Array.isArray(data.tags), "tags must be an array");
  }

  // Validate isActive if provided
  if (data.isActive !== undefined) {
    invariant(typeof data.isActive === "boolean", "isActive must be a boolean");
  }
}

/**
 * Parse and validate venue list filters
 */
export function parseVenueListFilters(
  searchParams: URLSearchParams
): VenueListFilters {
  const filters: VenueListFilters = {};

  const search = searchParams.get("search");
  if (search) {
    invariant(
      typeof search === "string" && search.length > 0,
      "search must be a non-empty string"
    );
    filters.search = search;
  }

  const tags = searchParams.get("tags");
  if (tags) {
    try {
      const parsed = JSON.parse(tags);
      invariant(Array.isArray(parsed), "tags must be a valid JSON array");
      filters.tags = parsed;
    } catch {
      throw new Error("tags must be a valid JSON array");
    }
  }

  const venueType = searchParams.get("venueType");
  if (venueType) {
    invariant(
      validateVenueType(venueType),
      `venueType must be one of: ${VENUE_TYPES.join(", ")}`
    );
    filters.venueType = venueType as (typeof VENUE_TYPES)[number];
  }

  const city = searchParams.get("city");
  if (city) {
    invariant(
      typeof city === "string" && city.length > 0,
      "city must be a non-empty string"
    );
    filters.city = city;
  }

  const isActive = searchParams.get("isActive");
  if (isActive) {
    invariant(
      isActive === "true" || isActive === "false",
      "isActive must be 'true' or 'false'"
    );
    filters.isActive = isActive === "true";
  }

  const minCapacity = searchParams.get("minCapacity");
  if (minCapacity) {
    const capacity = Number.parseInt(minCapacity, 10);
    invariant(
      !Number.isNaN(capacity) && capacity > 0,
      "minCapacity must be a positive number"
    );
    filters.minCapacity = capacity;
  }

  return filters;
}

/**
 * Parse pagination parameters
 */
export function parsePaginationParams(searchParams: URLSearchParams): {
  page: number;
  limit: number;
} {
  const page = Number.parseInt(searchParams.get("page") || "1", 10);
  const limit = Number.parseInt(searchParams.get("limit") || "50", 10);

  invariant(!Number.isNaN(page) && page > 0, "page must be a positive integer");

  invariant(
    !Number.isNaN(limit) && limit > 0 && limit <= 100,
    "limit must be a positive integer (max 100)"
  );

  return { page, limit };
}
