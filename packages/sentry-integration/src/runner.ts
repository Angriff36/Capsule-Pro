import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

import { attemptAIFix, type FileEdit, revertEdits } from "./fixer.js";
import type { SentryFixJobRecord } from "./queue.js";
import type { JobExecutionResult, ParsedSentryIssue } from "./types.js";
import { DEFAULT_BLOCKED_PATTERNS, isBlockedPath } from "./types.js";

// Regex for parsing PR URL from gh CLI output
const PR_URL_REGEX = /(https:\/\/github\.com\/[^/]+\/[^/]+\/pull\/(\d+))/;

/**
 * Job runner configuration
 */
export interface JobRunnerConfig {
  /** GitHub repository owner */
  repoOwner: string;
  /** GitHub repository name */
  repoName: string;
  /** GitHub token for API access */
  githubToken: string;
  /** OpenAI API key for AI-powered fix generation */
  openaiApiKey: string;
  /** Base branch for PRs */
  baseBranch: string;
  /** Working directory for git operations */
  workingDir: string;
  /** Blocked path patterns */
  blockedPatterns: RegExp[];
  /** Test command to run */
  testCommand: string;
  /** Whether to actually run tests (can be disabled for safety) */
  runTests: boolean;
  /** AI model to use for fix generation (default: gpt-4o) */
  aiModel: string;
}

const DEFAULT_CONFIG: Partial<JobRunnerConfig> = {
  baseBranch: "main",
  workingDir: process.cwd(),
  blockedPatterns: DEFAULT_BLOCKED_PATTERNS,
  testCommand: "pnpm test",
  runTests: true,
  aiModel: "gpt-4o",
};

/**
 * Result of git operations
 */
interface GitResult {
  branchName: string;
  filesChanged: string[];
}

/**
 * Result of PR creation
 */
interface PRResult {
  url: string;
  number: number;
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
export class SentryJobRunner {
  private readonly config: JobRunnerConfig;
  private lastAppliedEdits: FileEdit[] = [];

  constructor(
    config: Partial<JobRunnerConfig> &
      Pick<
        JobRunnerConfig,
        "repoOwner" | "repoName" | "githubToken" | "openaiApiKey"
      >
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config } as JobRunnerConfig;
  }

  /**
   * Execute a fix job
   */
  async execute(
    _job: SentryFixJobRecord,
    issue: ParsedSentryIssue
  ): Promise<JobExecutionResult> {
    try {
      // Step 1: Create a branch
      const branchName = this.generateBranchName(issue);
      const gitResult = await this.createBranch(branchName);

      // Step 2: Check if any stack trace files are in blocked paths
      const stackFiles = (issue.stackFrames ?? [])
        .map((f) => f.filename ?? f.absPath ?? "")
        .filter(Boolean);
      const blockedFiles = stackFiles.filter((f) =>
        isBlockedPath(f, this.config.blockedPatterns)
      );
      if (blockedFiles.length > 0) {
        await this.cleanupBranch(branchName);
        return {
          success: false,
          error: `Cannot auto-fix blocked paths: ${blockedFiles.join(", ")}`,
        };
      }

      // Step 3: Attempt to fix the issue
      const fixResult = await this.attemptFix(issue);
      if (!fixResult.success) {
        await this.cleanupBranch(branchName);
        return {
          success: false,
          error: fixResult.error ?? "Failed to generate fix",
        };
      }

      // Step 4: Run tests — revert AI edits if they break things
      if (this.config.runTests) {
        const testResult = await this.runTests();
        if (!testResult.success) {
          // Revert the AI's edits before cleaning up the branch
          if (this.lastAppliedEdits.length > 0) {
            await revertEdits(this.lastAppliedEdits, this.config.workingDir);
            this.lastAppliedEdits = [];
          }
          await this.cleanupBranch(branchName);
          return {
            success: false,
            error: `Tests failed after applying fix: ${testResult.error}`,
          };
        }
      }

      // Step 5: Commit and push
      await this.commitAndPush(branchName, issue);

      // Step 6: Create PR
      const prResult = await this.createPullRequest(branchName, issue);

      return {
        success: true,
        branchName,
        prUrl: prResult.url,
        prNumber: prResult.number,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return {
        success: false,
        error: message,
      };
    }
  }

  /**
   * Generate a branch name for the fix
   */
  private generateBranchName(issue: ParsedSentryIssue): string {
    const sanitizedTitle = issue.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 50);
    const timestamp = Date.now();
    return `fix/sentry-${issue.issueId.slice(0, 8)}-${sanitizedTitle}-${timestamp}`;
  }

  /**
   * Create a new git branch
   */
  private async createBranch(branchName: string): Promise<GitResult> {
    // Fetch latest
    await execAsync(`git fetch origin ${this.config.baseBranch}`, {
      cwd: this.config.workingDir,
    });

    // Create and checkout branch
    await execAsync(
      `git checkout -b ${branchName} origin/${this.config.baseBranch}`,
      { cwd: this.config.workingDir }
    );

    // Get list of files that would change
    const { stdout } = await execAsync("git diff --name-only HEAD", {
      cwd: this.config.workingDir,
    });
    const filesChanged = stdout
      .split("\n")
      .map((f) => f.trim())
      .filter(Boolean);

    return { branchName, filesChanged };
  }

