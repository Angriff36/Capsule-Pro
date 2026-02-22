import { readFileSync } from "node:fs";
import { join } from "node:path";
import { compileToIR } from "@angriff36/manifest/ir-compiler";
import { enforceCommandOwnership } from "@repo/manifest-adapters/ir-contract";
import { ManifestRuntimeEngine } from "@repo/manifest-adapters/runtime-engine";
import { describe, expect, it } from "vitest";

const TEST_TENANT_ID = "tenant-test-001";

async function buildRuntime() {
  const manifestRoot = join(
    process.cwd(),
    "../../packages/manifest-adapters/manifests"
  );

  const manifestFiles = [
    "event-rules.manifest",
    "prep-list-rules.manifest",
    "prep-task-rules.manifest",
  ];

  const compiled = [];
  for (const file of manifestFiles) {
    const source = readFileSync(join(manifestRoot, file), "utf-8");
    const { ir, diagnostics } = await compileToIR(source);
    if (!ir) {
      throw new Error(
        diagnostics.map((diagnostic) => diagnostic.message).join("; ")
      );
    }
    const manifestName = file.replace(".manifest", "");
    compiled.push(enforceCommandOwnership(ir, manifestName));
  }

  const [base] = compiled;
  const mergedIr = {
    ...base,
    entities: compiled.flatMap((item) => item.entities),
    stores: compiled.flatMap((item) => item.stores),
    events: compiled.flatMap((item) => item.events),
    commands: compiled.flatMap((item) => item.commands),
    policies: compiled.flatMap((item) => item.policies),
  };

  return new ManifestRuntimeEngine(mergedIr, {
    user: {
      id: "manager-001",
      tenantId: TEST_TENANT_ID,
      role: "manager",
    },
  });
}

describe("Manifest Runtime - Event + PrepSeed -> PrepTasks flow", () => {
  it("creates event, imports prep seed metadata, and creates 6 claimable prep tasks", async () => {
    const runtime = await buildRuntime();
    const eventId = "event-seed-001";
    const prepListId = "preplist-seed-001";

    await runtime.createInstance("Event", {
      id: eventId,
      tenantId: TEST_TENANT_ID,
      title: "Seed Placeholder",
      eventType: "catering",
      eventDate: 1_772_006_400_000,
      guestCount: 1,
      status: "draft",
    });

    const createEventResult = await runtime.runCommand(
      "create",
      {
        clientId: "client-001",
        eventNumber: "EVT-2026-001",
        title: "Spring Tasting",
        eventType: "catering",
        eventDate: 1_772_006_400_000,
        guestCount: 120,
        venueName: "The Conservatory",
        venueAddress: "100 Main St, Chicago",
        notes: "Seed import test event",
        tags: "seasonal, vip",
        status: "draft",
      },
      { entityName: "Event", instanceId: eventId }
    );

    expect(createEventResult.success).toBe(true);

    await runtime.createInstance("PrepList", {
      id: prepListId,
      tenantId: TEST_TENANT_ID,
      eventId,
      name: "placeholder",
    });

    const prepSeed = {
      eventId,
      prepList: {
        name: "Production Prep Sheet",
        batchMultiplier: 1.25,
        dietaryRestrictions: "nut-free",
        notes: "Generated from parser",
      },
      menuGroups: [
        {
          name: "Roasted Carrots",
          instructionLines: ["Wash carrots", "Peel carrots", "Roast carrots"],
        },
        {
          name: "Lemon Chicken",
          instructionLines: ["Trim chicken", "Season chicken", "Bake chicken"],
        },
      ],
    };

    const importPrepSeedResult = await runtime.runCommand(
      "createFromSeed",
      {
        eventId,
        name: prepSeed.prepList.name,
        batchMultiplier: prepSeed.prepList.batchMultiplier,
        dietaryRestrictions: prepSeed.prepList.dietaryRestrictions,
        notes: prepSeed.prepList.notes,
        menuGroupsJson: JSON.stringify(prepSeed.menuGroups),
        totalInstructionLines: 6,
        validInstructionLines: 6,
      },
      { entityName: "PrepList", instanceId: prepListId }
    );

    expect(importPrepSeedResult.success).toBe(true);

    const taskIds: string[] = [];
    let taskCounter = 0;
    for (const group of prepSeed.menuGroups) {
      for (const instructionLine of group.instructionLines) {
        taskCounter += 1;
        const taskId = `task-seed-${taskCounter}`;
        taskIds.push(taskId);
        await runtime.createInstance("PrepTask", {
          id: taskId,
          tenantId: TEST_TENANT_ID,
          eventId,
          name: instructionLine,
          status: "open",
        });

        const createTaskResult = await runtime.runCommand(
          "create",
          {
            name: instructionLine,
            eventId,
            prepListId,
            taskType: "prep",
            priority: 3,
            quantityTotal: 1,
            quantityUnitId: "task",
            servingsTotal: 0,
            startByDate: 1_772_006_400_000,
            dueByDate: 1_772_010_000_000,
            notes: `Group: ${group.name}`,
            ingredients: "",
          },
          { entityName: "PrepTask", instanceId: taskId }
        );

        expect(createTaskResult.success).toBe(true);
      }
    }

    expect(taskIds).toHaveLength(6);

    const claimResult = await runtime.runCommand(
      "claim",
      {
        userId: "kitchen-staff-001",
      },
      { entityName: "PrepTask", instanceId: taskIds[0] }
    );
    expect(claimResult.success).toBe(true);
  });

  it("rejects prep seed import when instruction lines include invalid/empty rows", async () => {
    const runtime = await buildRuntime();
    const prepListId = "preplist-seed-invalid-001";
    const eventId = "event-seed-invalid-001";

    await runtime.createInstance("PrepList", {
      id: prepListId,
      tenantId: TEST_TENANT_ID,
      eventId,
      name: "placeholder",
    });

    const importResult = await runtime.runCommand(
      "createFromSeed",
      {
        eventId,
        name: "Bad Seed",
        batchMultiplier: 1,
        dietaryRestrictions: "",
        notes: "contains blank lines from parser",
        menuGroupsJson: JSON.stringify([
          {
            name: "Group A",
            instructionLines: ["Do thing", "", "Do other thing"],
          },
        ]),
        totalInstructionLines: 3,
        validInstructionLines: 2,
      },
      { entityName: "PrepList", instanceId: prepListId }
    );

    expect(importResult.success).toBe(false);
    expect(importResult.guardFailure).toBeDefined();
  });
});
