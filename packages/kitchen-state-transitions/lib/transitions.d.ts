import type {
  KitchenTaskStatus as KitchenTaskStatusType,
  TaskTransitionInput,
  TransitionResult,
} from "./types";
/**
 * Valid state transitions for kitchen tasks
 * Maps from current status to allowed target statuses
 */
export declare const VALID_TRANSITIONS: Record<string, KitchenTaskStatusType[]>;
/**
 * Check if a transition from one status to another is valid
 * @param from - The current status
 * @param to - The target status
 * @returns true if the transition is allowed, false otherwise
 */
export declare function isValidTransition(
  from: string,
  to: string
): to is KitchenTaskStatusType;
/**
 * Validate a state transition request
 * @param input - The transition input containing task and status information
 * @returns A TransitionResult containing validation outcome
 */
export declare function validateTransition(
  input: TaskTransitionInput
): TransitionResult<{
  fromStatus: KitchenTaskStatusType;
  toStatus: KitchenTaskStatusType;
  note?: string;
}>;
/**
 * Get the available transitions for a given status
 * @param currentStatus - The current status of the task
 * @returns Array of valid target statuses
 */
export declare function getAvailableTransitions(
  currentStatus: string
): KitchenTaskStatusType[];
//# sourceMappingURL=transitions.d.ts.map
