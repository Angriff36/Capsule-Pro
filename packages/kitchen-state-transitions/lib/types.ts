/**
 * Kitchen task status values
 * Mirrors the KitchenTaskStatus enum from @repo/database
 * Defined locally to avoid server-only dependency
 */
export const KitchenTaskStatus = {
  open: "open",
  in_progress: "in_progress",
  done: "done",
  canceled: "canceled",
} as const;

export type KitchenTaskStatus =
  (typeof KitchenTaskStatus)[keyof typeof KitchenTaskStatus];

/**
 * Enum for transition error codes
 */
export const TransitionErrorCode = {
  INVALID_TRANSITION: "INVALID_TRANSITION",
  TASK_NOT_FOUND: "TASK_NOT_FOUND",
  CLAIM_CONFLICT: "CLAIM_CONFLICT",
  ALREADY_CLAIMED: "ALREADY_CLAIMED",
  NO_ACTIVE_CLAIM: "NO_ACTIVE_CLAIM",
  UNAUTHORIZED: "UNAUTHORIZED",
} as const;

export type TransitionErrorCode =
  (typeof TransitionErrorCode)[keyof typeof TransitionErrorCode];

/**
 * Error information for failed transitions
 */
export interface TransitionError {
  code: TransitionErrorCode;
  message: string;
}

/**
 * Discriminated union for transition results
 */
export type TransitionResult<T> =
  | { success: true; data: T }
  | { success: false; error: TransitionError };

/**
 * Input for validating state transitions
 */
export interface TaskTransitionInput {
  taskId: string;
  tenantId: string;
  currentStatus: string;
  targetStatus: string;
  userId?: string;
  note?: string;
}

/**
 * Input for claiming a task
 */
export interface ClaimInput {
  taskId: string;
  tenantId: string;
  userId: string;
}

/**
 * Information about an active claim on a task
 */
export interface ClaimConflictInfo {
  claimId: string;
  userId: string;
  claimedAt: Date;
}
