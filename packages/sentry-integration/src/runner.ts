import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

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
}

const DEFAULT_CONFIG: Partial<JobRunnerConfig> = {
  baseBranch: "main",
  workingDir: process.cwd(),
  blockedPatterns: DEFAULT_BLOCKED_PATTERNS,
  testCommand: "pnpm test",
  runTests: true,
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

  constructor(
    config: Partial<JobRunnerConfig> &
      Pick<JobRunnerConfig, "repoOwner" | "repoName" | "githubToken">
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

      // Step 2: Check if any files are blocked
      const blockedFiles = gitResult.filesChanged.filter((f) =>
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

      // Step 4: Run tests
      if (this.config.runTests) {
        const testResult = await this.runTests();
        if (!testResult.success) {
          await this.cleanupBranch(branchName);
          return {
            success: false,
            error: `Tests failed: ${testResult.error}`,
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
   * Attempt to fix the issue using the agent framework
   * This is a placeholder that should be integrated with the actual agent
   */
  private async attemptFix(
    issue: ParsedSentryIssue
  ): Promise<{ success: boolean; error?: string }> {
    // TODO: Integrate with actual agent framework
    // For now, this is a placeholder that would:
    // 1. Analyze the stack trace
    // 2. Identify the root cause
    // 3. Generate a fix using the AI agent
    // 4. Apply the fix to the relevant files

    // Placeholder implementation
    // In production, this would call the agent framework
    console.log("[SentryJobRunner] Attempting fix for:", issue.title);
    console.log(
      "[SentryJobRunner] Exception:",
      issue.exceptionType,
      issue.exceptionValue
    );
    console.log(
      "[SentryJobRunner] Stack frames:",
      issue.stackFrames?.slice(0, 3)
    );

    // For now, return success to allow the pipeline to continue
    // In production, this would return the actual result from the agent
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
    Pick<JobRunnerConfig, "repoOwner" | "repoName" | "githubToken">
): SentryJobRunner => {
  return new SentryJobRunner(config);
};
