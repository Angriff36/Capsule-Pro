import { z } from "zod";
/**
 * Sentry Issue Alert webhook payload schema
 * Based on Sentry's internal integration webhook documentation
 */
export declare const SentryIssueAlertSchema: z.ZodObject<{
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
            tags: z.ZodPipe<z.ZodTransform<Record<string, string> | undefined, unknown>, z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>>;
        }, z.core.$strip>;
        triggered_rule: z.ZodString;
        issue_alert: z.ZodOptional<z.ZodObject<{
            title: z.ZodString;
            settings: z.ZodPipe<z.ZodTransform<Record<string, unknown> | undefined, unknown>, z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
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
export type SentryFixJobStatus = "queued" | "running" | "succeeded" | "failed" | "cancelled";
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
export declare const DEFAULT_BLOCKED_PATTERNS: RegExp[];
/**
 * Check if a file path is blocked from auto-fix
 */
export declare const isBlockedPath: (filePath: string, blockedPatterns?: RegExp[]) => boolean;
//# sourceMappingURL=types.d.ts.map