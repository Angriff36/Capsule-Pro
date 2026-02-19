import { beforeEach, describe, expect, it } from "vitest";
import { InMemoryJobStore, SentryJobQueue } from "../src/queue";
import type { SentryIssueAlertPayload } from "../src/types";
import { isBlockedPath } from "../src/types";
import {
  isIssueAlertWebhook,
  parseSentryIssue,
  parseSentryWebhookPayload,
  verifySentrySignature,
} from "../src/webhook";

describe("Webhook Verification", () => {
  const secret = "test-secret-12345";

  it("should verify a valid signature", () => {
    const body = JSON.stringify({ test: "data" });
    // Create expected signature
    const crypto = require("node:crypto");
    const hmac = crypto.createHmac("sha256", secret);
    hmac.update(body, "utf8");
    const signature = hmac.digest("hex");

    expect(verifySentrySignature(body, signature, secret)).toBe(true);
  });

  it("should reject an invalid signature", () => {
    const body = JSON.stringify({ test: "data" });
    const invalidSignature = "invalid-signature";

    expect(verifySentrySignature(body, invalidSignature, secret)).toBe(false);
  });

  it("should reject when secret is missing", () => {
    const body = JSON.stringify({ test: "data" });

    expect(verifySentrySignature(body, "any-signature", "")).toBe(false);
  });

  it("should reject when signature is missing", () => {
    const body = JSON.stringify({ test: "data" });

    expect(verifySentrySignature(body, "", secret)).toBe(false);
  });
});

describe("Webhook Parsing", () => {
  it("should parse a valid issue alert payload", () => {
    const payload: SentryIssueAlertPayload = {
      action: "triggered",
      data: {
        event: {
          url: "https://sentry.io/api/0/projects/test-org/test-project/events/123/",
          web_url: "https://sentry.io/organizations/test-org/issues/456/",
          issue_url: "https://sentry.io/api/0/issues/456/",
          issue_id: "456",
          type: "error",
          message: "Test error message",
          title: "TypeError: Cannot read property 'x' of undefined",
          environment: "production",
          release: "1.0.0",
        },
        triggered_rule: "High Error Rate",
      },
    };

    const result = parseSentryWebhookPayload(payload);
    expect(result.action).toBe("triggered");
    expect(result.data.event.issue_id).toBe("456");
  });

  it("should throw on invalid payload", () => {
    const invalidPayload = { action: "invalid" };

    expect(() => parseSentryWebhookPayload(invalidPayload)).toThrow();
  });
});

describe("Issue Parsing", () => {
  it("should extract issue details from payload", () => {
    const payload: SentryIssueAlertPayload = {
      action: "triggered",
      data: {
        event: {
          url: "https://sentry.io/api/0/projects/test-org/test-project/events/123/",
          web_url: "https://sentry.io/organizations/test-org/issues/456/",
          issue_url: "https://sentry.io/api/0/issues/456/",
          issue_id: "456",
          event_id: "789",
          type: "error",
          message: "Test error message",
          title: "TypeError: Cannot read property 'x' of undefined",
          environment: "production",
          release: "1.0.0",
          exception: {
            values: [
              {
                type: "TypeError",
                value: "Cannot read property 'x' of undefined",
                stacktrace: {
                  frames: [
                    {
                      filename: "app.js",
                      function: "render",
                      lineno: 42,
                      colno: 10,
                    },
                    { filename: "utils.js", function: "process", lineno: 15 },
                  ],
                },
              },
            ],
          },
          tags: { browser: "Chrome", level: "error" },
        },
        triggered_rule: "High Error Rate",
      },
    };

    const issue = parseSentryIssue(payload);

    expect(issue.issueId).toBe("456");
    expect(issue.eventId).toBe("789");
    expect(issue.environment).toBe("production");
    expect(issue.release).toBe("1.0.0");
    expect(issue.title).toBe(
      "TypeError: Cannot read property 'x' of undefined"
    );
    expect(issue.exceptionType).toBe("TypeError");
    expect(issue.stackFrames).toHaveLength(2);
    // Stack frames are reversed for chronological order
    expect(issue.stackFrames?.[0].filename).toBe("utils.js");
    expect(issue.tags).toEqual({ browser: "Chrome", level: "error" });
  });
});

describe("Resource Type Check", () => {
  it("should identify issue alert webhooks", () => {
    expect(isIssueAlertWebhook("event_alert")).toBe(true);
  });

  it("should reject non-issue-alert webhooks", () => {
    expect(isIssueAlertWebhook("issue")).toBe(false);
    expect(isIssueAlertWebhook("event")).toBe(false);
    expect(isIssueAlertWebhook(null)).toBe(false);
  });
});

