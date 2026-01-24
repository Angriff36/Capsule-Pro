/**
 * Shipment Validation Functions
 */
import type {
  CreateShipmentItemRequest,
  CreateShipmentRequest,
  ItemCondition,
  ShipmentStatus,
  UpdateShipmentItemRequest,
  UpdateShipmentRequest,
  UpdateShipmentStatusRequest,
} from "./types";
export declare function validateShipmentStatus(
  value: unknown
): asserts value is ShipmentStatus;
export declare function validateItemCondition(
  value: unknown
): asserts value is ItemCondition;
export declare function validateDateString(
  value: unknown,
  fieldName: string
): asserts value is string;
export declare function validateNonNegativeNumber(
  value: unknown,
  fieldName: string
): asserts value is number;
export declare function validatePositiveNumber(
  value: unknown,
  fieldName: string
): asserts value is number;
export declare function validateUUID(
  value: unknown,
  fieldName: string
): asserts value is string;
export declare function validateCreateShipmentRequest(
  data: unknown
): asserts data is CreateShipmentRequest;
export declare function validateUpdateShipmentRequest(
  data: unknown
): asserts data is UpdateShipmentRequest;
export declare function validateUpdateShipmentStatusRequest(
  data: unknown
): asserts data is UpdateShipmentStatusRequest;
export declare function validateCreateShipmentItemRequest(
  data: unknown
): asserts data is CreateShipmentItemRequest;
export declare function validateUpdateShipmentItemRequest(
  data: unknown
): asserts data is UpdateShipmentItemRequest;
//# sourceMappingURL=validation.d.ts.map
