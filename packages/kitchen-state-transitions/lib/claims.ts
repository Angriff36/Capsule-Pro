import type { ClaimConflictInfo, TransitionResult } from "./types";
import { TransitionErrorCode } from "./types";

/**
 * Validate that a user can claim a task
 * Returns an error if another user has an active claim
 * Allows re-claiming by the same user
 *
 * @param activeClaims - Array of current claims on the task
 * @param userId - The user attempting to claim
 * @returns TransitionResult indicating success or conflict
 */
export function validateClaim(
  activeClaims: ClaimConflictInfo[],
  userId: string
): TransitionResult<void> {
  // Check if there's any active claim by a different user
  const conflictingClaim = activeClaims.find(
    (claim) => claim.userId !== userId
  );

  if (conflictingClaim) {
    return {
      success: false,
      error: {
        code: TransitionErrorCode.CLAIM_CONFLICT,
        message: `Task is already claimed by another user (claimed at ${conflictingClaim.claimedAt.toISOString()})`,
      },
    };
  }

  return {
    success: true,
    data: undefined,
  };
}

/**
 * Validate that a user can release their claim on a task
 * Returns an error if the user has no active claim
 *
 * @param activeClaims - Array of current claims on the task
 * @param userId - The user attempting to release
 * @returns TransitionResult containing the claim to release or error
 */
export function validateRelease(
  activeClaims: ClaimConflictInfo[],
  userId: string
): TransitionResult<ClaimConflictInfo> {
  // Find the user's active claim
  const userClaim = activeClaims.find((claim) => claim.userId === userId);

  if (!userClaim) {
    return {
      success: false,
      error: {
        code: TransitionErrorCode.NO_ACTIVE_CLAIM,
        message: "User has no active claim on this task",
      },
    };
  }

  return {
    success: true,
    data: userClaim,
  };
}

/**
 * Check if there's an active claim conflict (excluding a specific user)
 * Useful for checking if anyone else has claimed the task
 *
 * @param activeClaims - Array of current claims on the task
 * @param excludeUserId - Optional user ID to exclude from conflict check
 * @returns true if there's a conflicting claim, false otherwise
 */
export function hasActiveClaimConflict(
  activeClaims: ClaimConflictInfo[],
  excludeUserId?: string
): boolean {
  if (excludeUserId) {
    return activeClaims.some((claim) => claim.userId !== excludeUserId);
  }
  return activeClaims.length > 0;
}
