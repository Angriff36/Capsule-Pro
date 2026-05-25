import type { ParsedSentryIssue, StackFrame } from "./types.js";
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
 * Resolve a Sentry stack frame filename to a local file path.
 *
 * Sentry frames can have various formats:
 * - app:///path/to/file.ts
 * - /absolute/path/to/file.ts
 * - relative/path/to/file.ts
 * - webpack-internal:///path/to/file.ts
 * - node_modules/...
 */
export declare function resolveFramePath(frame: StackFrame, workingDir: string): string | null;
/**
 * Revert applied edits (used when tests fail after applying a fix)
 */
export declare function revertEdits(edits: FileEdit[], workingDir: string): Promise<void>;
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
export declare function attemptAIFix(issue: ParsedSentryIssue, config: Partial<FixerConfig> & Pick<FixerConfig, "openaiApiKey" | "workingDir">): Promise<FixResult>;
//# sourceMappingURL=fixer.d.ts.map