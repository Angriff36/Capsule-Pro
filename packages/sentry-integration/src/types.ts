import { z } from "zod";

/**
 * Sentry Issue Alert webhook payload schema
 * Based on Sentry's internal integration webhook documentation
 */
export const SentryIssueAlertSchema = z.object({
  action: z.literal("triggered"),
  data: z.object({
    event: z.object({
      event_id: z.string().optional(),
      url: z.string().url(),
      web_url: z.string().url(),
      issue_url: z.string().url(),
      issue_id: z.string(),
      type: z.string().optional(),
      message: z.string().optional(),
      title: z.string().optional(),
      culprit: z.string().optional(),
      timestamp: z.string().optional(),
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
      tags: z.record(z.string(), z.string()).optional(),
    }),
    triggered_rule: z.string(),
    issue_alert: z
      .object({
        title: z.string(),
        settings: z.record(z.string(), z.unknown()).optional(),
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
  issueId: string;
  eventId: string | null;
  organizationSlug: string;
  projectSlug: string;
  environment: string | null;
  release: string | null;
  title: string;
  message: string | null;
  culprit: string | null;
  issueUrl: string;
  webUrl: string;
  exceptionType: string | null;
  exceptionValue: string | null;
  stackFrames: StackFrame[] | null;
  tags: Record<string, string>;
  rawPayload: SentryIssueAlertPayload;
}

export interface StackFrame {
  filename: string | null;
  function: string | null;
  line: number | null;
  column: number | null;
  absPath: string | null;
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
  sentryIssueId: string;
  sentryEventId: string | null;
  organizationSlug: string;
  projectSlug: string;
  environment: string | null;
  release: string | null;
  issueTitle: string;
  issueUrl: string;
  payloadSnapshot: SentryIssueAlertPayload;
  maxRetries?: number;
}

/**
 * Job update input
 */
export interface UpdateSentryFixJobInput {
  status?: SentryFixJobStatus;
  branchName?: string;
  prUrl?: string;
  prNumber?: number;
  errorMessage?: string;
  retryCount?: number;
  startedAt?: Date;
  completedAt?: Date;
}

/**
 * Job execution result
 */
export interface JobExecutionResult {
  success: boolean;
  branchName?: string;
  prUrl?: string;
  prNumber?: number;
  error?: string;
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
): boolean => {
  return blockedPatterns.some((pattern) => pattern.test(filePath));
};
