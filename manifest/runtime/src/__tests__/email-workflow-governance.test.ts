import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { RuntimeEngine } from "@angriff36/manifest";
import { compileToIR } from "@angriff36/manifest/ir-compiler";
import { beforeEach, describe, expect, it } from "vitest";
import { runManifestCommandCore } from "../run-manifest-command-core.js";

const here = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// EmailWorkflow governance migration (Task 8.3).
//
// WHY this matters (not just WHAT it does): `settings/email-workflows/actions.ts`
// used to write `database.emailWorkflow` directly (constitution §9 violation).
// Routing those four writes through the Manifest runtime exposed three real
// command-contract gaps that these tests pin so they cannot regress:
//
//   1. The legacy `update` command OMITTED `triggerType` — the settings UI could
//      not change a workflow's trigger type. `update` now carries it; the
//      "update changes triggerType" test is the regression guard.
//   2. The toggle (isActive only) had NO partial command. Routing it through the
//      full-overwrite `update` would clobber name/config with whatever the caller
//      passed. `setActive` is the dedicated partial command; the test proves it
//      leaves the other fields untouched.
//   3. `emailTemplateTenantId` (the composite tenant key the template-name read
//      join resolves against) was unmodeled, so a migrated create/update would
//      silently break the `emailTemplate` include. create/update now persist it.
//
//   4. `recordTriggered` stamps `lastTriggeredAt` after a workflow successfully
//      sends an email. This is called by cron routes via a governed callback
//      (replacing the direct Prisma write in the notifications package).
//      The default policy was widened to include "system" so the cron runtime
//      (which authenticates as a system user) can execute it.
//
// `triggerConfig`/`recipientConfig` map to Prisma `Json` columns but are modeled
// as `string` (repo convention); the GenericPrismaStore passes the value through
// (`asJsonInput` does not parse), so the runtime must accept OBJECT bodies and
// store them verbatim. The "persists the Json config objects" assertion locks
// that contract.
//
// The inline SOURCE below MUST stay in sync with `manifest/source/
// email-workflow-rules.manifest` (minus `store ... in durable`, so the test runs
// on the engine's default in-memory store). The registry assertion at the bottom
// ties this contract to the actually-compiled artifact so the two cannot drift.
// ---------------------------------------------------------------------------

const SOURCE = `
entity EmailWorkflow {
  key [tenantId, id]
  property required id: string
  property required tenantId: string
  property name: string = ""
  property triggerType: string = "custom"
  property triggerConfig: string = "{}"
  property emailTemplateId: string = ""
  property emailTemplateTenantId: string = ""
  property recipientConfig: string = "{}"
  property isActive: boolean = true
  property lastTriggeredAt: datetime
  timestamps
  property deletedAt: datetime

  computed isDeleted: boolean = self.deletedAt != null

  constraint requireName: self.name != "" "Workflow name is required"

  default policy EmailWorkflowDefaultAccess execute: user.role in ["manager", "admin", "system"] "Email workflow management"

  command create(name: string, triggerType: string, triggerConfig: string, emailTemplateId: string, emailTemplateTenantId: string, recipientConfig: string, isActive: boolean) {
    guard name != null and name != "" "Workflow name is required"
    mutate name = name
    mutate triggerType = triggerType
    mutate triggerConfig = triggerConfig
    mutate emailTemplateId = emailTemplateId
    mutate emailTemplateTenantId = emailTemplateTenantId
    mutate recipientConfig = recipientConfig
    mutate isActive = isActive
    emit EmailWorkflowCreated
  }

  command update(name: string, triggerType: string, triggerConfig: string, emailTemplateId: string, emailTemplateTenantId: string, recipientConfig: string, isActive: boolean) {
    guard self.deletedAt == null "Cannot update a deleted workflow"
    mutate name = name
    mutate triggerType = triggerType
    mutate triggerConfig = triggerConfig
    mutate emailTemplateId = emailTemplateId
    mutate emailTemplateTenantId = emailTemplateTenantId
    mutate recipientConfig = recipientConfig
    mutate isActive = isActive
    emit EmailWorkflowUpdated
  }

  command setActive(isActive: boolean) {
    guard self.deletedAt == null "Cannot toggle a deleted workflow"
    mutate isActive = isActive
    emit EmailWorkflowUpdated
  }

  command softDelete() {
    guard self.deletedAt == null "Workflow is already deleted"
    mutate deletedAt = now()
    mutate isActive = false
    emit EmailWorkflowDeleted
  }

  command recordTriggered() {
    guard self.deletedAt == null "Cannot update a deleted workflow"
    mutate lastTriggeredAt = now()
    emit EmailWorkflowTriggered
  }
}

event EmailWorkflowCreated: "collaboration.email-workflow.created" {
  workflowId: string
  tenantId: string
  name: string
  triggerType: string
  createdAt: datetime
}
event EmailWorkflowUpdated: "collaboration.email-workflow.updated" {
  workflowId: string
  updatedAt: datetime
}
event EmailWorkflowDeleted: "collaboration.email-workflow.deleted" {
  workflowId: string
  deletedAt: datetime
}
event EmailWorkflowTriggered: "collaboration.email-workflow.triggered" {
  workflowId: string
  tenantId: string
  triggeredAt: datetime
}
`;

