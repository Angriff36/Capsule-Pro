/**
 * Middleware conformance — `EmailTemplateDeleted → deactivate dependent SmsAutomationRules`
 * (IMPLEMENTATION_PLAN: Integrations & versioning — the explicitly-named
 * `on EmailTemplateDeleted run SmsAutomationRule.deactivate` leg).
 *
 * WHY this matters (not just WHAT it does): `SmsAutomationRule.belongsTo template:
 * EmailTemplate with templateId` (integrations/sms-automation-rules.manifest:97). Before this,
 * soft-deleting an email template left every SMS automation rule that referenced it still
 * ACTIVE, so the SMS automation trigger service would keep firing those rules against a
 * template whose content no longer exists — sending broken/empty SMS. The cascade closes that
 * gap: one governed `EmailTemplate.softDelete` fans out to `SmsAutomationRule.deactivate()`
 * for every still-active rule linked by `templateId`. It is the SMS sibling of the EmailWorkflow
 * cascade.
 *
 * The test runs against the REAL compiled IR through the runtime engine WITH the cascade
 * middleware wired (exactly as the factory wires it), so it FAILS LOUDLY when the BUSINESS
 * propagation regresses — an active dependent rule left enabled, an unrelated/custom-message-
 * only/already-inactive/deleted rule wrongly touched, the engine ceasing to dispatch — not
 * merely on a shape change (CLAUDE.md Rule 9; constitution §13). It also regression-locks that
 * nobody re-expresses this 1:N fan-out as a (dead) IR reaction.
 */

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Store } from "@angriff36/manifest";
import { describe, expect, it } from "vitest";
import { createCustomBuiltins } from "../manifest-builtins.js";
import { createEmailTemplateDeletedDeactivateSmsRulesMiddleware } from "../middleware/email-template-deleted-sms-rule-deactivate-middleware.js";
import { runManifestCommandCore } from "../run-manifest-command-core.js";
import { ManifestRuntimeEngine } from "../runtime-engine.js";

const here = dirname(fileURLToPath(import.meta.url));
const irPath = join(here, "..", "..", "..", "ir", "kitchen.ir.json");
// biome-ignore lint/suspicious/noExplicitAny: IR is structural JSON; engine accepts it.
const ir: any = JSON.parse(readFileSync(irPath, "utf8"));

const TENANT = "t-email-template-sms";
// admin satisfies EmailTemplate.softDelete (manager/admin) AND SmsAutomationRule.deactivate
// (manager/admin) policies — the natural, aligned actor.
const USER = { id: "u-admin", tenantId: TENANT, role: "admin" } as const;

const TEMPLATE_ID = "tmpl-sms-001";

// Minimal persistent in-memory store (mirrors the upstream MemoryStore contract).
class Mem implements Store {
  private readonly items = new Map<string, Record<string, unknown>>();
  // biome-ignore lint/suspicious/noExplicitAny: structural rows.
  async getAll(): Promise<any[]> {
    return Array.from(this.items.values()) as never;
  }
  // biome-ignore lint/suspicious/noExplicitAny: structural rows.
  async getById(id: string): Promise<any> {
    return this.items.get(id) as never;
  }
  // biome-ignore lint/suspicious/noExplicitAny: structural rows.
  async create(data: any): Promise<any> {
    const id = (data.id as string) ?? crypto.randomUUID();
    const row = { ...data, id };
    this.items.set(id, row);
    return row as never;
  }
  // biome-ignore lint/suspicious/noExplicitAny: structural rows.
  async update(id: string, data: any): Promise<any> {
    const existing = this.items.get(id);
    if (!existing) {
      return undefined as never;
    }
    const row = { ...existing, ...data, id };
    this.items.set(id, row);
    return row as never;
  }
  async delete(id: string): Promise<boolean> {
    return this.items.delete(id);
  }
  async clear(): Promise<void> {
    this.items.clear();
  }
}

function makeProvider(): (entity: string) => Store {
  const stores = new Map<string, Mem>();
  return (entity: string): Store => {
    let store = stores.get(entity);
    if (!store) {
      store = new Mem();
      stores.set(entity, store);
    }
    return store;
  };
}

/** Engine wired with the email-template-deleted SMS cascade middleware (as the factory does). */
function newEngine(provider: (entity: string) => Store): ManifestRuntimeEngine {
  let engine: ManifestRuntimeEngine;
  const middleware = [
    createEmailTemplateDeletedDeactivateSmsRulesMiddleware({
      storeProvider: provider,
      dispatchCommand: (commandName, input, options) =>
        engine.runCommand(commandName, input, options),
      onDiagnostic: () => {
        /* silence default console.warn in tests */
      },
    }),
  ];
  engine = new ManifestRuntimeEngine(
    ir,
    {
      tenantId: USER.tenantId,
      user: { id: USER.id, tenantId: USER.tenantId, role: USER.role },
    },
    {
      storeProvider: provider,
      customBuiltins: createCustomBuiltins(),
      middleware,
      generateId: () => randomUUID(),
      now: () => Date.now(),
    }
  );
  return engine;
}

async function seedTemplate(
  provider: (entity: string) => Store,
  id = TEMPLATE_ID
) {
  // Satisfy EmailTemplate's entity-level constraints (requireName/requireSubject) so
  // softDelete's deletedAt mutate is not silently dropped on persist.
  await provider("EmailTemplate").create({
    id,
    tenantId: TENANT,
    name: "Welcome Email",
    templateType: "custom",
    subject: "Welcome!",
    body: "Hello",
    mergeFields: "[]",
    isActive: true,
    isDefault: false,
  } as never);
}

