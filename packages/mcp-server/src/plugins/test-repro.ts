/**
 * Test and reproduction tools.
 *
 * Tools:
 * - `tests.run`: Run tests with optional filtering
 * - `repro.record`: Record a reproduction case
 *
 * @packageDocumentation
 */

import { z } from "zod";
import { spawn } from "node:child_process";
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import type { McpPlugin, PluginContext } from "../types.js";

// Regex patterns (defined at top level for performance)
const PASSED_PATTERN = /(\d+)\s+passed/i;
const FAILED_PATTERN = /(\d+)\s+failed/i;
const SKIPPED_PATTERN = /(\d+)\s+skipped/i;

// Best-effort failure extraction. Vitest output varies; keep this conservative.
const FAILURE_PATTERN =
  /\n\s*FAIL\s+(.+?)\n([\s\S]*?)(?=\n\s*(FAIL|PASS|Test Files|Tests|Ran|$))/g;

// Test runner
interface TestResult {
  runId: string;
  passed: number;
  failed: number;
  skipped: number;
  failures: Array<{
    testName: string;
    file: string;
    error: string;
    stack?: string;
  }>;
  duration: number;
  coverage?: Record<string, unknown>;
}

async function runTests(
  packageFilter?: string,
  testPath?: string,
  pattern?: string,
  coverage?: boolean
): Promise<TestResult> {
  const runId = randomUUID();
  const startTime = Date.now();

  return new Promise((resolve) => {
    // We’ll run pnpm test, optionally filtered
    const args: string[] = ["test"];

    if (packageFilter) {
      args.unshift("--filter", packageFilter);
    }

    const env: Record<string, string> = {
      ...(process.env as Record<string, string>),
      CI: "true",
    };

    // These env vars are placeholders in case your test runner reads them.
    // If you have a different convention, update here.
    if (testPath) env.TEST_PATH = testPath;
    if (pattern) env.TEST_PATTERN = pattern;

    if (coverage) {
      args.push("--coverage");
    }

    const child = spawn("pnpm", args, {
      cwd: process.cwd(),
      env,
      shell: true,
      stdio: "pipe",
    });

    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr?.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("close", (code) => {
      const duration = Date.now() - startTime;

      const result: TestResult = {
        runId,
        passed: 0,
        failed: 0,
        skipped: 0,
        failures: [],
        duration,
      };

      const passedMatch = stdout.match(PASSED_PATTERN);
      const failedMatch = stdout.match(FAILED_PATTERN);
      const skippedMatch = stdout.match(SKIPPED_PATTERN);

      if (passedMatch) result.passed = parseInt(passedMatch[1] ?? "0", 10);
      if (failedMatch) result.failed = parseInt(failedMatch[1] ?? "0", 10);
      if (skippedMatch) result.skipped = parseInt(skippedMatch[1] ?? "0", 10);

      // Extract failure details (best-effort)
      FAILURE_PATTERN.lastIndex = 0;
      let match = FAILURE_PATTERN.exec(stdout);
      while (match !== null) {
        const file = (match[1] ?? "unknown").trim();
        const errorBlock = (match[2] ?? "").trim();
        result.failures.push({
          testName: "FAIL",
          file,
          error: errorBlock || "Unknown failure",
        });
        match = FAILURE_PATTERN.exec(stdout);
      }

      // If counts didn't parse but command failed, preserve stderr/stdout.
      if (result.passed === 0 && result.failed === 0 && code !== 0) {
        result.failures.push({
          testName: "Test execution failed",
          file: "unknown",
          error: (stderr || stdout || `Exit code: ${code ?? "unknown"}`).trim(),
        });
        result.failed = Math.max(result.failed, 1);
      }

      resolve(result);
    });

    child.on("error", (error) => {
      resolve({
        runId,
        passed: 0,
        failed: 1,
        skipped: 0,
        failures: [
          {
            testName: "Failed to spawn test process",
            file: "packages/mcp-server/src/plugins/test-repro.ts",
            error: error.message,
          },
        ],
        duration: Date.now() - startTime,
      });
    });
  });
}

