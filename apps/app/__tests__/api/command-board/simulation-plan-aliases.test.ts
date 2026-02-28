import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildFallbackSimulationPlan,
  parseSimulationPlan,
} from "@/app/api/command-board/chat/agent-loop";
import {
  buildSimulationPlanSchema,
  loadCommandCatalog,
  loadCommandCatalogFromManifestPath,
  resolveAliases,
  resolveCanonicalEntityCommandPairFromPair,
} from "@/app/api/command-board/chat/manifest-command-tools";

function collectStrictSchemaViolations(schema: unknown, path = "$"): string[] {
  if (!schema || typeof schema !== "object") {
    return [];
  }

  const node = schema as Record<string, unknown>;
  const violations: string[] = [];
  if (
    node.type === "object" &&
    node.properties &&
    typeof node.properties === "object"
  ) {
    if (node.additionalProperties !== false) {
      violations.push(
        `${path}: object with properties must set additionalProperties=false`
      );
    }
    const keys = Object.keys(node.properties as Record<string, unknown>);
    const required = node.required;
    if (Array.isArray(required)) {
      const missing = keys.filter((key) => !required.includes(key));
      if (missing.length > 0) {
        violations.push(
          `${path}: required[] missing keys [${missing.join(", ")}]`
        );
      }
    } else {
      violations.push(`${path}: object with properties must define required[]`);
    }
  }

  for (const [key, value] of Object.entries(node)) {
    if (Array.isArray(value)) {
      value.forEach((entry, index) => {
        violations.push(
          ...collectStrictSchemaViolations(entry, `${path}.${key}[${index}]`)
        );
      });
    } else {
      violations.push(
        ...collectStrictSchemaViolations(value, `${path}.${key}`)
      );
    }
  }

  return violations;
}

