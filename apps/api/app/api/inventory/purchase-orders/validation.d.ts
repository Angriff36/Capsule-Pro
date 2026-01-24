/**
 * Purchase Order Validation Functions
 */
import type {
  CompleteReceivingRequest,
  DiscrepancyType,
  POStatus,
  QualityStatus,
  UpdateQuantityReceivedRequest,
  UpdateQualityStatusRequest,
} from "./types";
/**
 * Validate PO status
 */
export declare function validatePOStatus(
  value: unknown
): asserts value is POStatus;
/**
 * Validate quality status
 */
export declare function validateQualityStatus(
  value: unknown
): asserts value is QualityStatus;
/**
 * Validate discrepancy type
 */
export declare function validateDiscrepancyType(
  value: unknown
): asserts value is DiscrepancyType;
/**
 * Validate numeric fields are non-negative
 */
export declare function validateNonNegativeNumber(
  value: unknown,
  fieldName: string
): asserts value is number;
/**
 * Validate update quantity received request
 */
export declare function validateUpdateQuantityReceivedRequest(
  data: unknown
): asserts data is UpdateQuantityReceivedRequest;
/**
 * Validate update quality status request
 */
export declare function validateUpdateQualityStatusRequest(
  data: unknown
): asserts data is UpdateQualityStatusRequest;
/**
 * Validate complete receiving request
 */
export declare function validateCompleteReceivingRequest(
  data: unknown
): asserts data is CompleteReceivingRequest;
//# sourceMappingURL=validation.d.ts.map
