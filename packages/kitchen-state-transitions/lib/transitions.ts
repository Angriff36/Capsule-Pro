import type {
  TaskTransitionInput,
  TransitionResult,
} from './types';
import { TransitionErrorCode, KitchenTaskStatus } from './types';
import type { KitchenTaskStatus as KitchenTaskStatusType } from './types';

/**
 * Valid state transitions for kitchen tasks
 * Maps from current status to allowed target statuses
 */
export const VALID_TRANSITIONS: Record<string, KitchenTaskStatusType[]> = {
  [KitchenTaskStatus.open]: [KitchenTaskStatus.in_progress, KitchenTaskStatus.canceled],
  [KitchenTaskStatus.in_progress]: [KitchenTaskStatus.done, KitchenTaskStatus.canceled, KitchenTaskStatus.open],
  [KitchenTaskStatus.done]: [],
  [KitchenTaskStatus.canceled]: [],
} as const;

/**
 * Check if a transition from one status to another is valid
 * @param from - The current status
 * @param to - The target status
 * @returns true if the transition is allowed, false otherwise
 */
export function isValidTransition(
  from: string,
  to: string
): to is KitchenTaskStatusType {
  const validTargets = VALID_TRANSITIONS[from];
  if (!validTargets) {
    return false;
  }
  return validTargets.includes(to as KitchenTaskStatusType);
}

/**
 * Validate a state transition request
 * @param input - The transition input containing task and status information
 * @returns A TransitionResult containing validation outcome
 */
export function validateTransition(
  input: TaskTransitionInput
): TransitionResult<{
  fromStatus: KitchenTaskStatusType;
  toStatus: KitchenTaskStatusType;
  note?: string;
}> {
  const { currentStatus, targetStatus, note } = input;

  // Validate that both statuses are strings
  if (typeof currentStatus !== 'string' || typeof targetStatus !== 'string') {
    return {
      success: false,
      error: {
        code: TransitionErrorCode.INVALID_TRANSITION,
        message: 'Status values must be strings',
      },
    };
  }

  // Check if the transition is valid
  if (!isValidTransition(currentStatus, targetStatus)) {
    const validTargets = VALID_TRANSITIONS[currentStatus] || [];
    return {
      success: false,
      error: {
        code: TransitionErrorCode.INVALID_TRANSITION,
        message: `Cannot transition from '${currentStatus}' to '${targetStatus}'. Valid transitions: ${validTargets.join(', ') || 'none'}`,
      },
    };
  }

  return {
    success: true,
    data: {
      fromStatus: currentStatus as KitchenTaskStatusType,
      toStatus: targetStatus as KitchenTaskStatusType,
      note,
    },
  };
}

/**
 * Get the available transitions for a given status
 * @param currentStatus - The current status of the task
 * @returns Array of valid target statuses
 */
export function getAvailableTransitions(
  currentStatus: string
): KitchenTaskStatusType[] {
  return VALID_TRANSITIONS[currentStatus] || [];
}