// Repro recorder
interface ReproStep {
  tool: string;
  input: Record<string, unknown>;
  expected?: string;
  observed?: string;
}

interface ReproCase {
  reproId: string;
  title: string;
  description?: string;
  steps: ReproStep[];
  expected?: string;
  observed?: string;
  createdAt: string;
  savedAt: string;
}

function recordRepro(
  title: string,
  steps: ReproStep[],
  description?: string,
  expected?: string,
  observed?: string
): { reproId: string; bundle: ReproCase; savedAt: string } {
  const reproId = randomUUID();
  const now = new Date().toISOString();

  const bundle: ReproCase = {
    reproId,
    title,
    description,
    steps,
    expected,
    observed,
    createdAt: now,
    savedAt: now,
  };

  const reproDir = join(process.cwd(), ".tmp/repros");
  if (!existsSync(reproDir)) {
    mkdirSync(reproDir, { recursive: true });
  }

  const fileName = `${reproId}.json`;
  const filePath = join(reproDir, fileName);

  writeFileSync(filePath, JSON.stringify(bundle, null, 2), "utf-8");

  return { reproId, bundle, savedAt: now };
}

// Plugin
export const testReproPlugin: McpPlugin = {
  name: "test-repro",
  version: "1.0.0",

  register(ctx: PluginContext) {
    const { server } = ctx;

    // tests.run
    server.registerTool(
      "tests.run",
      {
        title: "Run Tests",
        description:
          "Run tests with optional filtering by package, file, or pattern. " +
          "Returns structured results with pass/fail counts and failure details.",
        inputSchema: z.object({
          packageFilter: z
            .string()
            .optional()
            .describe("Package to test (e.g., '@repo/apps-api' or '@repo/mcp-server')"),
          testPath: z.string().optional().describe("Specific test file path"),
          pattern: z.string().optional().describe("Test name pattern to match"),
          coverage: z
            .boolean()
            .optional()
            .default(false)
            .describe("Collect coverage information"),
        }),
      },
      async (args: {
        packageFilter?: string;
        testPath?: string;
        pattern?: string;
        coverage?: boolean;
      }) => {
        const { packageFilter, testPath, pattern, coverage = false } = args;

        try {
          const result = await runTests(packageFilter, testPath, pattern, coverage);
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          return {
            content: [
              {
                type: "text" as const,
                text: `Error running tests: ${message}`,
              },
            ],
            isError: true,
          };
        }
      }
    );

    // repro.record
    server.registerTool(
      "repro.record",
      {
        title: "Record Reproduction Case",
        description:
          "Record a minimal reproduction case with steps, expected behavior, " +
          "and observed behavior. Saves to .tmp/repros/ for later analysis.",
        inputSchema: z.object({
          title: z.string().describe("Brief title for the reproduction"),
          description: z.string().optional().describe("Detailed description of the issue"),
          steps: z
            .array(
              z.object({
                tool: z.string().describe("Tool or action name"),
                input: z.record(z.string(), z.unknown()).describe("Input parameters"),
                expected: z.string().optional().describe("Expected step result"),
                observed: z.string().optional().describe("Observed step result"),
              })
            )
            .describe("Steps to reproduce the issue"),
          expected: z.string().optional().describe("Overall expected behavior"),
          observed: z.string().optional().describe("Overall observed behavior"),
        }),
      },
      async (args: {
        title: string;
        description?: string;
        steps: Array<{
          tool: string;
          input: Record<string, unknown>;
          expected?: string;
          observed?: string;
        }>;
        expected?: string;
        observed?: string;
      }) => {
        try {
          const { title, steps, description, expected, observed } = args;
          const saved = recordRepro(title, steps, description, expected, observed);

          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(saved, null, 2),
              },
            ],
          };
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          return {
            content: [
              {
                type: "text" as const,
                text: `Error recording repro: ${message}`,
              },
            ],
            isError: true,
          };
        }
      }
    );
  },
};