describe("Job Queue", () => {
  let store: InMemoryJobStore;
  let queue: SentryJobQueue;

  beforeEach(() => {
    store = new InMemoryJobStore();
    queue = new SentryJobQueue(store, {
      enabled: true,
      rateLimitMinutes: 60,
      dedupMinutes: 30,
      maxRetries: 3,
    });
  });

  const createTestPayload = (): SentryIssueAlertPayload => ({
    action: "triggered",
    data: {
      event: {
        url: "https://sentry.io/api/0/projects/test-org/test-project/events/123/",
        web_url: "https://sentry.io/organizations/test-org/issues/456/",
        issue_url: "https://sentry.io/api/0/issues/456/",
        issue_id: "456",
      },
      triggered_rule: "Test Rule",
    },
  });

  it("should enqueue a new job", async () => {
    const job = await queue.enqueue({
      sentryIssueId: "456",
      sentryEventId: "789",
      organizationSlug: "test-org",
      projectSlug: "test-project",
      environment: "production",
      release: "1.0.0",
      issueTitle: "Test Error",
      issueUrl: "https://sentry.io/api/0/issues/456/",
      payloadSnapshot: createTestPayload(),
    });

    expect(job.status).toBe("queued");
    expect(job.sentryIssueId).toBe("456");
  });

  it("should prevent duplicate jobs within dedup window", async () => {
    await queue.enqueue({
      sentryIssueId: "456",
      sentryEventId: "789",
      organizationSlug: "test-org",
      projectSlug: "test-project",
      environment: null,
      release: null,
      issueTitle: "Test Error",
      issueUrl: "https://sentry.io/api/0/issues/456/",
      payloadSnapshot: createTestPayload(),
    });

    // Try to enqueue again for same issue
    await expect(
      queue.enqueue({
        sentryIssueId: "456",
        sentryEventId: "790",
        organizationSlug: "test-org",
        projectSlug: "test-project",
        environment: null,
        release: null,
        issueTitle: "Test Error",
        issueUrl: "https://sentry.io/api/0/issues/456/",
        payloadSnapshot: createTestPayload(),
      })
    ).rejects.toThrow("Job already queued");
  });

  it("should mark job as running", async () => {
    const job = await queue.enqueue({
      sentryIssueId: "456",
      sentryEventId: "789",
      organizationSlug: "test-org",
      projectSlug: "test-project",
      environment: null,
      release: null,
      issueTitle: "Test Error",
      issueUrl: "https://sentry.io/api/0/issues/456/",
      payloadSnapshot: createTestPayload(),
    });

    const updated = await queue.startJob(job.id);
    expect(updated.status).toBe("running");
    expect(updated.startedAt).toBeTruthy();
  });

  it("should mark job as succeeded with PR info", async () => {
    const job = await queue.enqueue({
      sentryIssueId: "456",
      sentryEventId: "789",
      organizationSlug: "test-org",
      projectSlug: "test-project",
      environment: null,
      release: null,
      issueTitle: "Test Error",
      issueUrl: "https://sentry.io/api/0/issues/456/",
      payloadSnapshot: createTestPayload(),
    });

    const updated = await queue.completeJob(job.id, {
      branchName: "fix/sentry-456",
      prUrl: "https://github.com/owner/repo/pull/1",
      prNumber: 1,
    });

    expect(updated.status).toBe("succeeded");
    expect(updated.branchName).toBe("fix/sentry-456");
    expect(updated.prUrl).toBe("https://github.com/owner/repo/pull/1");
  });

  it("should retry failed jobs up to max retries", async () => {
    const job = await queue.enqueue({
      sentryIssueId: "456",
      sentryEventId: "789",
      organizationSlug: "test-org",
      projectSlug: "test-project",
      environment: null,
      release: null,
      issueTitle: "Test Error",
      issueUrl: "https://sentry.io/api/0/issues/456/",
      payloadSnapshot: createTestPayload(),
      maxRetries: 2,
    });

    // First failure - should retry
    const firstFail = await queue.failJob(job.id, "First error");
    expect(firstFail.status).toBe("queued");
    expect(firstFail.retryCount).toBe(1);

    // Second failure - should fail permanently
    const secondFail = await queue.failJob(firstFail.id, "Second error");
    expect(secondFail.status).toBe("failed");
    expect(secondFail.retryCount).toBe(2);
  });
});

describe("Blocked Path Detection", () => {
  it("should block migration paths", () => {
    expect(isBlockedPath("migrations/001_init.ts")).toBe(true);
    expect(isBlockedPath("packages/database/migrations/add_users.ts")).toBe(
      true
    );
  });

  it("should block auth paths", () => {
    expect(isBlockedPath("auth/login.ts")).toBe(true);
    expect(isBlockedPath("src/auth/middleware.ts")).toBe(true);
  });

  it("should block billing paths", () => {
    expect(isBlockedPath("billing/stripe.ts")).toBe(true);
    expect(isBlockedPath("packages/payments/billing/checkout.ts")).toBe(true);
  });

  it("should allow other paths", () => {
    expect(isBlockedPath("src/components/Button.tsx")).toBe(false);
    expect(isBlockedPath("packages/utils/format.ts")).toBe(false);
  });

  it("should support custom patterns", () => {
    const customPatterns = [/config\//i];
    expect(isBlockedPath("config/settings.ts", customPatterns)).toBe(true);
    expect(isBlockedPath("src/app.ts", customPatterns)).toBe(false);
  });
});

describe("Job Queue Disabled", () => {
  it("should reject jobs when disabled", async () => {
    const store = new InMemoryJobStore();
    const queue = new SentryJobQueue(store, {
      enabled: false,
      rateLimitMinutes: 60,
      dedupMinutes: 30,
      maxRetries: 3,
    });

    const payload: SentryIssueAlertPayload = {
      action: "triggered",
      data: {
        event: {
          url: "https://sentry.io/api/0/projects/test-org/test-project/events/123/",
          web_url: "https://sentry.io/organizations/test-org/issues/456/",
          issue_url: "https://sentry.io/api/0/issues/456/",
          issue_id: "456",
        },
        triggered_rule: "Test",
      },
    };

    await expect(
      queue.enqueue({
        sentryIssueId: "456",
        sentryEventId: null,
        organizationSlug: "test-org",
        projectSlug: "test-project",
        environment: null,
        release: null,
        issueTitle: "Test",
        issueUrl: "https://sentry.io/api/0/issues/456/",
        payloadSnapshot: payload,
      })
    ).rejects.toThrow("disabled");
  });
});
