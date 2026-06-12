import { z } from "zod";

/**
 * Sentry docs show `tags` as either a map or a list of [key, value] pairs.
 * @see https://docs.sentry.io/product/integrations/integration-platform/webhooks/issue-alerts/
 */
const normalizeSentryEventTags = (
  val: unknown
): Record<string, string> | undefined => {
  if (val === null || val === undefined) {
    return;
  }
  if (Array.isArray(val)) {
    const out: Record<string, string> = {};
    for (const pair of val) {
      if (
        Array.isArray(pair) &&
        pair.length >= 2 &&
        typeof pair[0] === "string"
      ) {
        out[pair[0]] = String(pair[1]);
      }
    }
    return out;
  }
  if (typeof val === "object") {
    const entries = Object.entries(val as Record<string, unknown>);
    const out: Record<string, string> = {};
    for (const [k, v] of entries) {
      out[k] = typeof v === "string" ? v : String(v);
    }
    return out;
  }
  return;
};

const sentryEventTagsSchema = z.preprocess(
  normalizeSentryEventTags,
  z.record(z.string(), z.string()).optional()
);

/**
 * Documented sample uses `settings` as an array of { name, value }.
 * @see https://docs.sentry.io/product/integrations/integration-platform/webhooks/issue-alerts/
 */
const normalizeIssueAlertSettings = (
  val: unknown
): Record<string, unknown> | undefined => {
  if (val === null || val === undefined) {
    return;
  }
  if (Array.isArray(val)) {
    const out: Record<string, unknown> = {};
    for (const item of val) {
      if (
        item &&
        typeof item === "object" &&
        "name" in item &&
        "value" in item
      ) {
        const row = item as { name: string; value: unknown };
        out[row.name] = row.value;
      }
    }
    return out;
  }
  if (typeof val === "object") {
    return val as Record<string, unknown>;
  }
  return;
};

const issueAlertSettingsSchema = z.preprocess(
  normalizeIssueAlertSettings,
  z.record(z.string(), z.unknown()).optional()
);

/**
 * Sentry Issue Alert webhook payload schema
 * Based on Sentry's internal integration webhook documentation
 */
export const SentryIssueAlertSchema = z.object({
  action: z.literal("triggered"),
  data: z.object({
    event: z.object({
      event_id: z.string().optional(),
      url: z.url(),
      web_url: z.url(),
      issue_url: z.url(),
      issue_id: z.string(),
      type: z.string().optional(),
      message: z.string().optional(),
      title: z.string().optional(),
      culprit: z.string().optional(),
      timestamp: z.union([z.string(), z.number()]).optional(),
      environment: z.string().optional(),
      release: z.string().optional(),
      project: z.number().optional(),
      project_slug: z.string().optional(),
      project_name: z.string().optional(),
      exception: z
        .object({
          values: z
            .array(
              z.object({
                type: z.string().optional(),
                value: z.string().optional(),
                module: z.string().optional(),
                stacktrace: z
                  .object({
                    frames: z
                      .array(
                        z.object({
                          filename: z.string().optional(),
                          function: z.string().optional(),
                          lineno: z.number().optional(),
                          colno: z.number().optional(),
                          abs_path: z.string().optional(),
                        })
                      )
                      .optional(),
                  })
                  .optional(),
              })
            )
            .optional(),
        })
        .optional(),
      context: z.record(z.string(), z.unknown()).optional(),
      tags: sentryEventTagsSchema,
    }),
    triggered_rule: z.string(),
    issue_alert: z
      .object({
        title: z.string(),
        settings: issueAlertSettingsSchema,
      })
      .optional(),
  }),
  installation: z
    .object({
      uuid: z.string(),
    })
    .optional(),
  actor: z
    .object({
      type: z.string(),
      id: z.string().optional(),
      name: z.string().optional(),
    })
    .optional(),
});

export type SentryIssueAlertPayload = z.infer<typeof SentryIssueAlertSchema>;

/**
 * Parsed Sentry issue data for job processing
 */
export interface ParsedSentryIssue {
  culprit: string | null;
  environment: string | null;
  eventId: string | null;
  exceptionType: string | null;
  exceptionValue: string | null;
  issueId: string;
  issueUrl: string;
  message: string | null;
  organizationSlug: string;
  projectSlug: string;
  rawPayload: SentryIssueAlertPayload;
  release: string | null;
  stackFrames: StackFrame[] | null;
  tags: Record<string, string>;
  title: string;
  webUrl: string;
}

export interface StackFrame {
  absPath: string | null;
  column: number | null;
  filename: string | null;
  function: string | null;
  line: number | null;
}

/**
 * Job status enum - mirrors Prisma enum
 */
export type SentryFixJobStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "cancelled";

/**
 * Job creation input
 */
export interface CreateSentryFixJobInput {
  environment: string | null;
  issueTitle: string;
  issueUrl: string;
  maxRetries?: number;
  organizationSlug: string;
  payloadSnapshot: SentryIssueAlertPayload;
  projectSlug: string;
  release: string | null;
  sentryEventId: string | null;
  sentryIssueId: string;
}

/**
 * Job update input
 */
export interface UpdateSentryFixJobInput {
  branchName?: string;
  completedAt?: Date;
  errorMessage?: string;
  prNumber?: number;
  prUrl?: string;
  retryCount?: number;
  startedAt?: Date;
  status?: SentryFixJobStatus;
}

/**
 * Job execution result
 */
export interface JobExecutionResult {
  branchName?: string;
  error?: string;
  prNumber?: number;
  prUrl?: string;
  success: boolean;
}

/**
 * Blocked path patterns for safety
 */
export const DEFAULT_BLOCKED_PATTERNS = [
  /migrations?\//i,
  /\/migrations?\//i,
  /auth\//i,
  /\/auth\//i,
  /authentication\//i,
  /billing\//i,
  /\/billing\//i,
  /payment\//i,
  /\/payment\//i,
  /stripe\//i,
  /\/stripe\//i,
  /\.env/i,
  /secrets?\//i,
  /\/secrets?\//i,
  /credentials?\//i,
  /\/credentials?\//i,
];

/**
 * Check if a file path is blocked from auto-fix
 */
export const isBlockedPath = (
  filePath: string,
  blockedPatterns: RegExp[] = DEFAULT_BLOCKED_PATTERNS
): boolean => blockedPatterns.some((pattern) => pattern.test(filePath));
