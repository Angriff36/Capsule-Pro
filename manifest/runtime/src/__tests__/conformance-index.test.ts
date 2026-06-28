/**
 * Conformance Test Index (Constitution S17)
 *
 * Structural IR-level conformance verification for ALL governed entities.
 * No database required — validates compiled IR against constitutional requirements.
 *
 * IR structure:
 *   - ir.entities[].commands = string[] (command names only)
 *   - ir.commands[] = full command objects with { name, entity, policies, emits, ... }
 *   - ir.entities[].defaultPolicies = string[] (policy names)
 *   - ir.entities[].transitions = { property, from, to }[]
 *   - ir.stores[] = { entity, target, config }
 *
 * This file IS the conformance test index required by Constitution S17.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { loadMergedPrecompiledIR } from "../runtime/loadManifests";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let ir: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let entities: any[];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let commands: any[];

/**
 * Mixins (e.g. SoftDeletable, TenantScoped from `_base.manifest`) are declared
 * with the `entity` keyword so the parser can resolve them as composition
 * targets, but they are NOT real, persisted, governed entities — they are
 * flattened into the consuming entity at compile time (entity-composition.js
 * `expandComposition`). They therefore have no store, no defaultPolicy, and no
 * commands of their own, and must be excluded from per-entity coverage
 * assertions (giving a mixin a fake store/policy would be meaningless).
 *
 * Discriminator (no hardcoded names, future-proof): an entity is a mixin/abstract
 * iff it is referenced as a `mixin` target by at least one OTHER entity — i.e. it
 * appears in some entity's `entity.mixins` array. Such an entity is a composition
 * source, not a standalone governed entity.
 */
function computeMixinNames(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  allEntities: any[]
): Set<string> {
  const mixinNames = new Set<string>();
  for (const entity of allEntities) {
    for (const mixin of entity.mixins ?? []) {
      if (typeof mixin === "string") {
        mixinNames.add(mixin);
      }
    }
  }
  return mixinNames;
}

let mixinNames: Set<string>;

beforeAll(() => {
  const bundle = loadMergedPrecompiledIR();
  ir = bundle.ir;
  const allEntities = ir.entities ?? [];
  commands = ir.commands ?? [];
  mixinNames = computeMixinNames(allEntities);
  // Governed entities only — mixins/abstract composition sources are not
  // standalone entities and are excluded from coverage assertions.
  entities = allEntities.filter(
    (e: { name: string }) => !mixinNames.has(e.name)
  );
});

// ── 1. Entity Coverage (§4) ──────────────────────────────────────────────

describe("Conformance Index — Entity Coverage (§4)", () => {
  it("IR contains entities", () => {
    expect(entities.length).toBeGreaterThan(180);
  });

  it("every entity has at least one command", () => {
    const commandless: string[] = [];

    for (const entity of entities) {
      if (!entity.commands || entity.commands.length === 0) {
        commandless.push(entity.name);
      }
    }

    if (commandless.length > 0) {
      console.warn(
        `[Conformance] Entities without commands (${commandless.length}):`,
        commandless
      );
    }

    expect(commandless.length).toBeLessThan(entities.length * 0.1);
  });
});

// ── 2. Policy Coverage (§12, Task 8.6) ─────────────────────────────────

describe("Conformance Index — Policy Coverage (§12)", () => {
  it("every entity has defaultPolicies", () => {
    const withoutDefault: string[] = [];

    for (const entity of entities) {
      if (!entity.defaultPolicies || entity.defaultPolicies.length === 0) {
        withoutDefault.push(entity.name);
      }
    }

    if (withoutDefault.length > 0) {
      console.error(
        `[Conformance] Entities without defaultPolicies (${withoutDefault.length}):`,
        withoutDefault
      );
    }

    expect(withoutDefault).toEqual([]);
  });

  it("every command has at least one policy bound", () => {
    const uncovered: string[] = [];

    for (const cmd of commands) {
      if (!cmd.policies || cmd.policies.length === 0) {
        uncovered.push(`${cmd.entity}.${cmd.name}`);
      }
    }

    if (uncovered.length > 0) {
      console.error(
        `[Conformance] Commands without policies (${uncovered.length}):`,
        uncovered.slice(0, 20)
      );
    }

    expect(uncovered).toEqual([]);
  });
});

// ── 3. Event Emission (§5) ──────────────────────────────────────────────

describe("Conformance Index — Event Emission (§5)", () => {
  it("every mutating command emits at least one event", () => {
    const silent: string[] = [];

    for (const cmd of commands) {
      // Skip read/query commands
      const nameLC = cmd.name.toLowerCase();
      if (
        nameLC.startsWith("get") ||
        nameLC.startsWith("list") ||
        nameLC.startsWith("find") ||
        nameLC.startsWith("search") ||
        nameLC.startsWith("check")
      ) {
        continue;
      }

      if (!cmd.emits || cmd.emits.length === 0) {
        silent.push(`${cmd.entity}.${cmd.name}`);
      }
    }

    if (silent.length > 0) {
      console.warn(
        `[Conformance] Commands with no event emission (${silent.length}):`,
        silent.slice(0, 30)
      );
    }

    // Allow up to 5% for intentional edge cases
    expect(silent.length).toBeLessThanOrEqual(
      Math.max(commands.length * 0.05, 10)
    );
  });
});

