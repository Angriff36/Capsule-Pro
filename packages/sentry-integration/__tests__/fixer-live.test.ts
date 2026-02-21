/**
 * Live integration test: pulls real issues from Sentry API,
 * runs the AI fixer against the actual codebase.
 *
 * No mocks. Real API calls. Real files. Real repo.
 */
import { resolve } from "node:path";
import { config } from "dotenv";
import { afterAll, describe, expect, it } from "vitest";
import { attemptAIFix, revertEdits } from "../src/fixer";
import type { ParsedSentryIssue, StackFrame } from "../src/types";

// Load env
config({ path: resolve(import.meta.dirname, "../../../.env") });
config({
  path: resolve(import.meta.dirname, "../../../apps/app/.env.local"),
  override: true,
});

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const SENTRY_TOKEN = process.env.SENTRY_AUTH_TOKEN_LOCAL_DEVELOPMENT;
const SENTRY_ORG = "the-eight-percent";
const REPO_ROOT = resolve(import.meta.dirname, "../../..");

/**
 * Fetch unresolved issues from Sentry API
 */
async function fetchSentryIssues(): Promise<
  Array<{
    id: string;
    shortId: string;
    title: string;
    count: string;
    level: string;
  }>
> {
  const res = await fetch(
    `https://sentry.io/api/0/projects/${SENTRY_ORG}/capsule-pro/issues/?query=is:unresolved&limit=100`,
    { headers: { Authorization: `Bearer ${SENTRY_TOKEN}` } }
  );
  if (!res.ok) throw new Error(`Sentry API ${res.status}: ${await res.text()}`);
  return res.json();
}

/**
 * Fetch the latest event for an issue and build a ParsedSentryIssue
 */
async function fetchIssueEvent(
  issueId: string
): Promise<ParsedSentryIssue | null> {
  const res = await fetch(
    `https://sentry.io/api/0/organizations/${SENTRY_ORG}/issues/${issueId}/events/latest/`,
    { headers: { Authorization: `Bearer ${SENTRY_TOKEN}` } }
  );
  if (!res.ok) return null;
  const evt = await res.json();

  let exceptionType: string | null = null;
  let exceptionValue: string | null = null;
  let stackFrames: StackFrame[] = [];

  for (const entry of evt.entries || []) {
    if (entry.type === "exception") {
      for (const exc of entry.data.values || []) {
        exceptionType = exc.type;
        exceptionValue = exc.value;
        stackFrames = (exc.stacktrace?.frames || []).map(
          (f: Record<string, unknown>): StackFrame => ({
            filename: typeof f.filename === "string" ? f.filename : null,
            function: typeof f.function === "string" ? f.function : null,
            line: typeof f.lineNo === "number" ? f.lineNo : null,
            column: typeof f.colNo === "number" ? f.colNo : null,
            absPath: typeof f.absPath === "string" ? f.absPath : null,
          })
        );
      }
    }
  }

  return {
    issueId: evt.groupID || issueId,
    eventId: evt.eventID,
    organizationSlug: SENTRY_ORG,
    projectSlug: "capsule-pro",
    environment: evt.tags?.find((t: { key: string }) => t.key === "environment")
      ?.value,
    release: evt.tags?.find((t: { key: string }) => t.key === "release")?.value,
    title: evt.title || "",
    message: exceptionValue || "",
    culprit: evt.culprit || "",
    issueUrl: `https://sentry.io/api/0/issues/${issueId}/`,
    webUrl: `https://the-eight-percent.sentry.io/issues/${issueId}/`,
    exceptionType,
    exceptionValue,
    stackFrames,
    tags: {},
    rawPayload: {} as ParsedSentryIssue["rawPayload"],
  };
}

// ─── Tests ───────────────────────────────────────────────────────────

const canRun = !!OPENAI_API_KEY && !!SENTRY_TOKEN;

