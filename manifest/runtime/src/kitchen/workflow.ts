import type { KitchenOpsContext, WorkflowMetadataOptions } from "./types";

/**
 * Helper to extract workflow metadata from context for runCommand options.
 * @example
 * ```typescript
 * const runtime = await createPrepTaskRuntime({
 *   tenantId,
 *   userId,
 *   correlationId: 'evt-123',
 *   causationId: 'schedule-evt-123'
 * });
 *
 * const options = getWorkflowOptions(runtime);
 * await engine.runCommand("claim", {...}, {...options});
 * ```
 */
export function getWorkflowOptions(
  context: KitchenOpsContext
): WorkflowMetadataOptions {
  const options: WorkflowMetadataOptions = {};
  if (context.correlationId !== undefined) {
    options.correlationId = context.correlationId;
  }
  if (context.causationId !== undefined) {
    options.causationId = context.causationId;
  }
  return options;
}