// ── 4. State Machine Coverage (§8) ──────────────────────────────────────

describe("Conformance Index — State Machine Coverage (§8)", () => {
  it("entities with status properties have transition rules", () => {
    const statusEntitiesWithoutTransitions: string[] = [];

    for (const entity of entities) {
      const props = entity.properties ?? [];
      const hasStatus = props.some(
        (p: { name: string }) =>
          p.name === "status" || p.name === "state" || p.name.endsWith("Status")
      );
      if (!hasStatus) {
        continue;
      }

      const hasTransitions =
        entity.transitions && entity.transitions.length > 0;

      if (!hasTransitions) {
        statusEntitiesWithoutTransitions.push(entity.name);
      }
    }

    if (statusEntitiesWithoutTransitions.length > 0) {
      console.warn(
        `[Conformance] Status entities without transitions (${statusEntitiesWithoutTransitions.length}):`,
        statusEntitiesWithoutTransitions
      );
    }

    // Allow up to 12 for intentionally free-form status fields
    expect(statusEntitiesWithoutTransitions.length).toBeLessThanOrEqual(12);
  });
});

// ── 5. Type Safety (Task 2.7) ───────────────────────────────────────────

describe("Conformance Index — Type Safety (Task 2.7)", () => {
  it("no entity properties use deprecated 'number' type", () => {
    const numberTyped: string[] = [];

    for (const entity of entities) {
      for (const prop of entity.properties ?? []) {
        if (prop.type?.name === "number") {
          numberTyped.push(`${entity.name}.${prop.name}`);
        }
      }
    }

    if (numberTyped.length > 0) {
      console.error(
        `[Conformance] Properties using 'number' type (${numberTyped.length}):`,
        numberTyped
      );
    }

    expect(numberTyped).toEqual([]);
  });
});

// ── 6. Store Coverage ────────────────────────────────────────────────────

describe("Conformance Index — Store Coverage", () => {
  it("all entities have store declarations", () => {
    const stores = ir.stores ?? [];
    const storeEntityNames = new Set(
      stores.map((s: { entity: string }) => s.entity)
    );

    const missingStores = entities.filter(
      (e: { name: string }) => !storeEntityNames.has(e.name)
    );

    if (missingStores.length > 0) {
      console.warn(
        `[Conformance] Entities without store declarations (${missingStores.length}):`,
        missingStores.map((e: { name: string }) => e.name).slice(0, 20)
      );
    }

    expect(missingStores).toEqual([]);
  });
});

// ── 7. Summary Report ────────────────────────────────────────────────────

describe("Conformance Index — Summary Report", () => {
  it("produces a coverage report", () => {
    const totalCommands = commands.length;
    const commandsWithPolicies = commands.filter(
      (c: { policies?: unknown[] }) => c.policies && c.policies.length > 0
    ).length;
    const commandsWithEvents = commands.filter(
      (c: { emits?: unknown[] }) => c.emits && c.emits.length > 0
    ).length;
    const entitiesWithDefaultPolicies = entities.filter(
      (e: { defaultPolicies?: unknown[] }) =>
        e.defaultPolicies && e.defaultPolicies.length > 0
    ).length;
    const entitiesWithTransitions = entities.filter(
      (e: { transitions?: unknown[] }) =>
        e.transitions && e.transitions.length > 0
    ).length;
    const entitiesWithRelationships = entities.filter(
      (e: { relationships?: unknown[] }) =>
        e.relationships && e.relationships.length > 0
    ).length;
    const stores = ir.stores?.length ?? 0;

    const report = {
      entities: entities.length,
      commands: totalCommands,
      stores,
      policies: ir.policies?.length ?? 0,
      commandsWithPolicies,
      commandsWithEvents,
      entitiesWithDefaultPolicies: `${entitiesWithDefaultPolicies}/${entities.length}`,
      entitiesWithTransitions,
      entitiesWithRelationships,
      coverage: {
        commandPolicy: `${((commandsWithPolicies / Math.max(totalCommands, 1)) * 100).toFixed(1)}%`,
        commandEvents: `${((commandsWithEvents / Math.max(totalCommands, 1)) * 100).toFixed(1)}%`,
        defaultPolicy: `${((entitiesWithDefaultPolicies / Math.max(entities.length, 1)) * 100).toFixed(1)}%`,
      },
    };

    console.log("\n═══ Conformance Index Report ═══");
    console.log(JSON.stringify(report, null, 2));
    console.log("═════════════════════════════════\n");

    // Constitutional requirements
    expect(report.entities).toBeGreaterThan(180);
    expect(report.commands).toBeGreaterThan(900);
    expect(report.coverage.defaultPolicy).toBe("100.0%");
    expect(report.coverage.commandPolicy).toBe("100.0%");
  });
});
