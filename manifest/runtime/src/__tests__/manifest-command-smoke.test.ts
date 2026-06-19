/**
 * Manifest command smoke suite — registry, resolver, payload, and safe execution.
 *
 * Proves commands are registered, resolvable, payload-buildable, and that
 * `create` commands persist without null violations on required IR properties
 * (surrogate for GenericPrismaStore / Prisma non-null columns).
 *
 * Does NOT hit production DB or regenerate IR.
 */
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { createCustomBuiltins } from "../manifest-builtins.js";
import { runManifestCommandCore } from "../run-manifest-command-core.js";
import { ManifestRuntimeEngine } from "../runtime-engine.js";
import { loadMergedPrecompiledIR } from "../runtime/loadManifests.js";
import {
  buildCommandPayload,
  getSmokeFixtureIds,
} from "./manifest-command-smoke/build-command-payload.js";
import {
  classifyCommand,
  commandId,
} from "./manifest-command-smoke/classify-command.js";
import { classifyExecutionOutcome } from "./manifest-command-smoke/execution-outcome.js";
import { formatSmokeReport } from "./manifest-command-smoke/format-smoke-report.js";
import {
  runStaticSmokeChecks,
  validatePayloadFactory,
} from "./manifest-command-smoke/static-checks.js";
import type {
  IrCommandLike,
  SmokeCommandRecord,
  SmokeRealFailure,
  SmokeReport,
} from "./manifest-command-smoke/types.js";
import { emptySmokeReport } from "./manifest-command-smoke/types.js";
import {
  createValidatingStoreProvider,
  seedSmokeFixtures,
} from "./manifest-command-smoke/validating-mem-store.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let ir: any;
let commands: IrCommandLike[] = [];
let report: SmokeReport;
let commandRecords: SmokeCommandRecord[] = [];

const SMOKE_USER = {
  id: "smoke-admin",
  tenantId: getSmokeFixtureIds().tenantId,
  role: "admin",
} as const;

beforeAll(() => {
  const bundle = loadMergedPrecompiledIR();
  ir = bundle.ir;
  commands = ir.commands ?? [];
  report = emptySmokeReport(commands.length);
});

afterAll(() => {
  // eslint-disable-next-line no-console
  console.log(formatSmokeReport(report));
});

describe("Manifest command smoke — static gates", () => {
  it("registry, resolver, and emitted events are consistent", () => {
    const staticResult = runStaticSmokeChecks(ir);
    report.realFailures.push(...staticResult.failures);

    expect(
      staticResult.duplicateCommandIds,
      "duplicate commandId entries"
    ).toEqual([]);
    expect(staticResult.irRegistryDrift, "registry/IR drift").toEqual([]);
    expect(staticResult.resolverMisses, "resolver misses").toEqual([]);
    expect(staticResult.undefinedEvents, "undefined emitted events").toEqual([]);
  });

  it("builds a payload object for every command without throwing", () => {
    const payloadFailures = validatePayloadFactory(ir, (cmd) =>
      buildCommandPayload(ir, cmd)
    );
    report.payloadBuilt = commands.length - payloadFailures.length;
    report.realFailures.push(...payloadFailures);

    expect(payloadFailures, "payload factory failures").toEqual([]);
  });

  it("classifies every command into a smoke bucket", () => {
    commandRecords = commands.map((cmd) => {
      const classification = classifyCommand(cmd);
      const id = commandId(cmd);
      report.byBucket[classification.bucket].push(id);
      return {
        commandId: id,
        entity: cmd.entity,
        command: cmd.name,
        bucket: classification.bucket,
        reason: classification.reason,
      };
    });

    report.scenarioRequired = report.byBucket.scenario_required.length;
    report.destructiveSkipped = report.byBucket.destructive.length;
    report.samples.scenarioRequired = report.byBucket.scenario_required.slice(
      0,
      20
    );
    report.samples.destructiveSkipped = report.byBucket.destructive.slice(
      0,
      20
    );

    expect(commandRecords.length).toBe(commands.length);
  });
});

