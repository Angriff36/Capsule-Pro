import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const STATE_DIR = join(process.cwd(), ".cursor/hooks/state");
const OUTPUT_FILE = "C:\\Users\\Ryan\\Documents\\chatgptoutput.txt";

export function ensureStateDir() {
  mkdirSync(STATE_DIR, { recursive: true });
}

export function requiredPath(conversationId) {
  return join(STATE_DIR, `${conversationId}.required`);
}

export function donePath(conversationId) {
  return join(STATE_DIR, `${conversationId}.done`);
}

export function isGraphragRequired(conversationId) {
  return existsSync(requiredPath(conversationId));
}

export function isGraphragDone(conversationId) {
  return existsSync(donePath(conversationId));
}

export function markRequired(conversationId, promptSnippet) {
  ensureStateDir();
  writeFileSync(requiredPath(conversationId), promptSnippet, "utf8");
  if (existsSync(donePath(conversationId))) {
    unlinkSync(donePath(conversationId));
  }
}

export function markDone(conversationId) {
  ensureStateDir();
  writeFileSync(donePath(conversationId), new Date().toISOString(), "utf8");
}

export function readGraphragOutput(maxChars = 12_000) {
  if (!existsSync(OUTPUT_FILE)) {
    return null;
  }
  const text = readFileSync(OUTPUT_FILE, "utf8").trim();
  if (!text) {
    return null;
  }
  return text.length > maxChars ? `${text.slice(0, maxChars)}\n…[truncated]` : text;
}

export const GRAPHRAG_SHELL =
  "powershell -NoProfile -ExecutionPolicy Bypass -File ./scripts/graphrag.ps1 \"<task question>\"";

export const DENY_MESSAGE = `BLOCKED by project hook (AGENTS.md GraphRAG rule).

You must run GraphRAG BEFORE Grep / Read / SemanticSearch / Glob / Task on this task.

Run Shell:
${GRAPHRAG_SHELL}

Then read: ${OUTPUT_FILE}
Inspect TOP SOURCE FILES from that output before any other codebase exploration.`;