// biome-ignore lint/suspicious/noExplicitAny: IR type is structural; engine accepts it.
let ir: any;

beforeEach(async () => {
  const result = await compileToIR(SOURCE);
  expect(result.ir).toBeTruthy();
  ir = result.ir;
});

const USER = { id: "u1", tenantId: "t1", role: "manager" } as const;

function newEngine(): RuntimeEngine {
  // Role is required: EmailWorkflowDefaultAccess gates on `user.role in [...]`.
  return new RuntimeEngine(ir, {
    user: { id: USER.id, tenantId: USER.tenantId, role: USER.role },
  });
}

function fullCreateBody(overrides: Record<string, unknown> = {}) {
  return {
    name: "Welcome Email",
    triggerType: "event_confirmed",
    triggerConfig: { delayMinutes: 30 },
    emailTemplateId: "tmpl_123",
    emailTemplateTenantId: "t1",
    recipientConfig: { type: "client" },
    isActive: true,
    ...overrides,
  };
}

async function createWorkflow(
  engine: RuntimeEngine,
  overrides: Record<string, unknown> = {}
) {
  return runManifestCommandCore(
    { createRuntime: async () => engine },
    {
      entity: "EmailWorkflow",
      command: "create",
      body: fullCreateBody(overrides),
      user: { ...USER },
    }
  );
}

describe("EmailWorkflow.create — governed write persists the full UI field surface", () => {
  it("persists every field the server action wrote, including emailTemplateTenantId", async () => {
    const engine = newEngine();
    const result = await createWorkflow(engine);

    expect(result.ok).toBe(true);
    const id = result.ok ? (result.result as { id: string }).id : "";
    expect(id).toBeTruthy();

    const stored = (await engine.getInstance("EmailWorkflow", id)) as Record<
      string,
      unknown
    >;
    expect(stored.name).toBe("Welcome Email");
    expect(stored.triggerType).toBe("event_confirmed");
    expect(stored.emailTemplateId).toBe("tmpl_123");
    // The composite tenant key the template-name read join resolves against —
    // unmodeled before this migration, so a naive migrate would have dropped it.
    expect(stored.emailTemplateTenantId).toBe("t1");
    expect(stored.isActive).toBe(true);
  });

  it("stores Json config bodies as objects, not coerced strings", async () => {
    // Json columns are modeled as `string`; the store passes the value through.
    // If the engine stringified object params this would be "[object Object]".
    const engine = newEngine();
    const result = await createWorkflow(engine, {
      triggerConfig: { delayMinutes: 45, weekendsOnly: true },
      recipientConfig: { type: "employee", roles: ["server"] },
    });
    const id = result.ok ? (result.result as { id: string }).id : "";
    const stored = (await engine.getInstance("EmailWorkflow", id)) as Record<
      string,
      unknown
    >;
    expect(stored.triggerConfig).toEqual({
      delayMinutes: 45,
      weekendsOnly: true,
    });
    expect(stored.recipientConfig).toEqual({
      type: "employee",
      roles: ["server"],
    });
  });

  it("rejects a blank name (guard parity with the server action invariant)", async () => {
    const engine = newEngine();
    const result = await createWorkflow(engine, { name: "" });
    expect(result.ok).toBe(false);
  });
});

describe("EmailWorkflow.update — must be able to change triggerType", () => {
  it("changes triggerType (regression guard for the legacy command that omitted it)", async () => {
    const engine = newEngine();
    const created = await createWorkflow(engine);
    const id = created.ok ? (created.result as { id: string }).id : "";

    const updated = await runManifestCommandCore(
      { createRuntime: async () => engine },
      {
        entity: "EmailWorkflow",
        command: "update",
        body: {
          id,
          name: "Welcome Email",
          triggerType: "event_completed",
          triggerConfig: { delayMinutes: 0 },
          emailTemplateId: "tmpl_123",
          emailTemplateTenantId: "t1",
          recipientConfig: { type: "client" },
          isActive: true,
        },
        user: { ...USER },
      }
    );

    expect(updated.ok).toBe(true);
    const stored = (await engine.getInstance("EmailWorkflow", id)) as Record<
      string,
      unknown
    >;
    expect(stored.triggerType).toBe("event_completed");
  });
});