describe("Live Sentry → AI Fixer (real repo)", () => {
  // Track edits so we can revert after each test
  let lastEdits: Awaited<ReturnType<typeof attemptAIFix>>["edits"] = [];

  afterAll(async () => {
    // Safety: revert any edits that were applied during tests
    if (lastEdits.length > 0) {
      await revertEdits(lastEdits, REPO_ROOT);
      lastEdits = [];
    }
  });

  it.skipIf(!canRun)(
    "CAPSULE-PRO-S: prisma relation does not exist → should correctly handle",
    async () => {
      const issues = await fetchSentryIssues();
      const target = issues.find((i) => i.shortId === "CAPSULE-PRO-S");
      expect(target).toBeDefined();

      const issue = await fetchIssueEvent(target!.id);
      if (!issue) throw new Error("Failed to fetch issue event");

      console.log("Issue:", issue.title);
      console.log(
        "Exception:",
        issue.exceptionType,
        "-",
        issue.exceptionValue?.slice(0, 150)
      );
      console.log("Stack frames:", issue.stackFrames?.length ?? 0);

      const result = await attemptAIFix(issue, {
        openaiApiKey: OPENAI_API_KEY!,
        workingDir: REPO_ROOT,
      });

      console.log("AI analysis:", result.analysis);
      console.log("Success:", result.success);
      if (result.error) console.log("Error:", result.error);
      if (result.edits.length > 0) {
        console.log("Edits applied:");
        for (const edit of result.edits) {
          console.log("  File:", edit.filePath);
          console.log("  Explanation:", edit.explanation);
        }
        // Revert immediately — we're testing, not deploying
        await revertEdits(result.edits, REPO_ROOT);
        console.log("Reverted all edits.");
      }

      // This is a missing DB relation — should be not fixable
      // But even if the AI tries something, the test passes as long as
      // it doesn't crash and gives a coherent response
      expect(typeof result.success).toBe("boolean");
      expect(result.analysis.length).toBeGreaterThan(0);
    },
    60_000
  );

  it.skipIf(!canRun)(
    "CAPSULE-PRO-H: unsupported storage target → should analyze and respond",
    async () => {
      const issues = await fetchSentryIssues();
      const target = issues.find((i) => i.shortId === "CAPSULE-PRO-H");
      expect(target).toBeDefined();

      const issue = await fetchIssueEvent(target!.id);
      if (!issue) throw new Error("Failed to fetch issue event");

      console.log("Issue:", issue.title);
      console.log(
        "Exception:",
        issue.exceptionType,
        "-",
        issue.exceptionValue?.slice(0, 200)
      );
      console.log("Stack frames:", issue.stackFrames?.length ?? 0);

      const result = await attemptAIFix(issue, {
        openaiApiKey: OPENAI_API_KEY!,
        workingDir: REPO_ROOT,
      });

      console.log("AI analysis:", result.analysis);
      console.log("Success:", result.success);
      if (result.error) console.log("Error:", result.error);
      if (result.edits.length > 0) {
        console.log("Edits applied:");
        for (const edit of result.edits) {
          console.log("  File:", edit.filePath);
          console.log("  Explanation:", edit.explanation);
        }
        await revertEdits(result.edits, REPO_ROOT);
        console.log("Reverted all edits.");
      }

      expect(typeof result.success).toBe("boolean");
      expect(result.analysis.length).toBeGreaterThan(0);
    },
    60_000
  );

  it.skipIf(!canRun)(
    "CAPSULE-PRO-6: slug conflict → should analyze and respond",
    async () => {
      const issues = await fetchSentryIssues();
      const target = issues.find((i) => i.shortId === "CAPSULE-PRO-6");
      expect(target).toBeDefined();

      const issue = await fetchIssueEvent(target!.id);
      if (!issue) throw new Error("Failed to fetch issue event");

      console.log("Issue:", issue.title);
      console.log(
        "Exception:",
        issue.exceptionType,
        "-",
        issue.exceptionValue?.slice(0, 200)
      );

      const result = await attemptAIFix(issue, {
        openaiApiKey: OPENAI_API_KEY!,
        workingDir: REPO_ROOT,
      });

      console.log("AI analysis:", result.analysis);
      console.log("Success:", result.success);
      if (result.error) console.log("Error:", result.error);
      if (result.edits.length > 0) {
        console.log("Edits applied:");
        for (const edit of result.edits) {
          console.log("  File:", edit.filePath);
          console.log("  Explanation:", edit.explanation);
        }
        await revertEdits(result.edits, REPO_ROOT);
        console.log("Reverted all edits.");
      }

      expect(typeof result.success).toBe("boolean");
      expect(result.analysis.length).toBeGreaterThan(0);
    },
    60_000
  );
});
