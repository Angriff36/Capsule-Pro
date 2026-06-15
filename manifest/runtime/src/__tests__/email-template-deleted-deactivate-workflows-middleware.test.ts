/**
 * Middleware conformance — `EmailTemplateDeleted → deactivate dependent EmailWorkflows`
 * (IMPLEMENTATION_PLAN: Core / cross-cutting orphan events, line-184 cluster).
 *
 * WHY this matters (not just WHAT it does): before this, `EmailTemplateDeleted` had ZERO
 * consumers. Soft-deleting an email template left every `EmailWorkflow` that referenced it
 * (by `emailTemplateId`) still ACTIVE, so the email trigger service would keep firing those
 * workflows against a template that no longer exists — sending broken/empty mail. The
 * cascade closes that gap: one governed `EmailTemplate.softDelete` fans out to
 * `EmailWorkflow.setActive(false)` for every still-active workflow linked by the template.
 *
 * The test runs against the REAL compiled IR through the runtime engine WITH the cascade
 * middleware wired (exactly as the factory wires it), so it FAILS LOUDLY when the BUSINESS
 * propagation regresses — an active dependent workflow left enabled, an unrelated/
 * already-inactive/deleted workflow wrongly touched, the engine ceasing to dispatch — not
 * merely on a shape change (CLAUDE.md Rule 9; constitution §13). It also regression-locks
 * that nobody re-expresses this 1:N fan-out as a (dead) IR reaction.
 */

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Store } from "@angriff36/manifest";
import { describe, expect, it } from "vitest";
import { createCustomBuiltins } from "../manifest-builtins.js";
import { createEmailTemplateDeletedDeactivateWorkflowsMiddleware } from "../middleware/email-template-deleted-deactivate-workflows-middleware.js";
import { runManifestCommandCore } from "../run-manifest-command-core.js";
import { ManifestRuntimeEngine } from "../runtime-engine.js";

const here = dirname(fileURLToPath(import.meta.url));
const irPath = join(here, "..", "..", "..", "ir", "kitchen.ir.json");
// biome-ignore lint/suspicious/noExplicitAny: IR is structural JSON; engine accepts it.
const ir: any = JSON.parse(readFileSync(irPath, "utf8"));

const TENANT = "t-email-template-delete";
// admin satisfies EmailTemplate.softDelete (manager/admin) AND EmailWorkflow.setActive
// (manager/admin/system) policies — the natural, aligned actor.
const USER = { id: "u-admin", tenantId: TENANT, role: "admin" } as const;

const TEMPLATE_ID = "tmpl-001";

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

/** Engine wired with the email-template-deleted cascade middleware (as the factory does). */
function newEngine(provider: (entity: string) => Store): ManifestRuntimeEngine {
  let engine: ManifestRuntimeEngine;
  const middleware = [
    createEmailTemplateDeletedDeactivateWorkflowsMiddleware({
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

let wfSeq = 0;
async function seedWorkflow(
  provider: (entity: string) => Store,
  overrides: {
    id: string;
    isActive?: boolean;
    emailTemplateId?: string;
    deletedAt?: number;
  }
) {
  wfSeq += 1;
  await provider("EmailWorkflow").create({
    id: overrides.id,
    tenantId: TENANT,
    name: `Workflow ${wfSeq}`,
    triggerType: "custom",
    triggerConfig: "{}",
    emailTemplateId: overrides.emailTemplateId ?? TEMPLATE_ID,
    emailTemplateTenantId: TENANT,
    recipientConfig: "{}",
    isActive: overrides.isActive ?? true,
    ...(overrides.deletedAt != null ? { deletedAt: overrides.deletedAt } : {}),
  } as never);
}

function deleteTemplate(engine: ManifestRuntimeEngine, templateId = TEMPLATE_ID) {
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
  return (result.ok ? result.events : [])?.map((e: { name: string }) => e.name) ?? [];
}

async function isActiveOf(
  provider: (entity: string) => Store,
  id: string
): Promise<unknown> {
  const row = (await provider("EmailWorkflow").getById(id)) as Record<string, unknown>;
  return row?.isActive;
}

describe("Middleware conformance: EmailTemplateDeleted → deactivate dependent EmailWorkflows", () => {
  it("the compiled IR carries NO EmailTemplateDeleted→X reaction (it is a 1:N middleware cascade)", () => {
    const reactions: Record<string, unknown>[] = ir.reactions ?? [];
    const stale = reactions.filter((r) => r.event === "EmailTemplateDeleted");
    // A regression here means someone tried to express this fan-out as a reaction,
    // which structurally cannot resolve the many dependent workflows — it must stay
    // middleware.
    expect(stale).toHaveLength(0);
  });

  it("deleting a template deactivates every active workflow that depends on it, leaving other templates' workflows alone", async () => {
    const provider = makeProvider();
    await seedTemplate(provider);
    await seedWorkflow(provider, { id: "wf-a", isActive: true });
    await seedWorkflow(provider, { id: "wf-b", isActive: true });
    // A workflow bound to a DIFFERENT template MUST NOT be touched (negative control).
    await seedWorkflow(provider, {
      id: "wf-other",
      isActive: true,
      emailTemplateId: "tmpl-999",
    });

    const engine = newEngine(provider);
    const result = await deleteTemplate(engine);
    expect(result.ok).toBe(true);

    // THE PROOF: every active dependent workflow is now deactivated.
    expect(await isActiveOf(provider, "wf-a")).toBe(false);
    expect(await isActiveOf(provider, "wf-b")).toBe(false);
    // The unrelated template's workflow is untouched.
    expect(await isActiveOf(provider, "wf-other")).toBe(true);

    // The template itself reached the soft-deleted state.
    const template = (await provider("EmailTemplate").getById(TEMPLATE_ID)) as Record<
      string,
      unknown
    >;
    expect(template.deletedAt).toBeTruthy();

    // Secondary proof: EmailWorkflowUpdated bubbled up exactly twice — only possible if
    // the cascade actually dispatched the governed setActive command for both workflows.
    const names = eventNames(result);
    expect(names).toContain("EmailTemplateDeleted");
    expect(names.filter((n) => n === "EmailWorkflowUpdated")).toHaveLength(2);
  });

  it("never touches already-inactive or soft-deleted workflows (no spurious updates, guard-safe)", async () => {
    const provider = makeProvider();
    await seedTemplate(provider);
    // Already-inactive: deactivating again would be a no-op that still emits an event.
    await seedWorkflow(provider, { id: "wf-inactive", isActive: false });
    // Soft-deleted: setActive guards deletedAt == null, so dispatching would be a
    // swallowed failure. A real soft-deleted workflow is already inactive (softDelete
    // sets isActive=false), so the deletedAt filter is what protects it from a dispatch.
    await seedWorkflow(provider, {
      id: "wf-deleted",
      isActive: false,
      deletedAt: Date.now(),
    });
    // One genuinely-active dependent workflow proves the cascade still ran.
    await seedWorkflow(provider, { id: "wf-live", isActive: true });

    const engine = newEngine(provider);
    const result = await deleteTemplate(engine);
    expect(result.ok).toBe(true);

    expect(await isActiveOf(provider, "wf-inactive")).toBe(false);
    expect(await isActiveOf(provider, "wf-live")).toBe(false);
    // The soft-deleted workflow stays inactive (it was already false on softDelete) and
    // is not re-dispatched.
    expect(await isActiveOf(provider, "wf-deleted")).toBe(false);
    // Only the genuinely-active, non-deleted one produced an update.
    expect(
      eventNames(result).filter((n) => n === "EmailWorkflowUpdated")
    ).toHaveLength(1);
  });
});