describe("Manifest command smoke — safe create execution", () => {
  it("executes classified create commands in an isolated validating store", async () => {
    const executable = commandRecords.filter(
      (record) => record.bucket === "executable"
    );
    const provider = createValidatingStoreProvider(ir);
    await seedSmokeFixtures(provider, getSmokeFixtureIds());

    const engine = new ManifestRuntimeEngine(
      ir,
      {
        tenantId: SMOKE_USER.tenantId,
        user: { ...SMOKE_USER },
      },
      {
        storeProvider: provider,
        customBuiltins: createCustomBuiltins(),
        generateId: () => crypto.randomUUID(),
        now: () => Date.now(),
      }
    );

    const executionFailures: SmokeRealFailure[] = [];

    for (const record of executable) {
      const cmd = commands.find(
        (entry) =>
          entry.entity === record.entity && entry.name === record.command
      );
      if (!cmd) {
        executionFailures.push({
          commandId: record.commandId,
          phase: "execute",
          message: "Command missing from IR during execution pass",
        });
        continue;
      }

      const body = buildCommandPayload(ir, cmd);
      const result = await runManifestCommandCore(
        { createRuntime: async () => engine },
        {
          entity: record.entity,
          command: record.command,
          body,
          user: { ...SMOKE_USER },
        }
      );

      if (result.ok) {
        record.executed = true;
        record.outcome = "success";
        report.executed += 1;
        continue;
      }

      record.executed = false;
      record.outcome = result.kind as SmokeCommandRecord["outcome"];
      record.detail = result.message;

      const { disposition, detail } = classifyExecutionOutcome(result);
      record.detail = detail;

      if (disposition === "expected_block") {
        report.guardExpectedFail += 1;
        if (report.samples.guardExpectedFail.length < 25) {
          report.samples.guardExpectedFail.push(record.commandId);
        }
        continue;
      }

      executionFailures.push({
        commandId: record.commandId,
        phase: "execute",
        message: detail,
      });
    }

    report.realFailures.push(...executionFailures);
    expect(
      executionFailures,
      "unexpected runtime failures on safe create commands"
    ).toEqual([]);
  }, 120_000);
});

describe("Manifest command smoke — known regressions", () => {
  it("Notification.create must not persist createdAt as null (EventStaff notify path)", async () => {
    const provider = createValidatingStoreProvider(ir);
    const engine = new ManifestRuntimeEngine(
      ir,
      {
        tenantId: SMOKE_USER.tenantId,
        user: { ...SMOKE_USER },
      },
      {
        storeProvider: provider,
        customBuiltins: createCustomBuiltins(),
        generateId: () => crypto.randomUUID(),
        now: () => Date.now(),
      }
    );

    const result = await runManifestCommandCore(
      { createRuntime: async () => engine },
      {
        entity: "Notification",
        command: "create",
        body: {
          id: crypto.randomUUID(),
          tenantId: SMOKE_USER.tenantId,
          recipientEmployeeId: getSmokeFixtureIds().userId,
          notificationType: "event_staff_assigned",
          title: "Smoke assignment notice",
          body: "You were assigned in smoke test.",
          actionUrl: "",
          correlationId: getSmokeFixtureIds().eventId,
        },
        user: { ...SMOKE_USER },
      }
    );

    report.realFailures.push(
      ...(result.ok
        ? []
        : [
            {
              commandId: "Notification.create",
              phase: "execute" as const,
              message: `[regression] ${result.message}`,
            },
          ])
    );

    expect(
      result.ok,
      "Notification.create should persist without createdAt=null (add mutate createdAt = now() in notification-rules.manifest)"
    ).toBe(true);
  });
});

describe("Manifest command smoke — report summary", () => {
  it("records totals for human-readable report output", () => {
    expect(report.totalCommands).toBeGreaterThan(500);
    expect(report.payloadBuilt).toBe(report.totalCommands);
    expect(
      report.executed +
        report.guardExpectedFail +
        report.scenarioRequired +
        report.destructiveSkipped
    ).toBeGreaterThan(0);
  });
});
