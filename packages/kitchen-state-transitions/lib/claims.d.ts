import type { ClaimConflictInfo, TransitionResult } from "./types";
/**
 * Validate that a user can claim a task
 * Returns an error if another user has an active claim
 * Allows re-claiming by the same user
 *
 * @param activeClaims - Array of current claims on the task
 * @param userId - The user attempting to claim
 * @returns TransitionResult indicating success or conflict
 */
export declare function validateClaim(
  activeClaims: ClaimConflictInfo[],
  userId: string
): TransitionResult<void>;
/**
 * Validate that a user can release their claim on a task
 * Returns an error if the user has no active claim
 *
 * @param activeClaims - Array of current claims on the task
 * @param userId - The user attempting to release
 * @returns TransitionResult containing the claim to release or error
 */
export declare function validateRelease(
  activeClaims: ClaimConflictInfo[],
  userId: string
): TransitionResult<ClaimConflictInfo>;
/**
 * Check if there's an active claim conflict (excluding a specific user)
 * Useful for checking if anyone else has claimed the task
 *
 * @param activeClaims - Array of current claims on the task
 * @param excludeUserId - Optional user ID to exclude from conflict check
 * @returns true if there's a conflicting claim, false otherwise
 */
export declare function hasActiveClaimConflict(
  activeClaims: ClaimConflictInfo[],
  excludeUserId?: string
): boolean;
//# sourceMappingURL=claims.d.ts.map
