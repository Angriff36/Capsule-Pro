import {
  DEFAULT_BLOCKED_PATTERNS,
  isBlockedPath
} from "./chunk-USCRR4S4.js";
import {
  attemptAIFix,
  revertEdits
} from "./chunk-RW5F3V3X.js";

// src/runner.ts
import { exec } from "child_process";
import { promisify } from "util";
var execAsync = promisify(exec);
var PR_URL_REGEX = /(https:\/\/github\.com\/[^/]+\/[^/]+\/pull\/(\d+))/;
var DEFAULT_CONFIG = {
  baseBranch: "main",
  workingDir: process.cwd(),
  blockedPatterns: DEFAULT_BLOCKED_PATTERNS,
  testCommand: "pnpm test",
  runTests: true,
  aiModel: "gpt-4o"
};
var SentryJobRunner = class {
  config;
  lastAppliedEdits = [];
  constructor(config) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }
  /**
   * Execute a fix job
   */
  async execute(_job, issue) {
    try {
      const branchName = this.generateBranchName(issue);
      const _gitResult = await this.createBranch(branchName);
      const stackFiles = (issue.stackFrames ?? []).map((f) => f.filename ?? f.absPath ?? "").filter(Boolean);
      const blockedFiles = stackFiles.filter(
        (f) => isBlockedPath(f, this.config.blockedPatterns)
      );
      if (blockedFiles.length > 0) {
        await this.cleanupBranch(branchName);
        return {
          success: false,
          error: `Cannot auto-fix blocked paths: ${blockedFiles.join(", ")}`
        };
      }
      const fixResult = await this.attemptFix(issue);
      if (!fixResult.success) {
        await this.cleanupBranch(branchName);
        return {
          success: false,
          error: fixResult.error ?? "Failed to generate fix"
        };
      }
      if (this.config.runTests) {
        const testResult = await this.runTests();
        if (!testResult.success) {
          if (this.lastAppliedEdits.length > 0) {
            await revertEdits(this.lastAppliedEdits, this.config.workingDir);
            this.lastAppliedEdits = [];
          }
          await this.cleanupBranch(branchName);
          return {
            success: false,
            error: `Tests failed after applying fix: ${testResult.error}`
          };
        }
      }
      await this.commitAndPush(branchName, issue);
      const prResult = await this.createPullRequest(branchName, issue);
      return {
        success: true,
        branchName,
        prUrl: prResult.url,
        prNumber: prResult.number
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return {
        success: false,
        error: message
      };
    }
  }
  /**
   * Generate a branch name for the fix
   */
  generateBranchName(issue) {
    const sanitizedTitle = issue.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50);
    const timestamp = Date.now();
    return `fix/sentry-${issue.issueId.slice(0, 8)}-${sanitizedTitle}-${timestamp}`;
  }
  /**
   * Create a new git branch
   */
  async createBranch(branchName) {
    await execAsync(`git fetch origin ${this.config.baseBranch}`, {
      cwd: this.config.workingDir
    });
    await execAsync(
      `git checkout -b ${branchName} origin/${this.config.baseBranch}`,
      { cwd: this.config.workingDir }
    );
    const { stdout } = await execAsync("git diff --name-only HEAD", {
      cwd: this.config.workingDir
    });
    const filesChanged = stdout.split("\n").map((f) => f.trim()).filter(Boolean);
    return { branchName, filesChanged };
  }
  /**
   * Attempt to fix the issue using AI-powered analysis.
   *
   * Reads source files from the stack trace, sends them to GPT-4o
   * with the error context, gets back structured file edits,
   * and applies them to disk via search-and-replace.
   */
  async attemptFix(issue) {
    const result = await attemptAIFix(issue, {
      openaiApiKey: this.config.openaiApiKey,
      workingDir: this.config.workingDir,
      model: this.config.aiModel
    });
    if (!result.success) {
      return {
        success: false,
        error: result.error ?? `AI analysis: ${result.analysis}`
      };
    }
    this.lastAppliedEdits = result.edits;
    return { success: true };
  }
  /**
   * Run the test suite
   */
  async runTests() {
    try {
      await execAsync(this.config.testCommand, {
        cwd: this.config.workingDir,
        timeout: 3e5
        // 5 minutes
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
  async commitAndPush(branchName, issue) {
    await execAsync("git add -A", { cwd: this.config.workingDir });
    const commitMessage = this.generateCommitMessage(issue);
    await execAsync(`git commit -m "${commitMessage}"`, {
      cwd: this.config.workingDir
    });
    await execAsync(`git push -u origin ${branchName}`, {
      cwd: this.config.workingDir
    });
  }
  /**
   * Generate a commit message
   */
  generateCommitMessage(issue) {
    const lines = [
      `fix: resolve Sentry issue ${issue.issueId}`,
      "",
      `Fixes: ${issue.issueUrl}`,
      "",
      `Error: ${issue.exceptionType ?? "Unknown"}`,
      issue.exceptionValue ? `Message: ${issue.exceptionValue}` : "",
      "",
      "This is an automated fix generated by the Sentry-to-PR pipeline.",
      "Please review carefully before merging."
    ];
    return lines.filter(Boolean).join("\\n");
  }
  /**
   * Create a pull request using GitHub CLI
   */
  async createPullRequest(branchName, issue) {
    const title = `fix: Resolve Sentry issue - ${issue.title}`;
    const body = this.generatePRBody(issue);
    const { stdout } = await execAsync(
      `gh pr create --base ${this.config.baseBranch} --head ${branchName} --title "${title}" --body "${body}"`,
      {
        cwd: this.config.workingDir,
        env: {
          ...process.env,
          GH_TOKEN: this.config.githubToken
        }
      }
    );
    const urlMatch = stdout.match(PR_URL_REGEX);
    if (!urlMatch) {
      throw new Error(`Failed to parse PR URL from output: ${stdout}`);
    }
    return {
      url: urlMatch[1],
      number: Number.parseInt(urlMatch[2], 10)
    };
  }
  /**
   * Generate PR body with Sentry context
   */
  generatePRBody(issue) {
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
      issue.stackFrames && issue.stackFrames.length > 0 ? [
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
        ""
      ].join("\\n") : "",
      "",
      "## \u26A0\uFE0F Review Required",
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
      "Generated by Sentry-to-PR Pipeline"
    ];
    return sections.filter(Boolean).join("\\n");
  }
  /**
   * Clean up a failed branch
   */
  async cleanupBranch(branchName) {
    try {
      await execAsync(`git checkout ${this.config.baseBranch}`, {
        cwd: this.config.workingDir
      });
      await execAsync(`git branch -D ${branchName}`, {
        cwd: this.config.workingDir
      });
    } catch {
    }
  }
};
var createJobRunner = (config) => {
  return new SentryJobRunner(config);
};

export {
  SentryJobRunner,
  createJobRunner
};
//# sourceMappingURL=chunk-WTMROXRC.js.map