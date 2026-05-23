// src/fixer.ts
import { existsSync } from "fs";
import { readFile, writeFile } from "fs/promises";
import { relative, resolve } from "path";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { z } from "zod";
var APP_PREFIX_RE = /^app:\/\/\//;
var WEBPACK_PREFIX_RE = /^webpack-internal:\/\/\//;
var RSC_PREFIX_RE = /^\(rsc\)\//;
var WEBPACK_CHUNK_GROUP_RE = /^\([^)]+\)\//;
var DOT_SLASH_RE = /^\.\//g;
var NEXT_SERVER_RE = /^\.next\/server\//;
var NEXT_DEV_SERVER_RE = /^\.next-dev\/server\//;
var DIST_RE = /^dist\//;
var NEXT_RE = /^\.next\//;
var JSON_FENCE_START_RE = /^```json\s*\n?/;
var JSON_FENCE_END_RE = /\n?```\s*$/;
var MONOREPO_APP_PREFIXES = [
  "apps/app",
  "apps/api",
  "apps/web",
  "apps/docs",
  "apps/studio",
  "apps/mobile",
  "apps/storybook",
  "apps/email",
  "apps/forecasting-service"
];
var DEFAULT_FIXER_CONFIG = {
  model: "gpt-4o",
  maxSourceFiles: 8,
  maxLinesPerFile: 300,
  temperature: 0.2
};
var AIFixResponseSchema = z.object({
  analysis: z.string().describe("Brief root cause analysis of the error"),
  fixable: z.boolean().describe("Whether the AI can generate a fix for this error"),
  reason: z.string().optional().describe("If not fixable, explain why"),
  edits: z.array(
    z.object({
      filePath: z.string().describe("Relative path to the file from repo root"),
      searchContent: z.string().describe(
        "Exact content to find in the file (must match verbatim). Include enough surrounding lines for a unique match."
      ),
      replaceContent: z.string().describe("Content to replace the search content with"),
      explanation: z.string().describe("Why this change fixes the issue")
    })
  )
});
function resolveFramePath(frame, workingDir) {
  const raw = frame.absPath ?? frame.filename;
  if (!raw) {
    return null;
  }
  if (raw.includes("node_modules") || raw.startsWith("node:") || raw.includes("webpack/runtime") || raw.includes("<anonymous>")) {
    return null;
  }
  const normalizedRaw = raw.replace(/\\/g, "/");
  const normalizedWorkDir = workingDir.replace(/\\/g, "/");
  if (normalizedRaw.includes(normalizedWorkDir)) {
    const idx = normalizedRaw.indexOf(normalizedWorkDir);
    const absCandidate = normalizedRaw.slice(idx);
    if (existsSync(absCandidate)) {
      return resolve(absCandidate);
    }
    const relFromAbs = normalizedRaw.slice(idx + normalizedWorkDir.length + 1);
    const relCandidate = resolve(workingDir, relFromAbs);
    if (existsSync(relCandidate)) {
      return relCandidate;
    }
  }
  let cleaned = raw.replace(APP_PREFIX_RE, "").replace(WEBPACK_PREFIX_RE, "").replace(RSC_PREFIX_RE, "").replace(WEBPACK_CHUNK_GROUP_RE, "").replace(DOT_SLASH_RE, "");
  while (WEBPACK_CHUNK_GROUP_RE.test(cleaned)) {
    cleaned = cleaned.replace(WEBPACK_CHUNK_GROUP_RE, "");
  }
  cleaned = cleaned.replace(DOT_SLASH_RE, "");
  if (cleaned.startsWith("/")) {
    cleaned = cleaned.slice(1);
  }
  while (cleaned.startsWith("../")) {
    cleaned = cleaned.slice(3);
  }
  const candidate = resolve(workingDir, cleaned);
  if (existsSync(candidate)) {
    return candidate;
  }
  const remaps = [
    [NEXT_SERVER_RE, ""],
    [NEXT_DEV_SERVER_RE, ""],
    [DIST_RE, "src/"],
    [NEXT_RE, ""]
  ];
  for (const [pattern, replacement] of remaps) {
    const remapped = cleaned.replace(pattern, replacement);
    const remappedPath = resolve(workingDir, remapped);
    if (existsSync(remappedPath)) {
      return remappedPath;
    }
  }
  for (const prefix of MONOREPO_APP_PREFIXES) {
    const prefixed = resolve(workingDir, prefix, cleaned);
    if (existsSync(prefixed)) {
      return prefixed;
    }
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
async function readSourceFiles(issue, workingDir, maxFiles, maxLines) {
  const sources = /* @__PURE__ */ new Map();
  const frames = issue.stackFrames ?? [];
  const reversedFrames = [...frames].reverse();
  for (const frame of reversedFrames) {
    if (sources.size >= maxFiles) {
      break;
    }
    const absPath = resolveFramePath(frame, workingDir);
    if (!absPath) {
      continue;
    }
    const relPath = relative(workingDir, absPath);
    if (sources.has(relPath)) {
      continue;
    }
    try {
      const content = await readFile(absPath, "utf-8");
      const lines = content.split("\n");
      if (lines.length > maxLines) {
        const errorLine = frame.line ?? 0;
        const halfWindow = Math.floor(maxLines / 2);
        const start = Math.max(0, errorLine - halfWindow);
        const end = Math.min(lines.length, errorLine + halfWindow);
        const truncated = lines.slice(start, end).join("\n");
        sources.set(
          relPath,
          `// ... (showing lines ${start + 1}-${end} of ${lines.length}, error near line ${errorLine})
${truncated}`
        );
      } else {
        sources.set(relPath, content);
      }
    } catch {
    }
  }
  return sources;
}
function buildSystemPrompt() {
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
function buildUserPrompt(issue, sources) {
  const sections = [];
  sections.push("## Error");
  sections.push(`Type: ${issue.exceptionType ?? "Unknown"}`);
  sections.push(`Message: ${issue.exceptionValue ?? "No message"}`);
  sections.push(`Title: ${issue.title}`);
  if (issue.culprit) {
    sections.push(`Culprit: ${issue.culprit}`);
  }
  sections.push("");
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
  sections.push("## Context");
  if (issue.environment) {
    sections.push(`Environment: ${issue.environment}`);
  }
  if (issue.release) {
    sections.push(`Release: ${issue.release}`);
  }
  if (issue.tags && Object.keys(issue.tags).length > 0) {
    sections.push(`Tags: ${JSON.stringify(issue.tags)}`);
  }
  return sections.join("\n");
}
async function callAI(systemPrompt, userPrompt, config) {
  const provider = createOpenAI({ apiKey: config.openaiApiKey });
  const result = await generateText({
    model: provider(config.model),
    system: systemPrompt,
    prompt: userPrompt,
    temperature: config.temperature,
    maxOutputTokens: 4096
  });
  const text = result.text.trim();
  const cleaned = text.replace(JSON_FENCE_START_RE, "").replace(JSON_FENCE_END_RE, "").trim();
  const parsed = JSON.parse(cleaned);
  return AIFixResponseSchema.parse(parsed);
}
async function applyEdits(edits, workingDir) {
  const applied = [];
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
        `AI suggested a search-and-replace for ${edit.filePath} but the search content was not found in the file. This likely means the AI hallucinated the file content. Aborting.`
      );
    }
    const firstIdx = originalContent.indexOf(edit.searchContent);
    const secondIdx = originalContent.indexOf(edit.searchContent, firstIdx + 1);
    if (secondIdx !== -1) {
      throw new Error(
        `AI suggested a search-and-replace for ${edit.filePath} but the search content matches multiple locations. The AI needs to provide more context for a unique match. Aborting.`
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
      explanation: edit.explanation
    });
  }
  return applied;
}
async function revertEdits(edits, workingDir) {
  for (const edit of edits) {
    const absPath = resolve(workingDir, edit.filePath);
    if (!existsSync(absPath)) {
      continue;
    }
    const currentContent = await readFile(absPath, "utf-8");
    const reverted = currentContent.replace(
      edit.newContent,
      edit.originalContent
    );
    await writeFile(absPath, reverted, "utf-8");
  }
}
async function attemptAIFix(issue, config) {
  const fullConfig = {
    ...DEFAULT_FIXER_CONFIG,
    ...config
  };
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
      error: "No readable source files found. Stack frames may reference compiled/bundled code."
    };
  }
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(issue, sources);
  let aiResponse;
  try {
    aiResponse = await callAI(systemPrompt, userPrompt, fullConfig);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      edits: [],
      analysis: "AI call failed",
      error: `Failed to get AI response: ${message}`
    };
  }
  if (!aiResponse.fixable || aiResponse.edits.length === 0) {
    return {
      success: false,
      edits: [],
      analysis: aiResponse.analysis,
      error: aiResponse.reason ?? "AI determined this error is not auto-fixable"
    };
  }
  let appliedEdits;
  try {
    appliedEdits = await applyEdits(aiResponse.edits, fullConfig.workingDir);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      edits: [],
      analysis: aiResponse.analysis,
      error: `Failed to apply edits: ${message}`
    };
  }
  return {
    success: true,
    edits: appliedEdits,
    analysis: aiResponse.analysis
  };
}

export {
  resolveFramePath,
  revertEdits,
  attemptAIFix
};
//# sourceMappingURL=chunk-RW5F3V3X.js.map