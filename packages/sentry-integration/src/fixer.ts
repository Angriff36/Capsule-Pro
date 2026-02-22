import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { relative, resolve } from "node:path";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { z } from "zod";

import type { ParsedSentryIssue, StackFrame } from "./types.js";

// Top-level regex patterns (hoisted for performance per lint rules)
const APP_PREFIX_RE = /^app:\/\/\//;
const WEBPACK_PREFIX_RE = /^webpack-internal:\/\/\//;
const RSC_PREFIX_RE = /^\(rsc\)\//;
const WEBPACK_CHUNK_GROUP_RE = /^\([^)]+\)\//;
const DOT_SLASH_RE = /^\.\//g;
const NEXT_SERVER_RE = /^\.next\/server\//;
const NEXT_DEV_SERVER_RE = /^\.next-dev\/server\//;
const DIST_RE = /^dist\//;
const NEXT_RE = /^\.next\//;
const JSON_FENCE_START_RE = /^```json\s*\n?/;
const JSON_FENCE_END_RE = /\n?```\s*$/;

/**
 * Common monorepo app subdirectories to try when a webpack-internal path
 * can't be resolved at the repo root. Sentry frames from Next.js dev often
 * emit paths like `app/(authenticated)/...` which are relative to `apps/app/`,
 * not the repo root.
 */
const MONOREPO_APP_PREFIXES = [
  "apps/app",
  "apps/api",
  "apps/web",
  "apps/docs",
  "apps/studio",
  "apps/mobile",
  "apps/storybook",
  "apps/email",
  "apps/forecasting-service",
];

/**
 * Configuration for the AI fixer
 */
export interface FixerConfig {
  /** OpenAI API key */
  openaiApiKey: string;
  /** Model to use for analysis */
  model: string;
  /** Working directory (repo root) */
  workingDir: string;
  /** Max source files to include in context */
  maxSourceFiles: number;
  /** Max lines per source file to include */
  maxLinesPerFile: number;
  /** Temperature for generation */
  temperature: number;
}

const DEFAULT_FIXER_CONFIG: Partial<FixerConfig> = {
  model: "gpt-4o",
  maxSourceFiles: 8,
  maxLinesPerFile: 300,
  temperature: 0.2,
};

/**
 * A single file edit returned by the AI
 */
export interface FileEdit {
  filePath: string;
  originalContent: string;
  newContent: string;
  explanation: string;
}

/**
 * Result of the AI fix attempt
 */
export interface FixResult {
  success: boolean;
  edits: FileEdit[];
  analysis: string;
  error?: string;
}

/**
 * Zod schema for validating the AI response
 */
const AIFixResponseSchema = z.object({
  analysis: z.string().describe("Brief root cause analysis of the error"),
  fixable: z
    .boolean()
    .describe("Whether the AI can generate a fix for this error"),
  reason: z.string().optional().describe("If not fixable, explain why"),
  edits: z.array(
    z.object({
      filePath: z.string().describe("Relative path to the file from repo root"),
      searchContent: z
        .string()
        .describe(
          "Exact content to find in the file (must match verbatim). Include enough surrounding lines for a unique match."
        ),
      replaceContent: z
        .string()
        .describe("Content to replace the search content with"),
      explanation: z.string().describe("Why this change fixes the issue"),
    })
  ),
});

type AIFixResponse = z.infer<typeof AIFixResponseSchema>;

/**
 * Resolve a Sentry stack frame filename to a local file path.
 *
 * Sentry frames can have various formats:
 * - app:///path/to/file.ts
 * - /absolute/path/to/file.ts
 * - relative/path/to/file.ts
 * - webpack-internal:///path/to/file.ts
 * - node_modules/...
 */
