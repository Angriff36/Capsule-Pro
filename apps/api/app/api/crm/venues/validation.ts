/**
 * Venue API Validation Helpers
 *
 * Mirrors the validation rules used by the venue server actions, lifted into
 * the API surface so external callers (mobile, integrations) get the same
 * guarantees as the in-process Next.js callers.
 */

import { invariant } from "@/app/lib/invariant";
import type {
  CreateVenueInput,
  UpdateVenueInput,
  VenueListFilters,
  VenueType,
} from "./types";

const VENUE_TYPES: readonly VenueType[] = [
  "banquet_hall",
  "outdoor",
  "restaurant",
  "hotel",
  "private_home",
  "corporate",
  "other",
];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isVenueType(value: unknown): value is VenueType {
  return typeof value === "string" && VENUE_TYPES.includes(value as VenueType);
}

function validateOptionalString(
  value: unknown,
  field: string,
  maxLength = 1000
): string | undefined {
  if (value === undefined || value === null || value === "") {
    return;
  }
  invariant(typeof value === "string", `${field} must be a string`);
  invariant(
    value.length <= maxLength,
    `${field} must be at most ${maxLength} characters`
  );
  return value;
}

function validateOptionalEmail(
  value: unknown,
  field: string
): string | undefined {
  const str = validateOptionalString(value, field, 320);
  if (str === undefined) {
    return;
  }
  invariant(EMAIL_REGEX.test(str), `${field} must be a valid email address`);
  return str;
}

function validateOptionalCountryCode(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") {
    return;
  }
  invariant(typeof value === "string", "countryCode must be a string");
  invariant(
    value.length === 2,
    "countryCode must be a 2-letter ISO country code"
  );
  return value.toUpperCase();
}

function validateOptionalCapacity(value: unknown): number | undefined {
  if (value === undefined || value === null) {
    return;
  }
  invariant(typeof value === "number", "capacity must be a number");
  invariant(Number.isInteger(value), "capacity must be an integer");
  invariant(value >= 0, "capacity must be non-negative");
  return value;
}

function validateOptionalTags(value: unknown): string[] | undefined {
  if (value === undefined || value === null) {
    return;
  }
  invariant(Array.isArray(value), "tags must be an array");
  for (const tag of value) {
    invariant(typeof tag === "string", "tags must be an array of strings");
  }
  return value as string[];
}

function validateOptionalJson(
  value: unknown,
  _field: string
): unknown | undefined {
  if (value === undefined || value === null) {
    return;
  }
  // Equipment list / preferred vendors are stored as JSONB. Accept anything
  // JSON-serializable; the Prisma client handles serialization.
  return value;
}

/**
 * Validate a POST /api/crm/venues request body.
 */
export function validateCreateVenueRequest(
  body: unknown
): asserts body is CreateVenueInput {
  invariant(isRecord(body), "Request body must be an object");

  invariant(
    typeof body.name === "string",
    "name is required and must be a string"
  );
  invariant(body.name.trim().length > 0, "name must not be empty");
  invariant(body.name.length <= 200, "name must be at most 200 characters");

  if (body.venueType !== undefined) {
    invariant(
      isVenueType(body.venueType),
      `venueType must be one of: ${VENUE_TYPES.join(", ")}`
    );
  }

  validateOptionalString(body.addressLine1, "addressLine1", 200);
  validateOptionalString(body.addressLine2, "addressLine2", 200);
  validateOptionalString(body.city, "city", 100);
  validateOptionalString(body.stateProvince, "stateProvince", 100);
  validateOptionalString(body.postalCode, "postalCode", 20);
  validateOptionalCountryCode(body.countryCode);
  validateOptionalCapacity(body.capacity);
  validateOptionalString(body.contactName, "contactName", 200);
  validateOptionalString(body.contactPhone, "contactPhone", 50);
  validateOptionalEmail(body.contactEmail, "contactEmail");
  validateOptionalJson(body.equipmentList, "equipmentList");
  validateOptionalJson(body.preferredVendors, "preferredVendors");
  validateOptionalString(body.accessNotes, "accessNotes", 5000);
  validateOptionalString(body.cateringNotes, "cateringNotes", 5000);
  validateOptionalString(body.layoutImageUrl, "layoutImageUrl", 2000);
  validateOptionalTags(body.tags);

  if (body.isActive !== undefined) {
    invariant(typeof body.isActive === "boolean", "isActive must be a boolean");
  }
}

