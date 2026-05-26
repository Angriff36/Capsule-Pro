import {
  DEFAULT_BLOCKED_PATTERNS,
  isBlockedPath
} from "./chunk-A4GJ3AHQ.js";
import {
  attemptAIFix,
  revertEdits
} from "./chunk-RW5F3V3X.js";

// src/runner.ts
import { exec } from "child_process";
import { promisify } from "util";
import * as Sentry from "@repo/observability/sentry";
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
  async execute(job, issue) {
    return Sentry.startSpan(
      {
        name: "sentry-fixer.execute",
        op: "fixer.execute",
        attributes: {
          "fixer.job_id": job.id,
          "fixer.retry_count": job.retryCount,
          "fixer.issue_id": issue.issueId,
          "fixer.environment": issue.environment ?? "unknown",
          "fixer.org": issue.organizationSlug,
          "fixer.project": issue.projectSlug,
          "fixer.exception_type": issue.exceptionType ?? "unknown"
        }
      },
      async (parentSpan) => {
        Sentry.setTag("fixer.issue_id", issue.issueId);
        Sentry.setTag("fixer.org", issue.organizationSlug);
        const captureFailure = (error, where) => {
          Sentry.captureException(error, {
            tags: {
              component: "sentry-fixer",
              "fixer.failure_stage": where,
              "fixer.issue_id": issue.issueId
            },
            contexts: {
              fixer: {
                jobId: job.id,
                retryCount: job.retryCount,
                issueId: issue.issueId,
                organizationSlug: issue.organizationSlug,
                projectSlug: issue.projectSlug,
                environment: issue.environment,
                release: issue.release,
                exceptionType: issue.exceptionType,
                exceptionValue: issue.exceptionValue,
                issueUrl: issue.issueUrl
              }
            }
          });
        };
        try {
          const branchName = this.generateBranchName(issue);
          await Sentry.startSpan(
            {
              name: "git.create-branch",
              op: "git.branch",
              attributes: { "git.branch": branchName }
            },
            () => this.createBranch(branchName)
          );
          const stackFiles = (issue.stackFrames ?? []).map((f) => f.filename ?? f.absPath ?? "").filter(Boolean);
          const blockedFiles = stackFiles.filter(
            (f) => isBlockedPath(f, this.config.blockedPatterns)
          );
          if (blockedFiles.length > 0) {
            Sentry.addBreadcrumb({
              category: "fixer",
              message: `Blocked by path patterns: ${blockedFiles.join(", ")}`,
              level: "warning"
            });
            parentSpan.setAttribute("fixer.outcome", "blocked");
            await this.cleanupBranch(branchName);
            return {
              success: false,
              error: `Cannot auto-fix blocked paths: ${blockedFiles.join(", ")}`
            };
          }
          const fixResult = await Sentry.startSpan(
            {
              name: "fixer.ai-fix",
              op: "ai.attempt-fix",
              attributes: { "ai.model": this.config.aiModel }
            },
            () => this.attemptFix(issue)
          );
          if (!fixResult.success) {
            Sentry.addBreadcrumb({
              category: "fixer",
              message: `AI fix failed: ${fixResult.error}`,
              level: "warning"
            });
            parentSpan.setAttribute("fixer.outcome", "ai_failed");
            await this.cleanupBranch(branchName);
            return {
              success: false,
              error: fixResult.error ?? "Failed to generate fix"
            };
          }
          if (this.config.runTests) {
            const testResult = await Sentry.startSpan(
              {
                name: "fixer.run-tests",
                op: "test",
                attributes: { "test.command": this.config.testCommand }
              },
              () => this.runTests()
            );
            if (!testResult.success) {
              Sentry.addBreadcrumb({
                category: "fixer",
                message: `Tests failed after fix: ${testResult.error}`,
                level: "warning"
              });
              parentSpan.setAttribute("fixer.outcome", "tests_failed");
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
          await Sentry.startSpan(
            { name: "git.commit-push", op: "git.push" },
            () => this.commitAndPush(branchName, issue)
          );
          const prResult = await Sentry.startSpan(
            { name: "github.create-pr", op: "github.pr" },
            () => this.createPullRequest(branchName, issue)
          );
          parentSpan.setAttribute("fixer.outcome", "succeeded");
          parentSpan.setAttribute("fixer.pr_number", prResult.number);
          Sentry.addBreadcrumb({
            category: "fixer",
            message: `Created PR #${prResult.number}: ${prResult.url}`,
            level: "info"
          });
          return {
            success: true,
            branchName,
            prUrl: prResult.url,
            prNumber: prResult.number
          };
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown error";
          parentSpan.setAttribute("fixer.outcome", "error");
          captureFailure(error, "execute");
          return {
            success: false,
            error: message
          };
        }
      }
    );
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
//# sourceMappingURL=chunk-HA4EV7R7.js.map