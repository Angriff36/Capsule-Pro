/**
 * Proposal Validation Helpers
 */
import type {
  CreateLineItemRequest,
  CreateProposalRequest,
  ProposalFilters,
  SendProposalRequest,
} from "./types";
export declare function parseProposalFilters(
  searchParams: URLSearchParams
): ProposalFilters;
export declare function parsePaginationParams(searchParams: URLSearchParams): {
  page: number;
  limit: number;
};
export declare function validateCreateProposalRequest(
  body: unknown
): asserts body is CreateProposalRequest;
export declare function validateUpdateProposalRequest(
  body: unknown
): asserts body is {
  id: string;
} & Partial<CreateProposalRequest>;
export declare function validateLineItem(
  body: unknown
): asserts body is CreateLineItemRequest;
export declare function validateSendProposalRequest(
  body: unknown
): asserts body is SendProposalRequest;
//# sourceMappingURL=validation.d.ts.map
