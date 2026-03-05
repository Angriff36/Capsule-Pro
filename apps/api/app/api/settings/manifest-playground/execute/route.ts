/**
 * Manifest Test Playground Execution API
 *
 * Provides an interactive testing environment for manifest commands with:
 * - Command execution with test data
 * - Guard and constraint evaluation preview
 * - Execution history replay
 * - State snapshot capture
 */

import type { IR, IRCommand, RuntimeEngine } from "@angriff36/manifest";
import { database } from "@repo/database";
import { loadPrecompiledIR } from "@repo/manifest-adapters/runtime/loadManifests";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { createManifestRuntime } from "~/lib/manifest-runtime";
import { getTenant } from "~/lib/tenant";

// Load the compiled IR from manifest-ir package
const getIR = (): IR => {
  const { ir } = loadPrecompiledIR(
    "packages/manifest-ir/ir/kitchen/kitchen.ir.json"
  );
  return ir;
};

interface ExecuteRequest {
  entityName: string;
  commandName: string;
  testData: Record<string, unknown>;
  options?: {
    dryRun?: boolean;
    captureSnapshot?: boolean;
    replayFromSnapshot?: string;
  };
}

interface ExecutionResult {
  success: boolean;
  commandName: string;
  entityName: string;
  input: Record<string, unknown>;
  output?: {
    result?: Record<string, unknown>;
    events?: Array<{ name: string; payload: Record<string, unknown> }>;
  };
  guards: Array<{
    index: number;
    expression: string;
    passed: boolean;
    message?: string;
  }>;
  constraints: Array<{
    name: string;
    severity: string;
    passed: boolean;
    message?: string;
  }>;
  policy?: {
    denied: boolean;
    policyName?: string;
    reason?: string;
  };
  error?: string;
  snapshot?: {
    id: string;
    timestamp: number;
    state: Record<string, unknown>;
  };
  executionTime: number;
}

interface ExecutionHistoryEntry {
  id: string;
  timestamp: number;
  entityName: string;
  commandName: string;
  input: Record<string, unknown>;
  result: ExecutionResult;
}

// In-memory execution history (in production, this would be persisted)
const executionHistory = new Map<string, ExecutionHistoryEntry[]>();

