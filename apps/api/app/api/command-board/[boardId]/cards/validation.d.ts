/**
 * Command Board Cards Validation Helpers
 *
 * Validation functions using invariant() for card operations
 */
import type { CreateCardRequest } from "../../types";
/**
 * Validate create card request
 */
export declare function validateCreateCardRequest(
  body: unknown
): asserts body is CreateCardRequest;
/**
 * Parse card list filters from URL search params
 */
export declare function parseCardListFilters(searchParams: URLSearchParams): {
  cardType?: string;
  status?: string;
};
//# sourceMappingURL=validation.d.ts.map
