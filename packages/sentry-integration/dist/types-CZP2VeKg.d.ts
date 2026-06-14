import { z } from 'zod';

/**
 * Sentry Issue Alert webhook payload schema
 * Based on Sentry's internal integration webhook documentation
 */
declare const SentryIssueAlertSchema: z.ZodObject<{
    action: z.ZodLiteral<"triggered">;
    data: z.ZodObject<{
        event: z.ZodObject<{
            event_id: z.ZodOptional<z.ZodString>;
            url: z.ZodURL;
            web_url: z.ZodURL;
            issue_url: z.ZodURL;
            issue_id: z.ZodString;
            type: z.ZodOptional<z.ZodString>;
            message: z.ZodOptional<z.ZodString>;
            title: z.ZodOptional<z.ZodString>;
            culprit: z.ZodOptional<z.ZodString>;
            timestamp: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>;
            environment: z.ZodOptional<z.ZodString>;
            release: z.ZodOptional<z.ZodString>;
            project: z.ZodOptional<z.ZodNumber>;
            project_slug: z.ZodOptional<z.ZodString>;
            project_name: z.ZodOptional<z.ZodString>;
            exception: z.ZodOptional<z.ZodObject<{
                values: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    type: z.ZodOptional<z.ZodString>;
                    value: z.ZodOptional<z.ZodString>;
                    module: z.ZodOptional<z.ZodString>;
                    stacktrace: z.ZodOptional<z.ZodObject<{
                        frames: z.ZodOptional<z.ZodArray<z.ZodObject<{
                            filename: z.ZodOptional<z.ZodString>;
                            function: z.ZodOptional<z.ZodString>;
                            lineno: z.ZodOptional<z.ZodNumber>;
                            colno: z.ZodOptional<z.ZodNumber>;
                            abs_path: z.ZodOptional<z.ZodString>;
                        }, z.core.$strip>>>;
                    }, z.core.$strip>>;
                }, z.core.$strip>>>;
            }, z.core.$strip>>;
            context: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
            tags: z.ZodPreprocess<z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>>;
        }, z.core.$strip>;
        triggered_rule: z.ZodString;
        issue_alert: z.ZodOptional<z.ZodObject<{
            title: z.ZodString;
            settings: z.ZodPreprocess<z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
        }, z.core.$strip>>;
    }, z.core.$strip>;
    installation: z.ZodOptional<z.ZodObject<{
        uuid: z.ZodString;
    }, z.core.$strip>>;
    actor: z.ZodOptional<z.ZodObject<{
        type: z.ZodString;
        id: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
type SentryIssueAlertPayload = z.infer<typeof SentryIssueAlertSchema>;
/**
 * Parsed Sentry issue data for job processing
 */
interface ParsedSentryIssue {
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
interface StackFrame {
    absPath: string | null;
    column: number | null;
    filename: string | null;
    function: string | null;
    line: number | null;
}
/**
 * Job status enum - mirrors Prisma enum
 */
type SentryFixJobStatus = "queued" | "running" | "succeeded" | "failed" | "cancelled";
/**
 * Job creation input
 */
interface CreateSentryFixJobInput {
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
interface UpdateSentryFixJobInput {
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
interface JobExecutionResult {
    branchName?: string;
    error?: string;
    prNumber?: number;
    prUrl?: string;
    success: boolean;
}
/**
 * Blocked path patterns for safety
 */
declare const DEFAULT_BLOCKED_PATTERNS: RegExp[];
/**
 * Check if a file path is blocked from auto-fix
 */
declare const isBlockedPath: (filePath: string, blockedPatterns?: RegExp[]) => boolean;

export { type CreateSentryFixJobInput as C, DEFAULT_BLOCKED_PATTERNS as D, type JobExecutionResult as J, type ParsedSentryIssue as P, type SentryFixJobStatus as S, type UpdateSentryFixJobInput as U, type SentryIssueAlertPayload as a, SentryIssueAlertSchema as b, type StackFrame as c, isBlockedPath as i };