export function resolveFramePath(
  frame: StackFrame,
  workingDir: string
): string | null {
  const raw = frame.absPath ?? frame.filename;
  if (!raw) return null;

  // Skip node_modules, node internals, and webpack runtime
  if (
    raw.includes("node_modules") ||
    raw.startsWith("node:") ||
    raw.includes("webpack/runtime") ||
    raw.includes("<anonymous>")
  ) {
    return null;
  }

  // Try absolute path first — Sentry often includes full paths like
  // C:\Projects\capsule-pro\apps\app\... or /home/user/project/...
  // If the path starts with the workingDir, just use it directly
  const normalizedRaw = raw.replace(/\\/g, "/");
  const normalizedWorkDir = workingDir.replace(/\\/g, "/");
  if (normalizedRaw.includes(normalizedWorkDir)) {
    const idx = normalizedRaw.indexOf(normalizedWorkDir);
    const absCandidate = normalizedRaw.slice(idx);
    if (existsSync(absCandidate)) {
      return resolve(absCandidate);
    }
    // Extract relative path from the absolute path
    const relFromAbs = normalizedRaw.slice(idx + normalizedWorkDir.length + 1);
    const relCandidate = resolve(workingDir, relFromAbs);
    if (existsSync(relCandidate)) {
      return relCandidate;
    }
  }

  // Strip common prefixes
  let cleaned = raw
    .replace(APP_PREFIX_RE, "")
    .replace(WEBPACK_PREFIX_RE, "")
    .replace(RSC_PREFIX_RE, "")
    .replace(WEBPACK_CHUNK_GROUP_RE, "")
    .replace(DOT_SLASH_RE, "");

  // Strip repeated webpack chunk groups (can be nested)
  while (WEBPACK_CHUNK_GROUP_RE.test(cleaned)) {
    cleaned = cleaned.replace(WEBPACK_CHUNK_GROUP_RE, "");
  }

  // Strip leading ./ again after chunk group removal
  cleaned = cleaned.replace(DOT_SLASH_RE, "");

  // If it starts with / it might be absolute — try relative to workingDir
  if (cleaned.startsWith("/")) {
    cleaned = cleaned.slice(1);
  }

  // Strip ../../ relative prefixes (webpack loaders emit these)
  while (cleaned.startsWith("../")) {
    cleaned = cleaned.slice(3);
  }

  const candidate = resolve(workingDir, cleaned);
  if (existsSync(candidate)) {
    return candidate;
  }

  // Try common source map remappings
  const remaps = [
    [NEXT_SERVER_RE, ""],
    [NEXT_DEV_SERVER_RE, ""],
    [DIST_RE, "src/"],
    [NEXT_RE, ""],
  ] as const;

  for (const [pattern, replacement] of remaps) {
    const remapped = cleaned.replace(pattern, replacement);
    const remappedPath = resolve(workingDir, remapped);
    if (existsSync(remappedPath)) {
      return remappedPath;
    }
  }

  // Monorepo fallback: try the cleaned path under each app/package subdirectory.
  // Sentry frames from Next.js dev emit paths like `app/(authenticated)/...`
  // which are relative to `apps/app/`, not the repo root.
  for (const prefix of MONOREPO_APP_PREFIXES) {
    const prefixed = resolve(workingDir, prefix, cleaned);
    if (existsSync(prefixed)) {
      return prefixed;
    }
    // Also try remaps under each prefix
    for (const [pattern, replacement] of remaps) {
      const remapped = cleaned.replace(pattern, replacement);
      const remappedPrefixed = resolve(workingDir, prefix, remapped);
      if (existsSync(remappedPrefixed)) {
        return remappedPrefixed;
      }
    }
  }

  return null;
}

/**
 * Read source files referenced in the stack trace.
 * Returns a map of relative path -> file content.
 */
async function readSourceFiles(
  issue: ParsedSentryIssue,
  workingDir: string,
  maxFiles: number,
  maxLines: number
): Promise<Map<string, string>> {
  const sources = new Map<string, string>();
  const frames = issue.stackFrames ?? [];

  // Process frames in order (most relevant first — Sentry puts app frames at the end)
  const reversedFrames = [...frames].reverse();

  for (const frame of reversedFrames) {
    if (sources.size >= maxFiles) break;

    const absPath = resolveFramePath(frame, workingDir);
    if (!absPath) continue;

    const relPath = relative(workingDir, absPath);
    if (sources.has(relPath)) continue;

    try {
      const content = await readFile(absPath, "utf-8");
      const lines = content.split("\n");

      if (lines.length > maxLines) {
        // Focus on the area around the error line
        const errorLine = frame.line ?? 0;
        const halfWindow = Math.floor(maxLines / 2);
        const start = Math.max(0, errorLine - halfWindow);
        const end = Math.min(lines.length, errorLine + halfWindow);
        const truncated = lines.slice(start, end).join("\n");
        sources.set(
          relPath,
          `// ... (showing lines ${start + 1}-${end} of ${lines.length}, error near line ${errorLine})\n${truncated}`
        );
      } else {
        sources.set(relPath, content);
      }
    } catch {
      // File not readable — skip
    }
  }

  return sources;
}