/**
 * Validate a PUT /api/crm/venues/[id] request body. All fields optional.
 */
export function validateUpdateVenueRequest(
  body: unknown
): asserts body is UpdateVenueInput {
  invariant(isRecord(body), "Request body must be an object");

  if (body.name !== undefined) {
    invariant(typeof body.name === "string", "name must be a string");
    invariant(body.name.trim().length > 0, "name must not be empty");
    invariant(body.name.length <= 200, "name must be at most 200 characters");
  }

  if (body.venueType !== undefined) {
    invariant(
      isVenueType(body.venueType),
      `venueType must be one of: ${VENUE_TYPES.join(", ")}`
    );
  }

  validateOptionalString(body.addressLine1, "addressLine1", 200);
  validateOptionalString(body.addressLine2, "addressLine2", 200);
  validateOptionalString(body.city, "city", 100);
  validateOptionalString(body.stateProvince, "stateProvince", 100);
  validateOptionalString(body.postalCode, "postalCode", 20);
  validateOptionalCountryCode(body.countryCode);
  validateOptionalCapacity(body.capacity);
  validateOptionalString(body.contactName, "contactName", 200);
  validateOptionalString(body.contactPhone, "contactPhone", 50);
  validateOptionalEmail(body.contactEmail, "contactEmail");
  validateOptionalJson(body.equipmentList, "equipmentList");
  validateOptionalJson(body.preferredVendors, "preferredVendors");
  validateOptionalString(body.accessNotes, "accessNotes", 5000);
  validateOptionalString(body.cateringNotes, "cateringNotes", 5000);
  validateOptionalString(body.layoutImageUrl, "layoutImageUrl", 2000);
  validateOptionalTags(body.tags);

  if (body.isActive !== undefined) {
    invariant(typeof body.isActive === "boolean", "isActive must be a boolean");
  }
}

/**
 * Parse list filters from URL search params. Used by GET /api/crm/venues.
 */
export function parseVenueListFilters(
  searchParams: URLSearchParams
): VenueListFilters {
  const filters: VenueListFilters = {};

  const search = searchParams.get("search");
  if (search) {
    filters.search = search;
  }

  const tagsParam = searchParams.get("tags");
  if (tagsParam) {
    try {
      const parsed = JSON.parse(tagsParam);
      if (Array.isArray(parsed) && parsed.every((t) => typeof t === "string")) {
        filters.tags = parsed;
      }
    } catch {
      // Fallback: comma-separated list
      filters.tags = tagsParam
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
    }
  }

  const venueType = searchParams.get("venueType");
  if (venueType && isVenueType(venueType)) {
    filters.venueType = venueType;
  }

  const city = searchParams.get("city");
  if (city) {
    filters.city = city;
  }

  const isActiveParam = searchParams.get("isActive");
  if (isActiveParam !== null) {
    filters.isActive = isActiveParam === "true";
  }

  const minCapacityParam = searchParams.get("minCapacity");
  if (minCapacityParam !== null) {
    const parsed = Number(minCapacityParam);
    if (Number.isFinite(parsed) && parsed >= 0) {
      filters.minCapacity = Math.floor(parsed);
    }
  }

  return filters;
}

/**
 * Parse standard pagination params (page=1, limit=50, max 100).
 */
export function parsePaginationParams(searchParams: URLSearchParams): {
  page: number;
  limit: number;
} {
  const pageParam = searchParams.get("page");
  const limitParam = searchParams.get("limit");

  const page = pageParam ? Math.max(1, Number.parseInt(pageParam, 10) || 1) : 1;
  const limit = limitParam
    ? Math.min(100, Math.max(1, Number.parseInt(limitParam, 10) || 50))
    : 50;

  return { page, limit };
}
