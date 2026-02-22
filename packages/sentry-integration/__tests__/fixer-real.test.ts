/**
 * Real integration tests for the AI fixer.
 *
 * These tests hit the actual OpenAI API — no mocks.
 * They create real files on disk, feed a real Sentry-shaped issue
 * to the fixer, and verify the AI actually produces a working edit.
 *
 * Requires OPENAI_API_KEY in the environment.
 */
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { config } from "dotenv";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  attemptAIFix,
  type FileEdit,
  resolveFramePath,
  revertEdits,
} from "../src/fixer";
import type { ParsedSentryIssue, StackFrame } from "../src/types";

// Load the key from the app's env file
config({ path: resolve(import.meta.dirname, "../../../apps/app/.env.local") });

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Temp directory for filesystem tests — isolated from the real repo
const TEST_DIR = resolve(import.meta.dirname, ".tmp-fixer-real");

function ensureTestDir() {
  if (!existsSync(TEST_DIR)) {
    mkdirSync(TEST_DIR, { recursive: true });
  }
}

function cleanTestDir() {
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true, force: true });
  }
}

function writeTestFile(relativePath: string, content: string) {
  const absPath = join(TEST_DIR, relativePath);
  const dir = resolve(absPath, "..");
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(absPath, content, "utf-8");
}

function makeSentryIssue(
  overrides: Partial<ParsedSentryIssue> = {}
): ParsedSentryIssue {
  return {
    issueId: "TEST-123",
    eventId: "evt-456",
    organizationSlug: "test-org",
    projectSlug: "test-project",
    environment: "production",
    release: "1.0.0",
    title: "TypeError: Cannot read properties of undefined (reading 'name')",
    message: "Cannot read properties of undefined (reading 'name')",
    culprit: "src/utils/format.ts",
    issueUrl: "https://sentry.io/api/0/issues/123/",
    webUrl: "https://sentry.io/organizations/test-org/issues/123/",
    exceptionType: "TypeError",
    exceptionValue: "Cannot read properties of undefined (reading 'name')",
    stackFrames: [],
    tags: {},
    rawPayload: {} as ParsedSentryIssue["rawPayload"],
    ...overrides,
  };
}

// ─── Pure logic tests (no API key needed) ────────────────────────────

describe("resolveFramePath", () => {
  beforeAll(ensureTestDir);
  afterAll(cleanTestDir);

  it("resolves a plain relative path that exists on disk", () => {
    writeTestFile("src/utils/helper.ts", "export const foo = 1;");
    const frame: StackFrame = {
      filename: "src/utils/helper.ts",
      function: "doStuff",
      line: 1,
      column: 10,
      absPath: null,
    };
    const result = resolveFramePath(frame, TEST_DIR);
    expect(result).toBe(resolve(TEST_DIR, "src/utils/helper.ts"));
  });

  it("strips app:/// prefix", () => {
    writeTestFile("src/app.ts", "x");
    const frame: StackFrame = {
      filename: null,
      function: null,
      line: null,
      column: null,
      absPath: "app:///src/app.ts",
    };
    expect(resolveFramePath(frame, TEST_DIR)).toBe(
      resolve(TEST_DIR, "src/app.ts")
    );
  });

  it("strips webpack-internal:/// prefix", () => {
    writeTestFile("src/wp.ts", "x");
    const frame: StackFrame = {
      filename: null,
      function: null,
      line: null,
      column: null,
      absPath: "webpack-internal:///src/wp.ts",
    };
    expect(resolveFramePath(frame, TEST_DIR)).toBe(
      resolve(TEST_DIR, "src/wp.ts")
    );
  });

  it("returns null for node_modules", () => {
    const frame: StackFrame = {
      filename: "node_modules/lib/index.js",
      function: null,
      line: null,
      column: null,
      absPath: null,
    };
    expect(resolveFramePath(frame, TEST_DIR)).toBeNull();
  });

  it("returns null for node: internals", () => {
    const frame: StackFrame = {
      filename: "node:internal/process/task_queues",
      function: null,
      line: null,
      column: null,
      absPath: null,
    };
    expect(resolveFramePath(frame, TEST_DIR)).toBeNull();
  });

  it("returns null for <anonymous>", () => {
    const frame: StackFrame = {
      filename: "<anonymous>",
      function: null,
      line: null,
      column: null,
      absPath: null,
    };
    expect(resolveFramePath(frame, TEST_DIR)).toBeNull();
  });

  it("returns null when file does not exist", () => {
    const frame: StackFrame = {
      filename: "src/nope.ts",
      function: null,
      line: null,
      column: null,
      absPath: null,
    };
    expect(resolveFramePath(frame, TEST_DIR)).toBeNull();
  });

  it("returns null when both filename and absPath are null", () => {
    const frame: StackFrame = {
      filename: null,
      function: null,
      line: null,
      column: null,
      absPath: null,
    };
    expect(resolveFramePath(frame, TEST_DIR)).toBeNull();
  });

  it("tries dist/ -> src/ remapping", () => {
    writeTestFile("src/service.ts", "export const svc = 1;");
    const frame: StackFrame = {
      filename: "dist/service.ts",
      function: null,
      line: null,
      column: null,
      absPath: null,
    };
    expect(resolveFramePath(frame, TEST_DIR)).toBe(
      resolve(TEST_DIR, "src/service.ts")
    );
  });
});

