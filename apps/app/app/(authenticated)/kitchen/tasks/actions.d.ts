import {
  type KitchenTask,
  type KitchenTaskClaim,
  type KitchenTaskProgress,
  type KitchenTaskStatus,
} from "@repo/database";
/**
 * List all kitchen tasks with optional filters
 */
export declare const getKitchenTasks: (filters?: {
  status?: string;
  priority?: number;
}) => Promise<KitchenTask[]>;
/**
 * Get a single kitchen task by ID
 */
export declare const getKitchenTaskById: (
  taskId: string
) => Promise<KitchenTask | null>;
/**
 * Get tasks filtered by status
 */
export declare const getKitchenTasksByStatus: (
  status: string
) => Promise<KitchenTask[]>;
/**
 * Get urgent priority tasks that are open or in progress
 */
export declare const getUrgentTasks: () => Promise<KitchenTask[]>;
/**
 * Create a new kitchen task
 */
export declare const createKitchenTask: (
  formData: FormData
) => Promise<KitchenTask>;
/**
 * Update kitchen task fields
 */
export declare const updateKitchenTask: (
  formData: FormData
) => Promise<KitchenTask>;
/**
 * Update only the status of a task
 */
export declare const updateKitchenTaskStatus: (
  taskId: string,
  status: KitchenTaskStatus
) => Promise<KitchenTask>;
/**
 * Delete a kitchen task
 */
export declare const deleteKitchenTask: (taskId: string) => Promise<void>;
/**
 * Claim a task for a user and set status to in_progress
 */
export declare const claimTask: (
  taskId: string,
  employeeId: string
) => Promise<KitchenTaskClaim>;
/**
 * Release a task claim
 */
export declare const releaseTask: (
  taskId: string,
  reason?: string | null
) => Promise<KitchenTaskClaim | null>;
/**
 * Get all claims for a task
 */
export declare const getTaskClaims: (
  taskId: string
) => Promise<KitchenTaskClaim[]>;
/**
 * Get user's active (unreleased) claims
 */
export declare const getMyActiveClaims: (
  employeeId: string
) => Promise<KitchenTaskClaim[]>;
/**
 * Add a progress entry for a task
 */
export declare const addTaskProgress: (
  taskId: string,
  employeeId: string,
  progressType: string,
  options?: {
    oldStatus?: string;
    newStatus?: string;
    quantityCompleted?: number;
    notes?: string;
  }
) => Promise<KitchenTaskProgress>;
/**
 * Get progress history for a task
 */
export declare const getTaskProgressLog: (
  taskId: string
) => Promise<KitchenTaskProgress[]>;
//# sourceMappingURL=actions.d.ts.map
