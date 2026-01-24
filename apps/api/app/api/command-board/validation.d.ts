/**
 * Command Board Validation Functions
 */
import type {
  BoardStatus,
  CardStatus,
  CardType,
  CreateCommandBoardRequest,
  UpdateCommandBoardRequest,
} from "./types";
/**
 * Validate board status
 */
export declare function validateBoardStatus(
  value: unknown
): asserts value is BoardStatus;
/**
 * Validate card type
 */
export declare function validateCardType(
  value: unknown
): asserts value is CardType;
/**
 * Validate card status
 */
export declare function validateCardStatus(
  value: unknown
): asserts value is CardStatus;
/**
 * Validate update command board request
 */
export declare function validateUpdateCommandBoardRequest(
  data: unknown
): asserts data is UpdateCommandBoardRequest;
/**
 * Validate create command board request
 */
export declare function validateCreateCommandBoardRequest(
  data: unknown
): asserts data is CreateCommandBoardRequest;
//# sourceMappingURL=validation.d.ts.map