/**
 * Build the system prompt for the AI fixer
 */
function buildSystemPrompt(): string {
  return `You are an expert software engineer tasked with fixing production errors reported by Sentry.

You will receive:
1. The error type and message
2. The stack trace
3. Source code of the relevant files

Your job is to:
1. Analyze the root cause of the error
2. Determine if you can fix it with code changes
3. If fixable, provide exact search-and-replace edits

RULES:
- Only fix the actual bug. Do NOT refactor, clean up, or "improve" surrounding code.
- Your searchContent must be an EXACT verbatim match of existing file content (including whitespace/indentation).
- Include enough context in searchContent to uniquely identify the location (typically 3-10 lines).
- Keep fixes minimal and surgical. The smallest correct fix is the best fix.
- If the error is caused by external factors (network, database state, third-party API), mark as not fixable.
- If the error requires schema changes, migrations, or environment config, mark as not fixable.
- If you're not confident in the fix, mark as not fixable. False positives waste more time than skipping.
- Never modify test files, migration files, or generated files.

RESPONSE FORMAT:
Respond with valid JSON matching this exact schema:
{
  "analysis": "Brief root cause analysis",
  "fixable": true/false,
  "reason": "If not fixable, explain why",
  "edits": [
    {
      "filePath": "relative/path/to/file.ts",
      "searchContent": "exact content to find",
      "replaceContent": "replacement content",
      "explanation": "why this fixes the issue"
    }
  ]
}

If not fixable, return an empty edits array.
Respond ONLY with the JSON object. No markdown fences, no commentary.`;
}

/**
 * Build the user prompt with error context and source files
 */
function buildUserPrompt(
  issue: ParsedSentryIssue,
  sources: Map<string, string>
): string {
  const sections: string[] = [];

  // Error info
  sections.push("## Error");
  sections.push(`Type: ${issue.exceptionType ?? "Unknown"}`);
  sections.push(`Message: ${issue.exceptionValue ?? "No message"}`);
  sections.push(`Title: ${issue.title}`);
  if (issue.culprit) {
    sections.push(`Culprit: ${issue.culprit}`);
  }
  sections.push("");

  // Stack trace
  if (issue.stackFrames && issue.stackFrames.length > 0) {
    sections.push("## Stack Trace");
    for (const frame of [...issue.stackFrames].reverse()) {
      const file = frame.filename ?? frame.absPath ?? "unknown";
      const line = frame.line ? `:${frame.line}` : "";
      const col = frame.column ? `:${frame.column}` : "";
      const fn = frame.function ?? "<anonymous>";
      sections.push(`  ${fn} at ${file}${line}${col}`);
    }
    sections.push("");
  }

  // Source files
  if (sources.size > 0) {
    sections.push("## Source Files");
    for (const [path, content] of sources) {
      sections.push(`### ${path}`);
      sections.push("```");
      sections.push(content);
      sections.push("```");
      sections.push("");
    }
  }

  // Environment context
  sections.push("## Context");
  if (issue.environment) sections.push(`Environment: ${issue.environment}`);
  if (issue.release) sections.push(`Release: ${issue.release}`);
  if (issue.tags && Object.keys(issue.tags).length > 0) {
    sections.push(`Tags: ${JSON.stringify(issue.tags)}`);
  }

  return sections.join("\n");
}

/**
 * Call the AI to analyze the error and generate a fix
 */
async function callAI(
  systemPrompt: string,
  userPrompt: string,
  config: FixerConfig
): Promise<AIFixResponse> {
  const provider = createOpenAI({ apiKey: config.openaiApiKey });

  const result = await generateText({
    model: provider(config.model),
    system: systemPrompt,
    prompt: userPrompt,
    temperature: config.temperature,
    maxOutputTokens: 4096,
  });

  const text = result.text.trim();

  // Strip markdown fences if the model wraps them anyway
  const cleaned = text
    .replace(JSON_FENCE_START_RE, "")
    .replace(JSON_FENCE_END_RE, "")
    .trim();

  const parsed = JSON.parse(cleaned);
  return AIFixResponseSchema.parse(parsed);
}