describe("EmailWorkflow.setActive — partial toggle does not clobber other fields", () => {
  it("flips isActive while leaving name/triggerType/config untouched", async () => {
    const engine = newEngine();
    const created = await createWorkflow(engine);
    const id = created.ok ? (created.result as { id: string }).id : "";

    const toggled = await runManifestCommandCore(
      { createRuntime: async () => engine },
      {
        entity: "EmailWorkflow",
        command: "setActive",
        body: { id, isActive: false },
        user: { ...USER },
      }
    );

    expect(toggled.ok).toBe(true);
    const stored = (await engine.getInstance("EmailWorkflow", id)) as Record<
      string,
      unknown
    >;
    expect(stored.isActive).toBe(false);
    // Untouched by the partial command.
    expect(stored.name).toBe("Welcome Email");
    expect(stored.triggerType).toBe("event_confirmed");
    expect(stored.emailTemplateId).toBe("tmpl_123");
  });
});

describe("EmailWorkflow.softDelete — governed soft delete", () => {
  it("sets deletedAt + isActive=false and then blocks further updates", async () => {
    const engine = newEngine();
    const created = await createWorkflow(engine);
    const id = created.ok ? (created.result as { id: string }).id : "";

    const deleted = await runManifestCommandCore(
      { createRuntime: async () => engine },
      {
        entity: "EmailWorkflow",
        command: "softDelete",
        body: { id },
        user: { ...USER },
      }
    );
    expect(deleted.ok).toBe(true);

    const stored = (await engine.getInstance("EmailWorkflow", id)) as Record<
      string,
      unknown
    >;
    expect(stored.deletedAt).toBeTruthy();
    expect(stored.isActive).toBe(false);

    // A deleted workflow is frozen: update + setActive are guarded on deletedAt == null.
    const afterUpdate = await runManifestCommandCore(
      { createRuntime: async () => engine },
      {
        entity: "EmailWorkflow",
        command: "setActive",
        body: { id, isActive: true },
        user: { ...USER },
      }
    );
    expect(afterUpdate.ok).toBe(false);
  });
});

describe("EmailWorkflow.recordTriggered — stamps lastTriggeredAt for cron callers", () => {
  const SYSTEM_USER = { id: "sys1", tenantId: "t1", role: "system" } as const;

  it("sets lastTriggeredAt to a non-null datetime via system user", async () => {
    const engine = newEngine();
    const created = await createWorkflow(engine);
    const id = created.ok ? (created.result as { id: string }).id : "";

    // lastTriggeredAt starts null
    const before = (await engine.getInstance("EmailWorkflow", id)) as Record<
      string,
      unknown
    >;
    expect(before.lastTriggeredAt).toBeFalsy();

    const result = await runManifestCommandCore(
      { createRuntime: async () => engine },
      {
        entity: "EmailWorkflow",
        command: "recordTriggered",
        body: { id },
        user: { ...SYSTEM_USER },
      }
    );

    expect(result.ok).toBe(true);
    const stored = (await engine.getInstance("EmailWorkflow", id)) as Record<
      string,
      unknown
    >;
    expect(stored.lastTriggeredAt).toBeTruthy();
    // Other fields untouched
    expect(stored.name).toBe("Welcome Email");
    expect(stored.isActive).toBe(true);
  });

  it("blocks recordTriggered on a deleted workflow", async () => {
    const engine = newEngine();
    const created = await createWorkflow(engine);
    const id = created.ok ? (created.result as { id: string }).id : "";

    // Soft-delete first
    await runManifestCommandCore(
      { createRuntime: async () => engine },
      {
        entity: "EmailWorkflow",
        command: "softDelete",
        body: { id },
        user: { ...USER },
      }
    );

    const result = await runManifestCommandCore(
      { createRuntime: async () => engine },
      {
        entity: "EmailWorkflow",
        command: "recordTriggered",
        body: { id },
        user: { ...SYSTEM_USER },
      }
    );
    expect(result.ok).toBe(false);
  });
});

describe("compiled command registry carries the EmailWorkflow governed-write surface", () => {
  it("includes create, update, setActive, softDelete, and recordTriggered", () => {
    const registryPath = join(here, "..", "..", "commands.registry.json");
    const registry = JSON.parse(readFileSync(registryPath, "utf8")) as {
      commandId: string;
    }[];
    const ids = new Set(registry.map((r) => r.commandId));
    expect(ids.has("EmailWorkflow.create")).toBe(true);
    expect(ids.has("EmailWorkflow.update")).toBe(true);
    expect(ids.has("EmailWorkflow.setActive")).toBe(true);
    expect(ids.has("EmailWorkflow.softDelete")).toBe(true);
    expect(ids.has("EmailWorkflow.recordTriggered")).toBe(true);
  });
});