// ─── revertEdits (real filesystem, no API) ───────────────────────────

describe("revertEdits", () => {
  beforeAll(ensureTestDir);
  afterAll(cleanTestDir);

  it("actually reverts file content on disk", async () => {
    writeTestFile("src/revme.ts", 'const x = "fixed";');

    const edits: FileEdit[] = [
      {
        filePath: "src/revme.ts",
        originalContent: '"broken"',
        newContent: '"fixed"',
        explanation: "test",
      },
    ];

    await revertEdits(edits, TEST_DIR);

    const content = await readFile(join(TEST_DIR, "src/revme.ts"), "utf-8");
    expect(content).toBe('const x = "broken";');
  });

  it("skips files that no longer exist without throwing", async () => {
    const edits: FileEdit[] = [
      {
        filePath: "src/gone.ts",
        originalContent: "old",
        newContent: "new",
        explanation: "test",
      },
    ];
    await expect(revertEdits(edits, TEST_DIR)).resolves.toBeUndefined();
  });
});

// ─── Real AI integration tests ───────────────────────────────────────

describe("attemptAIFix — real OpenAI calls", () => {
  beforeAll(() => {
    if (!OPENAI_API_KEY) {
      console.warn("⚠️  OPENAI_API_KEY not found — skipping real AI tests");
    }
    ensureTestDir();
  });

  afterAll(cleanTestDir);

  it.skipIf(!OPENAI_API_KEY)(
    "fixes a real TypeError: Cannot read properties of undefined",
    async () => {
      // Set up a buggy file that would cause the exact error
      writeTestFile(
        "src/utils/format.ts",
        `export function formatUser(user) {
  return user.name.toUpperCase();
}

export function processUsers(users) {
  return users.map(u => formatUser(u));
}
`
      );

      const issue = makeSentryIssue({
        title:
          "TypeError: Cannot read properties of undefined (reading 'name')",
        exceptionType: "TypeError",
        exceptionValue: "Cannot read properties of undefined (reading 'name')",
        culprit: "src/utils/format.ts in formatUser",
        stackFrames: [
          {
            filename: "src/utils/format.ts",
            function: "formatUser",
            line: 2,
            column: 15,
            absPath: null,
          },
          {
            filename: "src/utils/format.ts",
            function: "processUsers",
            line: 6,
            column: 24,
            absPath: null,
          },
        ],
      });

      const result = await attemptAIFix(issue, {
        openaiApiKey: OPENAI_API_KEY!,
        workingDir: TEST_DIR,
      });

      // The AI should have identified this as fixable and applied an edit
      console.log("AI analysis:", result.analysis);
      console.log("Success:", result.success);
      console.log("Edits:", result.edits.length);
      if (result.error) console.log("Error:", result.error);

      expect(result.success).toBe(true);
      expect(result.edits.length).toBeGreaterThan(0);

      // Verify the file was actually changed on disk
      const content = await readFile(
        join(TEST_DIR, "src/utils/format.ts"),
        "utf-8"
      );
      // The original unguarded access should be gone
      expect(content).not.toBe(
        `export function formatUser(user) {
  return user.name.toUpperCase();
}

export function processUsers(users) {
  return users.map(u => formatUser(u));
}
`
      );
      // The file should still be valid-looking code (not empty, not garbage)
      expect(content.length).toBeGreaterThan(20);
      expect(content).toContain("formatUser");
    },
    30_000
  );

  it.skipIf(!OPENAI_API_KEY)(
    "correctly identifies an unfixable error (database/infra issue)",
    async () => {
      writeTestFile(
        "src/db/query.ts",
        `import { database } from "@repo/database";

export async function getAnalytics(tenantId: string) {
  return database.$queryRaw\`
    SELECT total_cost FROM tenant_analytics.monthly_summary
    WHERE tenant_id = \${tenantId}
  \`;
}
`
      );

      const issue = makeSentryIssue({
        title:
          'PrismaClientKnownRequestError: column "total_cost" does not exist',
        exceptionType: "PrismaClientKnownRequestError",
        exceptionValue:
          'Raw query failed. Code: `42703`. Message: `column "total_cost" does not exist`',
        culprit: "src/db/query.ts in getAnalytics",
        stackFrames: [
          {
            filename: "src/db/query.ts",
            function: "getAnalytics",
            line: 4,
            column: 10,
            absPath: null,
          },
        ],
      });

      const result = await attemptAIFix(issue, {
        openaiApiKey: OPENAI_API_KEY!,
        workingDir: TEST_DIR,
      });

      console.log("AI analysis:", result.analysis);
      console.log("Success:", result.success);
      if (result.error) console.log("Reason:", result.error);

      // This should NOT be fixable — it's a missing database column
      // The AI should recognize this requires a migration, not a code change
      expect(result.success).toBe(false);

      // Verify the file was NOT modified
      const content = await readFile(
        join(TEST_DIR, "src/db/query.ts"),
        "utf-8"
      );
      expect(content).toContain("total_cost");
    },
    30_000
  );

  it.skipIf(!OPENAI_API_KEY)(
    "returns failure when stack trace only references nonexistent files",
    async () => {
      const issue = makeSentryIssue({
        stackFrames: [
          {
            filename: "src/does-not-exist.ts",
            function: "ghost",
            line: 1,
            column: 1,
            absPath: null,
          },
        ],
      });

      const result = await attemptAIFix(issue, {
        openaiApiKey: OPENAI_API_KEY!,
        workingDir: TEST_DIR,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("No readable source files");
    },
    10_000
  );

  it.skipIf(!OPENAI_API_KEY)(
    "fix can be reverted cleanly after applying",
    async () => {
      const originalCode = `export function divide(a, b) {
  return a / b;
}
`;
      writeTestFile("src/math.ts", originalCode);

      const issue = makeSentryIssue({
        title: "TypeError: Cannot divide by zero",
        exceptionType: "RangeError",
        exceptionValue: "Division by zero",
        stackFrames: [
          {
            filename: "src/math.ts",
            function: "divide",
            line: 2,
            column: 10,
            absPath: null,
          },
        ],
      });

      const result = await attemptAIFix(issue, {
        openaiApiKey: OPENAI_API_KEY!,
        workingDir: TEST_DIR,
      });

      if (!result.success) {
        console.log("AI chose not to fix (acceptable):", result.error);
        return;
      }

      // File should be changed
      const afterFix = await readFile(join(TEST_DIR, "src/math.ts"), "utf-8");
      expect(afterFix).not.toBe(originalCode);

      // Now revert
      await revertEdits(result.edits, TEST_DIR);

      // File should be back to original
      const afterRevert = await readFile(
        join(TEST_DIR, "src/math.ts"),
        "utf-8"
      );
      expect(afterRevert).toBe(originalCode);
    },
    30_000
  );
});