  /**
   * Attempt to fix the issue using AI-powered analysis.
   *
   * Reads source files from the stack trace, sends them to GPT-4o
   * with the error context, gets back structured file edits,
   * and applies them to disk via search-and-replace.
   */
  private async attemptFix(
    issue: ParsedSentryIssue
  ): Promise<{ success: boolean; error?: string }> {
    const result = await attemptAIFix(issue, {
      openaiApiKey: this.config.openaiApiKey,
      workingDir: this.config.workingDir,
      model: this.config.aiModel,
    });

    if (!result.success) {
      return {
        success: false,
        error: result.error ?? `AI analysis: ${result.analysis}`,
      };
    }

    // Store edits on the instance so we can revert if tests fail
    this.lastAppliedEdits = result.edits;

    return { success: true };
  }

  /**
   * Run the test suite
   */
  private async runTests(): Promise<{ success: boolean; error?: string }> {
    try {
      await execAsync(this.config.testCommand, {
        cwd: this.config.workingDir,
        timeout: 300_000, // 5 minutes
      });
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Tests failed";
      return { success: false, error: message };
    }
  }

  /**
   * Commit changes and push to remote
   */
  private async commitAndPush(
    branchName: string,
    issue: ParsedSentryIssue
  ): Promise<void> {
    // Stage all changes
    await execAsync("git add -A", { cwd: this.config.workingDir });

    // Create commit with conventional commit format
    const commitMessage = this.generateCommitMessage(issue);
    await execAsync(`git commit -m "${commitMessage}"`, {
      cwd: this.config.workingDir,
    });

    // Push to remote
    await execAsync(`git push -u origin ${branchName}`, {
      cwd: this.config.workingDir,
    });
  }

  /**
   * Generate a commit message
   */
  private generateCommitMessage(issue: ParsedSentryIssue): string {
    const lines = [
      `fix: resolve Sentry issue ${issue.issueId}`,
      "",
      `Fixes: ${issue.issueUrl}`,
      "",
      `Error: ${issue.exceptionType ?? "Unknown"}`,
      issue.exceptionValue ? `Message: ${issue.exceptionValue}` : "",
      "",
      "This is an automated fix generated by the Sentry-to-PR pipeline.",
      "Please review carefully before merging.",
    ];
    return lines.filter(Boolean).join("\\n");
  }

  /**
   * Create a pull request using GitHub CLI
   */
  private async createPullRequest(
    branchName: string,
    issue: ParsedSentryIssue
  ): Promise<PRResult> {
    const title = `fix: Resolve Sentry issue - ${issue.title}`;
    const body = this.generatePRBody(issue);

    const { stdout } = await execAsync(
      `gh pr create --base ${this.config.baseBranch} --head ${branchName} --title "${title}" --body "${body}"`,
      {
        cwd: this.config.workingDir,
        env: {
          ...process.env,
          GH_TOKEN: this.config.githubToken,
        },
      }
    );

    // Parse PR URL and number from output
    // Output format: https://github.com/owner/repo/pull/123
    const urlMatch = stdout.match(PR_URL_REGEX);
    if (!urlMatch) {
      throw new Error(`Failed to parse PR URL from output: ${stdout}`);
    }

    return {
      url: urlMatch[1],
      number: Number.parseInt(urlMatch[2], 10),
    };
  }

  /**
   * Generate PR body with Sentry context
   */
  private generatePRBody(issue: ParsedSentryIssue): string {
    const sections = [
      "## Summary",
      "",
      "This PR was automatically generated to fix a Sentry issue.",
      "",
      "## Sentry Issue",
      "",
      `- **Issue**: [${issue.issueId}](${issue.webUrl})`,
      `- **Title**: ${issue.title}`,
      `- **Environment**: ${issue.environment ?? "Unknown"}`,
      `- **Release**: ${issue.release ?? "Unknown"}`,
      "",
      "## Error Details",
      "",
      `**Type**: ${issue.exceptionType ?? "Unknown"}`,
      "",
      issue.exceptionValue ? `**Message**: ${issue.exceptionValue}` : "",
      "",
      issue.stackFrames && issue.stackFrames.length > 0
        ? [
            "## Stack Trace",
            "",
            "```",
            ...issue.stackFrames.slice(0, 10).map((frame) => {
              const location = frame.filename ?? "unknown";
              const line = frame.line ? `:${frame.line}` : "";
              const col = frame.column ? `:${frame.column}` : "";
              const fn = frame.function ? ` at ${frame.function}` : "";
              return `  ${location}${line}${col}${fn}`;
            }),
            "```",
            "",
          ].join("\\n")
        : "",
      "",
      "## ⚠️ Review Required",
      "",
      "This is an automated fix. **Please review carefully before merging.**",
      "",
      "- Verify the fix addresses the root cause",
      "- Ensure no unintended side effects",
      "- Run additional tests if needed",
      "- **Never auto-merge this PR**",
      "",
      "---",
      "",
      "Generated by Sentry-to-PR Pipeline",
    ];

    return sections.filter(Boolean).join("\\n");
  }

  /**
   * Clean up a failed branch
   */
  private async cleanupBranch(branchName: string): Promise<void> {
    try {
      // Switch back to base branch
      await execAsync(`git checkout ${this.config.baseBranch}`, {
        cwd: this.config.workingDir,
      });

      // Delete the local branch
      await execAsync(`git branch -D ${branchName}`, {
        cwd: this.config.workingDir,
      });
    } catch {
      // Ignore cleanup errors
    }
  }
}

/**
 * Create a job runner with configuration
 */
export const createJobRunner = (
  config: Partial<JobRunnerConfig> &
    Pick<
      JobRunnerConfig,
      "repoOwner" | "repoName" | "githubToken" | "openaiApiKey"
    >
): SentryJobRunner => {
  return new SentryJobRunner(config);
};