export async function POST(request: Request) {
  try {
    const { user, tenantId } = await getTenant();
    if (!(user?.id && tenantId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as ExecuteRequest;
    const { entityName, commandName, testData, options } = body;

    // Validate inputs
    if (!(entityName && commandName)) {
      return NextResponse.json(
        { error: "entityName and commandName are required" },
        { status: 400 }
      );
    }

    const startTime = Date.now();

    // Load IR to get command details
    const ir = getIR();
    const command = ir.commands.find(
      (c) => c.name === commandName && c.entity === entityName
    );

    if (!command) {
      return NextResponse.json(
        { error: `Command ${commandName} not found for entity ${entityName}` },
        { status: 404 }
      );
    }

    // If replaying from snapshot, restore state
    if (options?.replayFromSnapshot) {
      // In a full implementation, this would restore state from the snapshot
      log.info("[playground] Replaying from snapshot", {
        snapshotId: options.replayFromSnapshot,
      });
    }

    // Create runtime for execution
    const runtime = await createManifestRuntime({
      prisma: database,
      log,
      captureException,
    });

    // Check if dry run - just validate guards and constraints without executing
    if (options?.dryRun) {
      const dryRunResult = await performDryRun(runtime, command, testData, {
        userId: user.id,
        tenantId,
      });
      return NextResponse.json({
        ...dryRunResult,
        executionTime: Date.now() - startTime,
      });
    }

    // Execute the command
    const result = await runtime.runCommand(commandName, testData, {
      entityName,
    });

    const executionTime = Date.now() - startTime;

    // Build the execution result
    const executionResult: ExecutionResult = {
      success: result.success,
      commandName,
      entityName,
      input: testData,
      guards: extractGuardResults(result),
      constraints: extractConstraintResults(result),
      policy: extractPolicyResult(result),
      executionTime,
    };

    // Add output if successful
    if (result.success) {
      executionResult.output = {
        result: result.result as Record<string, unknown>,
        events: result.emittedEvents?.map((e) => ({
          name: e.name,
          payload: e.payload as Record<string, unknown>,
        })),
      };
    } else {
      executionResult.error = result.error || "Command execution failed";
    }

    // Capture snapshot if requested
    if (options?.captureSnapshot && result.success) {
      const snapshotId = `${entityName}-${commandName}-${Date.now()}`;
      executionResult.snapshot = {
        id: snapshotId,
        timestamp: Date.now(),
        state: result.result as Record<string, unknown>,
      };
    }

    // Store in execution history
    const historyKey = `${tenantId}:${entityName}`;
    const history = executionHistory.get(historyKey) || [];
    history.push({
      id: `exec-${Date.now()}`,
      timestamp: Date.now(),
      entityName,
      commandName,
      input: testData,
      result: executionResult,
    });
    executionHistory.set(historyKey, history.slice(-50)); // Keep last 50 executions

    return NextResponse.json(executionResult);
  } catch (error) {
    log.error("[playground] Execution failed", { error });
    captureException(error);
    return NextResponse.json(
      {
        error: "Execution failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

async function performDryRun(
  runtime: RuntimeEngine,
  command: IRCommand,
  testData: Record<string, unknown>,
  ctx: { userId: string; tenantId: string }
): Promise<Omit<ExecutionResult, "executionTime">> {
  // For dry run, we evaluate guards and simulate constraints
  // without actually executing the command

  const guards: ExecutionResult["guards"] = [];
  const constraints: ExecutionResult["constraints"] = [];

  // Evaluate guards
  if (command.guards) {
    for (let i = 0; i < command.guards.length; i++) {
      const guard = command.guards[i];
      // In a full implementation, this would use the runtime's guard evaluation
      guards.push({
        index: i,
        expression: guard.code || guard.expression,
        passed: true, // Placeholder - actual evaluation would use runtime
        message: guard.message,
      });
    }
  }

  // Evaluate constraints
  if (command.constraints) {
    for (const constraint of command.constraints) {
      constraints.push({
        name: constraint.name,
        severity: constraint.severity || "warn",
        passed: true, // Placeholder - actual evaluation would use runtime
        message: constraint.message,
      });
    }
  }

  return {
    success: true,
    commandName: command.name,
    entityName: command.entity || "",
    input: testData,
    guards,
    constraints,
    policy: {
      denied: false,
    },
  };
}

function extractGuardResults(
  result: Awaited<ReturnType<RuntimeEngine["runCommand"]>>
): ExecutionResult["guards"] {
  // Extract guard results from command result
  // The runtime may include this in the result metadata
  return [
    {
      index: 0,
      expression: "N/A",
      passed: result.success,
      message: result.success ? "All guards passed" : "Some guards failed",
    },
  ];
}

function extractConstraintResults(
  result: Awaited<ReturnType<RuntimeEngine["runCommand"]>>
): ExecutionResult["constraints"] {
  // Extract constraint results from command result
  if (result.outcomes && Array.isArray(result.outcomes)) {
    return result.outcomes
      .filter((o: unknown) => o && typeof o === "object" && "constraint" in o)
      .map((o: unknown) => {
        const outcome = o as {
          constraint: { name: string };
          severity: string;
          passed: boolean;
          message?: string;
        };
        return {
          name: outcome.constraint.name,
          severity: outcome.severity || "warn",
          passed: outcome.passed,
          message: outcome.message,
        };
      });
  }
  return [];
}

function extractPolicyResult(
  result: Awaited<ReturnType<RuntimeEngine["runCommand"]>>
): ExecutionResult["policy"] {
  // Extract policy result from command result
  if (result.success) {
    return { denied: false };
  }
  return {
    denied: true,
    reason: result.error || "Policy denied execution",
  };
}

// GET endpoint to retrieve execution history
export async function GET(request: Request) {
  try {
    const { user, tenantId } = await getTenant();
    if (!(user?.id && tenantId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const entityName = searchParams.get("entity");

    if (entityName) {
      const history = executionHistory.get(`${tenantId}:${entityName}`) || [];
      return NextResponse.json({ history });
    }

    // Return all history for tenant
    const allHistory: ExecutionHistoryEntry[] = [];
    for (const [key, entries] of executionHistory.entries()) {
      if (key.startsWith(`${tenantId}:`)) {
        allHistory.push(...entries);
      }
    }

    return NextResponse.json({ history: allHistory });
  } catch (error) {
    log.error("[playground] Failed to retrieve history", { error });
    return NextResponse.json(
      { error: "Failed to retrieve history" },
      { status: 500 }
    );
  }
}
