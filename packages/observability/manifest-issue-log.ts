import "server-only";

import { appendFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

export type ManifestIssueKind =
  | "unknown_command"
  | "command_failed"
  | "policy_denied"
  | "guard_failed"
  | "runtime_error"
  | "store_json_fallback"
  | "store_missing"
  | "constraint_blocked"
  | "auth_error"
  | "prisma_error"
  | "server_action_error"
  | "request_error";

export interface ManifestIssueEntry {
  ts: string;
  kind: ManifestIssueKind;
  entity?: string;
  command?: string;
  message: string;
  httpStatus?: number;
  tenantId?: string;
  userId?: string;
  userRole?: string;
  source?: "api" | "app" | "database";
  details?: Record<string, unknown>;
  /**
   * True for kinds that represent an EXPECTED, user-facing validation outcome
   * (e.g. a guard rejecting an invalid transition) rather than a real system
   * fault. Expected entries are still recorded for debugging, but are mirrored
   * to the console on a separate, quiet `[manifest-validation]` channel so they
   * don't pollute the `[manifest-issue]` signal. Note: idempotent stale-state
   * guard failures never reach this logger at all — runManifestCommandCore
   * converts them to a no-op success upstream.
   */
  expected?: boolean;
}

/**
 * Kinds that are normal user/validation outcomes, not system faults. They are
 * classified separately from real manifest issues. `guard_failed` here is a
 * GENUINE invalid transition (the user tried something not allowed) — still
 * surfaced as 422 to the caller, but it is not `[manifest-issue]` noise.
 */
const EXPECTED_KINDS: ReadonlySet<ManifestIssueKind> = new Set(["guard_failed"]);

type IssueInput = Omit<ManifestIssueEntry, "ts">;

const DEDUPED_KINDS: ReadonlySet<ManifestIssueKind> = new Set([
  "store_json_fallback",
  "store_missing",
]);

const seenIssueKeys = new Set<string>();

function findMonorepoRoot(startDir: string): string | undefined {
  let dir = path.resolve(startDir);

  while (true) {
    if (existsSync(path.join(dir, "pnpm-workspace.yaml"))) {
      return dir;
    }

    const parent = path.dirname(dir);
    if (parent === dir) {
      return undefined;
    }
    dir = parent;
  }
}

function resolveMonorepoRoot(): string {
  const candidates = [process.env.INIT_CWD, process.cwd()].filter(
    Boolean
  ) as string[];

  for (const candidate of candidates) {
    const root = findMonorepoRoot(candidate);
    if (root) {
      return root;
    }
  }

  return process.cwd();
}

function issueLogPath(): string {
  if (process.env.MANIFEST_ISSUE_LOG_PATH) {
    return path.resolve(process.env.MANIFEST_ISSUE_LOG_PATH);
  }

  return path.join(
    resolveMonorepoRoot(),
    "apps",
    "api",
    ".manifest",
    "issues.jsonl"
  );
}

function dedupeKey(entry: IssueInput): string {
  return [
    entry.kind,
    entry.entity ?? "",
    entry.command ?? "",
    entry.message,
  ].join("|");
}

function mirrorToConsole(record: ManifestIssueEntry): void {
  const label = record.entity
    ? `${record.entity}.${record.command ?? "?"}`
    : (record.entity ?? record.source ?? "manifest");

  // Expected validation outcomes (e.g. genuine guard rejections) are classified
  // separately: a quiet debug-level `[manifest-validation]` line, NOT the
  // `[manifest-issue]` channel reserved for real faults.
  if (record.expected) {
    console.debug(
      `[manifest-validation] ${record.kind} ${label} — ${record.message}`
    );
    return;
  }

  const line = `[manifest-issue] ${record.kind} ${label} — ${record.message}`;

  if (
    record.kind === "runtime_error" ||
    record.kind === "store_missing" ||
    record.kind === "prisma_error" ||
    record.httpStatus === 500
  ) {
    console.error(line, record.details ?? "");
    return;
  }

  console.warn(line, record.details ?? "");
}

async function persistIssue(record: ManifestIssueEntry): Promise<void> {
  if (process.env.MANIFEST_ISSUE_LOG === "0") {
    return;
  }

  const filePath = issueLogPath();

  try {
    await mkdir(path.dirname(filePath), { recursive: true });
    await appendFile(filePath, `${JSON.stringify(record)}\n`, "utf8");
  } catch (error) {
    console.error("[manifest-issue] failed to write issues log:", error);
  }
}

/** Append a dev issue to `apps/api/.manifest/issues.jsonl` and mirror to console. */
export function logManifestIssue(entry: IssueInput): void {
  const key = dedupeKey(entry);
  if (DEDUPED_KINDS.has(entry.kind) && seenIssueKeys.has(key)) {
    return;
  }
  seenIssueKeys.add(key);

  const record: ManifestIssueEntry = {
    ...entry,
    expected: entry.expected ?? EXPECTED_KINDS.has(entry.kind),
    ts: new Date().toISOString(),
  };

  mirrorToConsole(record);
  void persistIssue(record);
}

export function getManifestIssueLogPath(): string {
  return issueLogPath();
}

export function inferAppSource(): "api" | "app" {
  const cwd = process.cwd().replace(/\\/g, "/");
  if (cwd.includes("/apps/api")) {
    return "api";
  }
  return "app";
}
