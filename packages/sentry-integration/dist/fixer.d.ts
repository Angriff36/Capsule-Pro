import { P as ParsedSentryIssue, c as StackFrame } from './types-CZP2VeKg.js';
import 'zod';

/**
 * Configuration for the AI fixer
 */
interface FixerConfig {
    /** Max lines per source file to include */
    maxLinesPerFile: number;
    /** Max source files to include in context */
    maxSourceFiles: number;
    /** Model to use for analysis */
    model: string;
    /** OpenAI API key */
    openaiApiKey: string;
    /** Temperature for generation */
    temperature: number;
    /** Working directory (repo root) */
    workingDir: string;
}
/**
 * A single file edit returned by the AI
 */
interface FileEdit {
    explanation: string;
    filePath: string;
    newContent: string;
    originalContent: string;
}
/**
 * Result of the AI fix attempt
 */
interface FixResult {
    analysis: string;
    edits: FileEdit[];
    error?: string;
    success: boolean;
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
declare function resolveFramePath(frame: StackFrame, workingDir: string): string | null;
/**
 * Revert applied edits (used when tests fail after applying a fix)
 */
declare function revertEdits(edits: FileEdit[], workingDir: string): Promise<void>;
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
declare function attemptAIFix(issue: ParsedSentryIssue, config: Partial<FixerConfig> & Pick<FixerConfig, "openaiApiKey" | "workingDir">): Promise<FixResult>;

export { type FileEdit, type FixResult, type FixerConfig, attemptAIFix, resolveFramePath, revertEdits };
