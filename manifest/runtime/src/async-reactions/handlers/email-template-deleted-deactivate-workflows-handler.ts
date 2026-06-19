/**
 * Async reaction handler for email template deletion → workflow deactivation.
 *
 * Deferred counterpart of {@link createEmailTemplateDeletedDeactivateWorkflowsMiddleware}.
 * When `EmailTemplateDeleted` fires (from `EmailTemplate.softDelete`), the
 * middleware (with async enabled) ENQUEUES a job; this handler runs LATER in
 * the worker, loads all `EmailWorkflow` rows linked to the deleted template
 * (by `emailTemplateId`), and dispatches the governed
 * `EmailWorkflow.setActive(false)` per active workflow so the email trigger
 * service stops firing against a template that no longer exists.
 *
 * The template id is the engine-stamped source instance id — `softDelete()`
 * takes no params, so the declared `templateId` event field is not
 * auto-populated from `self.*`. The handler receives it as the job's
 * `triggeringEvent.subjectId`.
 *
 * Guard-safe + idempotent: only workflows that are still ACTIVE and not
 * soft-deleted are dispatched, so already-inactive workflows are skipped (no
 * spurious `EmailWorkflowUpdated`) and deleted workflows are skipped rather
 * than tripping `setActive`'s `deletedAt == null` guard. A re-delivered job
 * finds nothing active and no-ops. Each dispatch carries a per-(tenant,
 * template, workflow) idempotency key.
 *
 * Partial failures: if at least one workflow is deactivated the job is treated
 * as delivered; failed workflows are surfaced via `log.warn`. Only when every
 * dispatch fails does the handler throw so the retry/DLQ path engages.
 */

import type {
  AsyncReactionHandler,
  AsyncReactionHandlerContext,
} from "..";

/** Reaction name registered with {@link asyncReactionRegistry}. */
export const EMAIL_TEMPLATE_DELETED_DEACTIVATE_WORKFLOWS_REACTION =
  "emailTemplateDeletedDeactivateWorkflows";

interface EmailWorkflowRow {
  deletedAt?: unknown;
  emailTemplateId?: unknown;
  id?: unknown;
  isActive?: unknown;
  tenantId?: unknown;
}

interface ManifestStore {
  getAll(): Promise<unknown[]>;
}

/**
 * Handler implementation. Exposed for direct unit testing (the registry
 * registers a thin wrapper around it).
 */
export const emailTemplateDeletedDeactivateWorkflowsHandler: AsyncReactionHandler =
  async (ctx: AsyncReactionHandlerContext): Promise<void> => {
    const { job, dispatchCommand, storeProvider, log } = ctx;
    const templateId = job.triggeringEvent.subjectId;
    const tenantId = job.tenantId;

    if (!templateId) {
      log.warn?.(
        "emailTemplateDeletedDeactivate: missing subjectId — skipping",
        { jobId: job.id }
      );
      return;
    }

    const store = storeProvider("EmailWorkflow") as ManifestStore | undefined;
    if (!store) {
      throw new Error("EmailWorkflow store unavailable");
    }

    const dependentWorkflows = (
      (await store.getAll()) as EmailWorkflowRow[]
    ).filter(
      (row) =>
        asNonEmptyString(row.tenantId) === tenantId &&
        asNonEmptyString(row.emailTemplateId) === templateId &&
        row.deletedAt == null &&
        row.isActive === true
    );

    if (dependentWorkflows.length === 0) {
      return;
    }

    const eventName = job.triggeringEvent.name;
    let failures = 0;

    for (const row of dependentWorkflows) {
      const workflowId = asNonEmptyString(row.id);
      if (!workflowId) {
        continue;
      }

      const result = await dispatchCommand(
        "setActive",
        { isActive: false },
        {
          entityName: "EmailWorkflow",
          instanceId: workflowId,
          correlationId: templateId,
          causationId: eventName,
          idempotencyKey: `email-template-deleted-wf:${tenantId}:${templateId}:${workflowId}`,
        }
      );

      if (!result.success) {
        failures++;
        log.warn?.(
          "emailTemplateDeletedDeactivate: setActive failed for workflow",
          {
            jobId: job.id,
            templateId,
            workflowId,
            error: result.error ?? "unknown",
          }
        );
      }
    }

    if (failures > 0 && failures === dependentWorkflows.length) {
      throw new Error(
        `EmailWorkflow.setActive failed for all ${failures} workflow(s): ${job.id}`
      );
    }
  };

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