/**
 * Apply file edits to disk using search-and-replace
 */
async function applyEdits(
  edits: AIFixResponse["edits"],
  workingDir: string
): Promise<FileEdit[]> {
  const applied: FileEdit[] = [];

  for (const edit of edits) {
    const absPath = resolve(workingDir, edit.filePath);

    if (!existsSync(absPath)) {
      throw new Error(
        `AI suggested editing ${edit.filePath} but file does not exist`
      );
    }

    const originalContent = await readFile(absPath, "utf-8");

    if (!originalContent.includes(edit.searchContent)) {
      throw new Error(
        `AI suggested a search-and-replace for ${edit.filePath} but the search content was not found in the file. ` +
          "This likely means the AI hallucinated the file content. Aborting."
      );
    }

    // Check for multiple matches — we want exactly one
    const firstIdx = originalContent.indexOf(edit.searchContent);
    const secondIdx = originalContent.indexOf(edit.searchContent, firstIdx + 1);
    if (secondIdx !== -1) {
      throw new Error(
        `AI suggested a search-and-replace for ${edit.filePath} but the search content matches multiple locations. ` +
          "The AI needs to provide more context for a unique match. Aborting."
      );
    }

    const newContent = originalContent.replace(
      edit.searchContent,
      edit.replaceContent
    );

    await writeFile(absPath, newContent, "utf-8");

    applied.push({
      filePath: edit.filePath,
      originalContent: edit.searchContent,
      newContent: edit.replaceContent,
      explanation: edit.explanation,
    });
  }

  return applied;
}

/**
 * Revert applied edits (used when tests fail after applying a fix)
 */
export async function revertEdits(
  edits: FileEdit[],
  workingDir: string
): Promise<void> {
  for (const edit of edits) {
    const absPath = resolve(workingDir, edit.filePath);
    if (!existsSync(absPath)) continue;

    const currentContent = await readFile(absPath, "utf-8");
    const reverted = currentContent.replace(
      edit.newContent,
      edit.originalContent
    );
    await writeFile(absPath, reverted, "utf-8");
  }
}

/**
 * Attempt to fix a Sentry issue using AI analysis.
 *
 * This is the real implementation — no placeholders, no TODOs.
 *
 * Flow:
 * 1. Read source files from the stack trace
 * 2. Send error context + source to GPT-4o
 * 3. Parse structured response with file edits
 * 4. Apply edits via search-and-replace
 * 5. Return result (caller handles git commit, tests, PR)
 */
export async function attemptAIFix(
  issue: ParsedSentryIssue,
  config: Partial<FixerConfig> &
    Pick<FixerConfig, "openaiApiKey" | "workingDir">
): Promise<FixResult> {
  const fullConfig: FixerConfig = {
    ...DEFAULT_FIXER_CONFIG,
    ...config,
  } as FixerConfig;

  // Step 1: Read source files from stack trace
  const sources = await readSourceFiles(
    issue,
    fullConfig.workingDir,
    fullConfig.maxSourceFiles,
    fullConfig.maxLinesPerFile
  );

  if (sources.size === 0) {
    return {
      success: false,
      edits: [],
      analysis: "Could not resolve any source files from the stack trace",
      error:
        "No readable source files found. Stack frames may reference compiled/bundled code.",
    };
  }

  // Step 2: Build prompts
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(issue, sources);

  // Step 3: Call AI
  let aiResponse: AIFixResponse;
  try {
    aiResponse = await callAI(systemPrompt, userPrompt, fullConfig);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      edits: [],
      analysis: "AI call failed",
      error: `Failed to get AI response: ${message}`,
    };
  }

  // Step 4: Check if fixable
  if (!aiResponse.fixable || aiResponse.edits.length === 0) {
    return {
      success: false,
      edits: [],
      analysis: aiResponse.analysis,
      error:
        aiResponse.reason ?? "AI determined this error is not auto-fixable",
    };
  }

  // Step 5: Apply edits
  let appliedEdits: FileEdit[];
  try {
    appliedEdits = await applyEdits(aiResponse.edits, fullConfig.workingDir);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      edits: [],
      analysis: aiResponse.analysis,
      error: `Failed to apply edits: ${message}`,
    };
  }

  return {
    success: true,
    edits: appliedEdits,
    analysis: aiResponse.analysis,
  };
}
