Object.defineProperty(exports, "__esModule", { value: true });
exports.VALID_TRANSITIONS = void 0;
exports.isValidTransition = isValidTransition;
exports.validateTransition = validateTransition;
exports.getAvailableTransitions = getAvailableTransitions;
const types_1 = require("./types");
/**
 * Valid state transitions for kitchen tasks
 * Maps from current status to allowed target statuses
 */
exports.VALID_TRANSITIONS = {
  [types_1.KitchenTaskStatus.open]: [
    types_1.KitchenTaskStatus.in_progress,
    types_1.KitchenTaskStatus.canceled,
  ],
  [types_1.KitchenTaskStatus.in_progress]: [
    types_1.KitchenTaskStatus.done,
    types_1.KitchenTaskStatus.canceled,
    types_1.KitchenTaskStatus.open,
  ],
  [types_1.KitchenTaskStatus.done]: [],
  [types_1.KitchenTaskStatus.canceled]: [],
};
/**
 * Check if a transition from one status to another is valid
 * @param from - The current status
 * @param to - The target status
 * @returns true if the transition is allowed, false otherwise
 */
function isValidTransition(from, to) {
  const validTargets = exports.VALID_TRANSITIONS[from];
  if (!validTargets) {
    return false;
  }
  return validTargets.includes(to);
}
/**
 * Validate a state transition request
 * @param input - The transition input containing task and status information
 * @returns A TransitionResult containing validation outcome
 */
function validateTransition(input) {
  const { currentStatus, targetStatus, note } = input;
  // Validate that both statuses are strings
  if (typeof currentStatus !== "string" || typeof targetStatus !== "string") {
    return {
      success: false,
      error: {
        code: types_1.TransitionErrorCode.INVALID_TRANSITION,
        message: "Status values must be strings",
      },
    };
  }
  // Check if the transition is valid
  if (!isValidTransition(currentStatus, targetStatus)) {
    const validTargets = exports.VALID_TRANSITIONS[currentStatus] || [];
    return {
      success: false,
      error: {
        code: types_1.TransitionErrorCode.INVALID_TRANSITION,
        message: `Cannot transition from '${currentStatus}' to '${targetStatus}'. Valid transitions: ${validTargets.join(", ") || "none"}`,
      },
    };
  }
  return {
    success: true,
    data: {
      fromStatus: currentStatus,
      toStatus: targetStatus,
      note,
    },
  };
}
/**
 * Get the available transitions for a given status
 * @param currentStatus - The current status of the task
 * @returns Array of valid target statuses
 */
function getAvailableTransitions(currentStatus) {
  return exports.VALID_TRANSITIONS[currentStatus] || [];
}
