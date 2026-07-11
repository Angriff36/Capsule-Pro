import {
  createCustomBuiltins,
  ManifestRuntimeEngine,
} from "@repo/manifest-runtime/runtime-engine";
import { describe, expect, it } from "vitest";
import {
  compileManifestSourceForTest,
  inMemoryStoreProvider,
} from "../test-helpers";

const TENANT_ID = "entity-version-tenant";
const VERSION_ID = "entity-version-1";
const SNAPSHOT = JSON.stringify({ title: "Dinner menu", revision: 2 });

describe("EntityVersion source and runtime contract", () => {
  it("compiles and persists the supplied serialized snapshot without inventing metadata", async () => {
    const ir = await compileManifestSourceForTest(
      "platform/version-control-rules.manifest"
    );
    const runtime = new ManifestRuntimeEngine(
      ir,
      {
        tenantId: TENANT_ID,
        user: { id: "version-author", tenantId: TENANT_ID, role: "admin" },
      },
      {
        storeProvider: inMemoryStoreProvider(),
        customBuiltins: createCustomBuiltins(),
      }
    );

    await runtime.createInstance("EntityVersion", {
      id: VERSION_ID,
      tenantId: TENANT_ID,
      versionedEntityId: "menu-1",
      versionNumber: 2,
      changeType: "update",
      snapshotData: "seed-value-replaced-by-command",
    });

    const result = await runtime.runCommand(
      "create",
      {
        versionedEntityId: "menu-1",
        versionNumber: 2,
        changeType: "update",
        snapshot: SNAPSHOT,
        reason: "Menu copy changed",
        summary: "Updated the dinner menu title",
      },
      { entityName: "EntityVersion", instanceId: VERSION_ID }
    );

    expect(result.success).toBe(true);
    const persisted = await runtime.getInstance("EntityVersion", VERSION_ID);
    expect(persisted?.snapshotData).toBe(SNAPSHOT);
    expect(persisted?.metadata).toBeNull();
  });
});
