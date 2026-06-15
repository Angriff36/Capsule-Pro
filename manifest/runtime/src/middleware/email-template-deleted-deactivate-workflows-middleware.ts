/**
 * EmailTemplateDeleted → deactivate the EmailWorkflows that depend on the template.
 *
 * Implements the core orphan-event leg "EmailTemplateDeleted → EmailWorkflow.setActive(false)"
 * (IMPLEMENTATION_PLAN: Core / cross-cutting orphan events — the line-184 cluster).
 * Before this, `EmailTemplateDeleted` (core/email-template-rules.manifest:92, emitted by
 * `EmailTemplate.softDelete`) had ZERO consumers: soft-deleting a template left every
 * `EmailWorkflow` that referenced it (by `emailTemplateId`) still ACTIVE, so the email
 * trigger service would keep firing those workflows against a template that no longer
 * exists — sending broken/empty mail. This closes that gap: one governed
 * `EmailTemplate.softDelete` fans out to `EmailWorkflow.setActive(false)` for every active
 * workflow linked by `emailTemplateId`.
 *
 * WHY this is safe to cascade (unlike ClientArchived → withdraw Proposals, deferred):
 * `setActive` is a REVERSIBLE toggle — if the template is later recreated, an admin can
 * re-activate the workflow. There is no irreversibility hazard, so the
 * permanent-vs-reversible split that defers vendor-suspend / dish-eightySix does not apply
 * here. Deactivating a workflow whose template is gone is the correct protective action.
 *
 * WHY middleware and not a reaction: this is a 1:N fan-out — one deleted EmailTemplate has
 * MANY dependent EmailWorkflows, resolved by `emailTemplateId`. A declarative `on
 * EmailTemplateDeleted run EmailWorkflow.setActive` reaction resolves exactly ONE target
 * instance, so it structurally cannot reach the set. The template id is also reachable
 * only as the engine-stamped `event.subject?.id` — `softDelete()` takes NO params, so the
 * declared `templateId` event field is NOT auto-populated from `self.*` (mirrors the
 * VendorBlacklisted cascade reading `event.subject?.id`, not `payload.templateId`).
 *
 * The leg is GUARD-SAFE and IDEMPOTENT: only workflows that are still ACTIVE and not
 * soft-deleted are dispatched, so already-inactive workflows are skipped (no spurious
 * `EmailWorkflowUpdated` events) and deleted workflows are skipped rather than tripping
 * `setActive`'s `deletedAt == null` guard. A re-emitted `EmailTemplateDeleted` finds
 * nothing active and no-ops.
 *
 * KNOWN LIMITATION (documented, not silent): each dispatched `setActive` runs as the actor
 * who deleted the template and is subject to EmailWorkflow's policy (manager / admin /
 * system). `EmailTemplate.softDelete`'s default policy is manager / admin, a subset, so the
 * common path always aligns (no policy-skip class). A failure still surfaces through
 * `onDiagnostic` rather than being swallowed.
 */

import type {
  CommandResult,
  Middleware,
  MiddlewareContext,
  MiddlewareResult,
  Store,
} from "@angriff36/manifest";

interface RunCommandOptions {
  causationId?: string;
  correlationId?: string;
  entityName?: string;
  idempotencyKey?: string;
  instanceId?: string;
}

type DispatchCommand = (
  commandName: string,
  input: Record<string, unknown>,
  options: RunCommandOptions
) => Promise<CommandResult>;

export interface EmailTemplateDeletedDeactivateWorkflowsDiagnostic {
  detail?: Record<string, unknown>;
  reason: string;
  stage: string;
  templateId?: string;
  tenantId?: string;
  workflowId?: string;
}

export interface EmailTemplateDeletedDeactivateWorkflowsMiddlewareOptions {
  dispatchCommand: DispatchCommand;
  onDiagnostic?: (diag: EmailTemplateDeletedDeactivateWorkflowsDiagnostic) => void;
  storeProvider: (entityName: string) => Store | undefined;
}

