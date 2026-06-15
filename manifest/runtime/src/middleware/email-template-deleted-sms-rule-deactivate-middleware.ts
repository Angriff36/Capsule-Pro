/**
 * EmailTemplateDeleted → deactivate the SmsAutomationRules that depend on the template.
 *
 * Implements the clean leg of the P1 item "SmsAutomationRule as a reaction target"
 * (IMPLEMENTATION_PLAN: Integrations & versioning) — the explicitly-named
 * `on EmailTemplateDeleted run SmsAutomationRule.deactivate` propagation. It is the direct
 * SMS sibling of `email-template-deleted-deactivate-workflows-middleware` (which closes the
 * same cascade for EmailWorkflows).
 *
 * Before this, soft-deleting an EmailTemplate left every `SmsAutomationRule` that referenced
 * it (`SmsAutomationRule.belongsTo template: EmailTemplate with templateId`,
 * integrations/sms-automation-rules.manifest:97) still ACTIVE — so the SMS automation
 * trigger service would keep firing those rules against a template whose content no longer
 * exists, sending broken/empty SMS. This closes that gap: one governed
 * `EmailTemplate.softDelete` fans out to `SmsAutomationRule.deactivate()` for every active
 * rule linked by `templateId`.
 *
 * SCOPE: only the deactivate-on-template-delete leg. The broader "wire EConfirmed/
 * ContractSigned/EventStaffAssigned/ProposalAccepted business events into SMS automation"
 * fan-out (the other half of that plan item) is a separate, larger feature and is NOT
 * implemented here.
 *
 * WHY this is safe to cascade (unlike ClientArchived → withdraw Proposals, deferred):
 * `deactivate` is a REVERSIBLE toggle (`activate` re-enables it) — if the template is later
 * recreated, an admin can re-activate the rule. There is no irreversibility hazard, so the
 * permanent-vs-reversible split that defers vendor-suspend / dish-eightySix does not apply.
 * Deactivating a rule whose template is gone is the correct protective action.
 *
 * WHY middleware and not a reaction: this is a 1:N fan-out — one deleted EmailTemplate has
 * MANY dependent SmsAutomationRules, resolved by `templateId`. A declarative
 * `on EmailTemplateDeleted run SmsAutomationRule.deactivate` reaction resolves exactly ONE
 * target instance, so it structurally cannot reach the set. The template id is also reachable
 * only as the engine-stamped `event.subject?.id` — `softDelete()` takes NO params, so the
 * declared `templateId` event field is NOT auto-populated from `self.*` (mirrors the
 * EmailWorkflow / VendorBlacklisted cascades reading `event.subject?.id`).
 *
 * The leg is GUARD-SAFE and IDEMPOTENT: only rules that are still ACTIVE, not soft-deleted,
 * and that genuinely point at this template (non-empty `templateId` match) are dispatched —
 * so already-inactive rules are skipped (no spurious `SmsAutomationRuleDeactivated` events),
 * deleted rules are skipped rather than tripping `deactivate`'s `deletedAt == null` guard, and
 * custom-message-only rules (no `templateId`) are correctly left untouched. A re-emitted
 * `EmailTemplateDeleted` finds nothing active and no-ops.
 *
 * KNOWN LIMITATION (documented, not silent): each dispatched `deactivate` runs as the actor
 * who deleted the template and is subject to SmsAutomationRule's policy (manager / admin).
 * `EmailTemplate.softDelete`'s default policy is manager / admin, the same set, so the common
 * path always aligns. A failure still surfaces through `onDiagnostic` rather than being
 * swallowed.
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

export interface EmailTemplateDeletedDeactivateSmsRulesDiagnostic {
  detail?: Record<string, unknown>;
  reason: string;
  ruleId?: string;
  stage: string;
  templateId?: string;
  tenantId?: string;
}

export interface EmailTemplateDeletedDeactivateSmsRulesMiddlewareOptions {
  dispatchCommand: DispatchCommand;
  onDiagnostic?: (
    diag: EmailTemplateDeletedDeactivateSmsRulesDiagnostic
  ) => void;
  storeProvider: (entityName: string) => Store | undefined;
}

interface SmsAutomationRuleRow {
  deletedAt?: unknown;
  id?: unknown;
  isActive?: unknown;
  templateId?: unknown;
  tenantId?: unknown;
}

const defaultDiagnostic = (
  diag: EmailTemplateDeletedDeactivateSmsRulesDiagnostic
): void => {
  // eslint-disable-next-line no-console
  console.warn(
    `[email-template-deleted-sms-rule-deactivate:${diag.stage}] ${diag.reason}`,
    {
      templateId: diag.templateId,
      tenantId: diag.tenantId,
      ruleId: diag.ruleId,
      ...diag.detail,
    }
  );
};

export function createEmailTemplateDeletedDeactivateSmsRulesMiddleware(
  options: EmailTemplateDeletedDeactivateSmsRulesMiddlewareOptions
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
        // auto-populated from self.* (mirrors the EmailWorkflow cascade reading
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

        const store = storeProvider("SmsAutomationRule");
        if (!store) {
          onDiagnostic({
            stage: "stores",
            reason:
              "SmsAutomationRule store unavailable — deactivate cascade skipped",
            templateId,
            tenantId,
          });
          continue;
        }

        // Only ACTIVE, non-deleted rules whose templateId genuinely points at this
        // template. Already-inactive rules are skipped so we never emit a no-op
        // SmsAutomationRuleDeactivated; deleted rules are skipped rather than tripping
        // deactivate's deletedAt == null guard; custom-message-only rules (templateId
        // "") never match the non-empty templateId compare, so they stay untouched.
        const dependentRules = (await store.getAll())
          .map((row) => row as SmsAutomationRuleRow)
          .filter(
            (row) =>
              asNonEmptyString(row.tenantId) === tenantId &&
              asNonEmptyString(row.templateId) === templateId &&
              row.deletedAt == null &&
              row.isActive === true
          );

        for (const row of dependentRules) {
          const ruleId = asNonEmptyString(row.id);
          if (!ruleId) {
            continue;
          }

          const result = await dispatchCommand(
            "deactivate",
            {},
            {
              entityName: "SmsAutomationRule",
              instanceId: ruleId,
              correlationId: templateId,
              causationId: "EmailTemplateDeleted",
              idempotencyKey: `email-template-deleted-sms-rule-deactivate:${tenantId}:${templateId}:${ruleId}`,
            }
          );

          if (result.emittedEvents) {
            ctx.emittedEvents.push(...result.emittedEvents);
          }
          if (!result.success) {
            onDiagnostic({
              stage: "dispatch",
              reason: `SmsAutomationRule.deactivate failed for ${ruleId}: ${result.error ?? "unknown"}`,
              templateId,
              tenantId,
              ruleId,
            });
            continue;
          }

          onDiagnostic({
            stage: "done",
            reason:
              "SmsAutomationRule.deactivate() applied for deleted template",
            templateId,
            tenantId,
            ruleId,
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
