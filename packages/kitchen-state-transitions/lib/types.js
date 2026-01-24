Object.defineProperty(exports, "__esModule", { value: true });
exports.TransitionErrorCode = exports.KitchenTaskStatus = void 0;
/**
 * Kitchen task status values
 * Mirrors the KitchenTaskStatus enum from @repo/database
 * Defined locally to avoid server-only dependency
 */
exports.KitchenTaskStatus = {
  open: "open",
  in_progress: "in_progress",
  done: "done",
  canceled: "canceled",
};
/**
 * Enum for transition error codes
 */
exports.TransitionErrorCode = {
  INVALID_TRANSITION: "INVALID_TRANSITION",
  TASK_NOT_FOUND: "TASK_NOT_FOUND",
  CLAIM_CONFLICT: "CLAIM_CONFLICT",
  ALREADY_CLAIMED: "ALREADY_CLAIMED",
  NO_ACTIVE_CLAIM: "NO_ACTIVE_CLAIM",
  UNAUTHORIZED: "UNAUTHORIZED",
};