describe("simulation plan alias resolution", () => {
  it("maps event simulation request to canonical manifest commands only", () => {
    const request =
      "create an event with venue, staff, full menu, battle board, bill";
    const catalog = loadCommandCatalog();
    const aliases = resolveAliases(request);
    const plan = buildFallbackSimulationPlan(request, catalog, aliases);

    const sequence = plan.commandSequence.map(
      (step) => `${step.entity}.${step.command}`
    );

    expect(sequence).toContain("Event.create");
    expect(sequence.filter((step) => step === "User.create").length).toBe(2);
    expect(sequence).toContain("Menu.create");
    expect(sequence.filter((step) => step === "MenuDish.create").length).toBe(
      2
    );
    expect(sequence).toContain("BattleBoard.create");
    expect(
      sequence.filter((step) => step === "BattleBoard.addDish").length
    ).toBe(2);
    expect(sequence).toContain("EventBudget.create");

    expect(sequence).not.toContain("Venue.create");
    expect(sequence).not.toContain("Bill.create");
    expect(sequence).not.toContain("Staff.create");

    expect(plan.resolvedAliases).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          userTerm: "venue",
          canonical: expect.stringContaining("Event.create"),
        }),
        expect.objectContaining({
          userTerm: "staff",
          canonical: "User.create",
        }),
        expect.objectContaining({
          userTerm: "bill",
          canonical: "EventBudget.create",
        }),
      ])
    );
  });

  it("emits schema variants only for canonical entity+command pairs", () => {
    const catalog = loadCommandCatalog();
    const schema = buildSimulationPlanSchema(catalog);
    const items = (
      (schema.properties as { commandSequence?: { items?: unknown } })
        .commandSequence?.items as {
        properties?: {
          entityCommand?: { enum?: string[] };
        };
      }
    )?.properties;

    const pairEnum = items?.entityCommand?.enum ?? [];

    expect(pairEnum).toContain("Event.create");
    expect(pairEnum).toContain("EventBudget.create");
    expect(pairEnum).not.toContain("Venue.create");
    expect(pairEnum).not.toContain("Bill.create");
    expect(pairEnum).not.toContain("Staff.add_staff");
  });

  it("uses strict-schema-compatible argsKv list for variable arguments", () => {
    const catalog = loadCommandCatalog();
    const schema = buildSimulationPlanSchema(catalog);
    const items = (
      (schema.properties as { commandSequence?: { items?: unknown } })
        .commandSequence?.items as {
        properties?: {
          argsKv?: {
            type?: string;
            items?: {
              type?: string;
              properties?: Record<string, unknown>;
              required?: string[];
              additionalProperties?: unknown;
            };
          };
        };
      }
    )?.properties;

    const argsKvSchema = items?.argsKv;
    expect(argsKvSchema?.type).toBe("array");
    expect(argsKvSchema?.items?.type).toBe("object");
    expect(argsKvSchema?.items?.required).toEqual(["name", "value"]);
    expect(argsKvSchema?.items?.additionalProperties).toBe(false);
  });

  it("produces schema accepted by OpenAI strict object rules", () => {
    const catalog = loadCommandCatalog();
    const schema = buildSimulationPlanSchema(catalog);
    const violations = collectStrictSchemaViolations(schema);

    expect(violations).toEqual([]);
  });

  it("rejects unknown entityCommand pairs during plan parsing", () => {
    const catalog = loadCommandCatalog();
    const raw = JSON.stringify({
      requestedSimulation: "test",
      resolvedAliases: [],
      commandSequence: [
        {
          entityCommand: "Bill.create",
          argsKv: [{ name: "name", value: "x" }],
          note: "",
        },
      ],
      unfulfilledIntents: [],
    });

    const parsed = parseSimulationPlan(raw, catalog);
    expect(parsed).not.toBeNull();
    expect(parsed?.commandSequence).toEqual([]);
  });

  it("accepts lowercase entityCommand pairs by canonicalizing to route surface keys", () => {
    const catalog = loadCommandCatalog();
    const raw = JSON.stringify({
      requestedSimulation: "test",
      resolvedAliases: [],
      commandSequence: [
        {
          entityCommand: "commandboardcard.create",
          argsKv: [{ name: "title", value: "Test Card" }],
          note: "",
        },
      ],
      unfulfilledIntents: [],
    });

    const parsed = parseSimulationPlan(raw, catalog);
    expect(parsed).not.toBeNull();
    expect(parsed?.commandSequence).toHaveLength(1);
    expect(parsed?.commandSequence[0]).toMatchObject({
      entity: "CommandBoardCard",
      command: "create",
      route: "/api/command-board/cards/commands/create",
    });
  });

  it("resolves decorated entityCommand text to canonical pair", () => {
    const catalog = loadCommandCatalog();
    const resolved = resolveCanonicalEntityCommandPairFromPair(
      catalog,
      "Event.create (clientId,eventDate,guestCount)"
    );
    expect(resolved).toBe("Event.create");
  });

  it("resolves separator variants for command names", () => {
    const catalog = loadCommandCatalog();
    const resolved = resolveCanonicalEntityCommandPairFromPair(
      catalog,
      "battleboard.add-dish"
    );
    expect(resolved).toBe("BattleBoard.addDish");
  });

  it("builds canonical live-event sequence for alias-heavy prompt", () => {
    const request =
      "create an event with full menu, battle board, staff, venue, bill";
    const catalog = loadCommandCatalog();
    const aliases = resolveAliases(request);
    const plan = buildFallbackSimulationPlan(request, catalog, aliases);
    const sequence = plan.commandSequence.map(
      (step) => `${step.entity}.${step.command}`
    );

    expect(sequence).toEqual(
      expect.arrayContaining([
        "Event.create",
        "User.create",
        "Menu.create",
        "MenuDish.create",
        "BattleBoard.create",
        "BattleBoard.addDish",
        "EventBudget.create",
      ])
    );
    expect(sequence).not.toEqual(
      expect.arrayContaining(["Bill.create", "Venue.create", "Staff.create"])
    );
    expect(plan.resolvedAliases).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ userTerm: "venue" }),
        expect.objectContaining({ userTerm: "staff" }),
        expect.objectContaining({ userTerm: "bill" }),
        expect.objectContaining({ userTerm: "full menu" }),
      ])
    );
  });

  it("reloads updated routes.manifest.json and keeps non-empty catalog", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "routes-manifest-"));
    const manifestPath = join(tempDir, "routes.manifest.json");

    const writeManifest = (generatedAt: string) => {
      writeFileSync(
        manifestPath,
        JSON.stringify(
          {
            generatedAt,
            routes: [
              {
                id: "Event.create",
                path: "/api/event/create",
                method: "POST",
                source: { kind: "command", entity: "Event", command: "create" },
                params: [
                  {
                    name: "name",
                    type: "string",
                    required: true,
                    location: "body",
                  },
                ],
              },
              {
                id: "User.create",
                path: "/api/user/create",
                method: "POST",
                source: { kind: "command", entity: "User", command: "create" },
                params: [
                  {
                    name: "firstName",
                    type: "string",
                    required: true,
                    location: "body",
                  },
                ],
              },
              {
                id: "Menu.create",
                path: "/api/menu/create",
                method: "POST",
                source: { kind: "command", entity: "Menu", command: "create" },
                params: [
                  {
                    name: "name",
                    type: "string",
                    required: true,
                    location: "body",
                  },
                ],
              },
            ],
          },
          null,
          2
        ),
        "utf8"
      );
    };

    try {
      writeManifest("2026-02-21T00:00:00.000Z");
      const catalogA = loadCommandCatalogFromManifestPath(manifestPath);
      expect(catalogA.commands.length).toBeGreaterThan(0);

      writeManifest("2026-02-22T00:00:00.000Z");
      const catalogB = loadCommandCatalogFromManifestPath(manifestPath);
      expect(catalogB.commands.length).toBeGreaterThan(0);

      const request =
        "create an event with menu, battle board, staff, venue, bill";
      const aliases = resolveAliases(request);
      const plan = buildFallbackSimulationPlan(request, catalogB, aliases);
      const sequence = plan.commandSequence.map(
        (step) => `${step.entity}.${step.command}`
      );

      expect(sequence).toEqual(
        expect.arrayContaining(["Event.create", "User.create", "Menu.create"])
      );
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