interface EmailWorkflowRow {
  deletedAt?: unknown;
  emailTemplateId?: unknown;
  id?: unknown;
  isActive?: unknown;
  tenantId?: unknown;
}

const defaultDiagnostic = (
  diag: EmailTemplateDeletedDeactivateWorkflowsDiagnostic
): void => {
  // eslint-disable-next-line no-console
  console.warn(`[email-template-deleted-workflow-deactivate:${diag.stage}] ${diag.reason}`, {
    templateId: diag.templateId,
    tenantId: diag.tenantId,
    workflowId: diag.workflowId,
    ...diag.detail,
  });
};

export function createEmailTemplateDeletedDeactivateWorkflowsMiddleware(
  options: EmailTemplateDeletedDeactivateWorkflowsMiddlewareOptions
): Middleware {
  const {
    storeProvider,
    dispatchCommand,
    onDiagnostic = defaultDiagnostic,
  } = options;

  return {
    hooks: ["after-emit"],

    async handler(ctx: MiddlewareContext): Promise<MiddlewareResult> {
      const deletedEvents = ctx.emittedEvents.filter(
        (event) =>
          event.name === "EmailTemplateDeleted" &&
          ctx.entityName === "EmailTemplate" &&
          ctx.command.name === "softDelete"
      );

      for (const event of deletedEvents) {
        const payload = event.payload as { tenantId?: unknown } | undefined;

        // The template id is the engine-stamped source instance id — `softDelete()`
        // takes no params, so the declared `templateId` event field is NOT
        // auto-populated from self.* (mirrors the VendorBlacklisted cascade reading
        // event.subject?.id, not payload.templateId).
        const templateId = asNonEmptyString(event.subject?.id);
        const tenantId =
          asNonEmptyString(payload?.tenantId) ??
          asNonEmptyString(
            (ctx.runtimeContext.user as { tenantId?: unknown } | undefined)
              ?.tenantId
          );
        if (!(templateId && tenantId)) {
          onDiagnostic({
            stage: "resolve",
            reason: `EmailTemplateDeleted missing ${templateId ? "tenantId" : "templateId"}`,
            templateId,
            tenantId,
          });
          continue;
        }

        const store = storeProvider("EmailWorkflow");
        if (!store) {
          onDiagnostic({
            stage: "stores",
            reason: "EmailWorkflow store unavailable — deactivate cascade skipped",
            templateId,
            tenantId,
          });
          continue;
        }

        // Only ACTIVE, non-deleted workflows pointing at this template. Already-inactive
        // workflows are skipped so we never emit a no-op EmailWorkflowUpdated, and deleted
        // workflows are skipped rather than tripping setActive's deletedAt == null guard.
        const dependentWorkflows = (await store.getAll())
          .map((row) => row as EmailWorkflowRow)
          .filter(
            (row) =>
              asNonEmptyString(row.tenantId) === tenantId &&
              asNonEmptyString(row.emailTemplateId) === templateId &&
              row.deletedAt == null &&
              row.isActive === true
          );

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
              causationId: "EmailTemplateDeleted",
              idempotencyKey: `email-template-deleted-workflow-deactivate:${tenantId}:${templateId}:${workflowId}`,
            }
          );

          if (result.emittedEvents) {
            ctx.emittedEvents.push(...result.emittedEvents);
          }
          if (!result.success) {
            onDiagnostic({
              stage: "dispatch",
              reason: `EmailWorkflow.setActive failed for ${workflowId}: ${result.error ?? "unknown"}`,
              templateId,
              tenantId,
              workflowId,
            });
            continue;
          }

          onDiagnostic({
            stage: "done",
            reason: "EmailWorkflow.setActive(false) applied for deleted template",
            templateId,
            tenantId,
            workflowId,
          });
        }
      }

      return {};
    },
  };
}

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