let ruleSeq = 0;
async function seedRule(
  provider: (entity: string) => Store,
  overrides: {
    id: string;
    isActive?: boolean;
    templateId?: string;
    customMessage?: string;
    deletedAt?: number;
  }
) {
  ruleSeq += 1;
  // Satisfy SmsAutomationRule's entity-level constraints (requireName/validTriggerType/
  // hasMessageOrTemplate) so deactivate's isActive mutate is not silently dropped on persist.
  await provider("SmsAutomationRule").create({
    id: overrides.id,
    tenantId: TENANT,
    name: `Rule ${ruleSeq}`,
    description: "",
    triggerType: "custom_event",
    triggerConfig: "{}",
    templateId: overrides.templateId ?? TEMPLATE_ID,
    customMessage: overrides.customMessage ?? "",
    recipientType: "employee",
    recipientConfig: "{}",
    isActive: overrides.isActive ?? true,
    priority: 100,
    ...(overrides.deletedAt == null ? {} : { deletedAt: overrides.deletedAt }),
  } as never);
}

function deleteTemplate(
  engine: ManifestRuntimeEngine,
  templateId = TEMPLATE_ID
) {
  return runManifestCommandCore(
    { createRuntime: async () => engine },
    {
      entity: "EmailTemplate",
      command: "softDelete",
      body: { id: templateId, tenantId: TENANT },
      user: { ...USER },
    }
  );
}

// biome-ignore lint/suspicious/noExplicitAny: structural event rows.
function eventNames(result: any): string[] {
  return (
    (result.ok ? result.events : [])?.map((e: { name: string }) => e.name) ?? []
  );
}

async function isActiveOf(
  provider: (entity: string) => Store,
  id: string
): Promise<unknown> {
  const row = (await provider("SmsAutomationRule").getById(id)) as Record<
    string,
    unknown
  >;
  return row?.isActive;
}

describe("Middleware conformance: EmailTemplateDeleted → deactivate dependent SmsAutomationRules", () => {
  it("the compiled IR carries NO EmailTemplateDeleted→SmsAutomationRule reaction (it is a 1:N middleware cascade)", () => {
    const reactions: Record<string, unknown>[] = ir.reactions ?? [];
    const stale = reactions.filter(
      (r) =>
        r.event === "EmailTemplateDeleted" &&
        (r.targetEntity === "SmsAutomationRule" || r.command === "deactivate")
    );
    // A regression here means someone tried to express this fan-out as a reaction,
    // which structurally cannot resolve the many dependent rules — it must stay middleware.
    expect(stale).toHaveLength(0);
  });

  it("deleting a template deactivates every active rule that depends on it, leaving other templates' / custom-message-only rules alone", async () => {
    const provider = makeProvider();
    await seedTemplate(provider);
    await seedRule(provider, { id: "rule-a", isActive: true });
    await seedRule(provider, { id: "rule-b", isActive: true });
    // A rule bound to a DIFFERENT template MUST NOT be touched (negative control).
    await seedRule(provider, {
      id: "rule-other",
      isActive: true,
      templateId: "tmpl-999",
    });
    // A custom-message-only rule (no templateId) does NOT depend on any template, so the
    // deleted template must not deactivate it (negative control).
    await seedRule(provider, {
      id: "rule-custom",
      isActive: true,
      templateId: "",
      customMessage: "Your order is ready!",
    });

    const engine = newEngine(provider);
    const result = await deleteTemplate(engine);
    expect(result.ok).toBe(true);

    // THE PROOF: every active dependent rule is now deactivated.
    expect(await isActiveOf(provider, "rule-a")).toBe(false);
    expect(await isActiveOf(provider, "rule-b")).toBe(false);
    // Unrelated / custom-message-only rules are untouched.
    expect(await isActiveOf(provider, "rule-other")).toBe(true);
    expect(await isActiveOf(provider, "rule-custom")).toBe(true);

    // The template itself reached the soft-deleted state.
    const template = (await provider("EmailTemplate").getById(
      TEMPLATE_ID
    )) as Record<string, unknown>;
    expect(template.deletedAt).toBeTruthy();

    // Secondary proof: SmsAutomationRuleDeactivated bubbled up exactly twice — only possible
    // if the cascade actually dispatched the governed deactivate command for both rules.
    const names = eventNames(result);
    expect(names).toContain("EmailTemplateDeleted");
    expect(
      names.filter((n) => n === "SmsAutomationRuleDeactivated")
    ).toHaveLength(2);
  });

  it("never touches already-inactive or soft-deleted rules (no spurious events, guard-safe)", async () => {
    const provider = makeProvider();
    await seedTemplate(provider);
    // Already-inactive: deactivating again would trip deactivate's `isActive == true` guard
    // (swallowed failure) — the isActive filter is what protects it.
    await seedRule(provider, { id: "rule-inactive", isActive: false });
    // Soft-deleted: deactivate guards deletedAt == null, so dispatching would be a swallowed
    // failure. softDelete already sets isActive=false; the deletedAt filter protects it.
    await seedRule(provider, {
      id: "rule-deleted",
      isActive: false,
      deletedAt: Date.now(),
    });
    // One genuinely-active dependent rule proves the cascade still ran.
    await seedRule(provider, { id: "rule-live", isActive: true });

    const engine = newEngine(provider);
    const result = await deleteTemplate(engine);
    expect(result.ok).toBe(true);

    expect(await isActiveOf(provider, "rule-inactive")).toBe(false);
    expect(await isActiveOf(provider, "rule-live")).toBe(false);
    expect(await isActiveOf(provider, "rule-deleted")).toBe(false);
    // Only the genuinely-active, non-deleted one produced a deactivation event.
    expect(
      eventNames(result).filter((n) => n === "SmsAutomationRuleDeactivated")
    ).toHaveLength(1);
  });
});
