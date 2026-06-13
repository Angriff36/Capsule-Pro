import { SentryFixJobRecord } from './queue.js';
import { P as ParsedSentryIssue, J as JobExecutionResult } from './types-CZP2VeKg.js';
import 'zod';

/**
 * Job runner configuration
 */
interface JobRunnerConfig {
    /** AI model to use for fix generation (default: gpt-4o) */
    aiModel: string;
    /** Base branch for PRs */
    baseBranch: string;
    /** Blocked path patterns */
    blockedPatterns: RegExp[];
    /** GitHub token for API access */
    githubToken: string;
    /** OpenAI API key for AI-powered fix generation */
    openaiApiKey: string;
    /** GitHub repository name */
    repoName: string;
    /** GitHub repository owner */
    repoOwner: string;
    /** Whether to actually run tests (can be disabled for safety) */
    runTests: boolean;
    /** Test command to run */
    testCommand: string;
    /** Working directory for git operations */
    workingDir: string;
}
/**
 * Sentry Fix Job Runner
 *
 * Handles the execution of fix jobs:
 * 1. Create a git branch
 * 2. Analyze the error and attempt a fix
 * 3. Run tests
 * 4. Open a PR
 */
declare class SentryJobRunner {
    private readonly config;
    private lastAppliedEdits;
    constructor(config: Partial<JobRunnerConfig> & Pick<JobRunnerConfig, "repoOwner" | "repoName" | "githubToken" | "openaiApiKey">);
    /**
     * Execute a fix job
     */
    execute(job: SentryFixJobRecord, issue: ParsedSentryIssue): Promise<JobExecutionResult>;
    /**
     * Generate a branch name for the fix
     */
    private generateBranchName;
    /**
     * Create a new git branch
     */
    private createBranch;
    /**
     * Attempt to fix the issue using AI-powered analysis.
     *
     * Reads source files from the stack trace, sends them to GPT-4o
     * with the error context, gets back structured file edits,
     * and applies them to disk via search-and-replace.
     */
    private attemptFix;
    /**
     * Run the test suite
     */
    private runTests;
    /**
     * Commit changes and push to remote
     */
    private commitAndPush;
    /**
     * Generate a commit message
     */
    private generateCommitMessage;
    /**
     * Create a pull request using GitHub CLI
     */
    private createPullRequest;
    /**
     * Generate PR body with Sentry context
     */
    private generatePRBody;
    /**
     * Clean up a failed branch
     */
    private cleanupBranch;
}
/**
 * Create a job runner with configuration
 */
declare const createJobRunner: (config: Partial<JobRunnerConfig> & Pick<JobRunnerConfig, "repoOwner" | "repoName" | "githubToken" | "openaiApiKey">) => SentryJobRunner;

export { type JobRunnerConfig, SentryJobRunner, createJobRunner };
