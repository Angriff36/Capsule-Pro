/**
 * Environment keys for Sentry integration
 */
declare const keys: () => Readonly<{
    SENTRY_CLIENT_SECRET?: string | undefined;
    SLACK_BOT_TOKEN?: string | undefined;
    SLACK_WEBHOOK_URL?: string | undefined;
    SLACK_CHANNEL_ID?: string | undefined;
    GITHUB_TOKEN?: string | undefined;
    GITHUB_REPO_OWNER?: string | undefined;
    GITHUB_REPO_NAME?: string | undefined;
    OPENAI_API_KEY?: string | undefined;
    SENTRY_WEBHOOK_SECRET: string;
    SENTRY_FIXER_ENABLED: boolean;
    SENTRY_FIXER_MAX_RETRIES: number;
    SENTRY_FIXER_RATE_LIMIT_MINUTES: number;
    SENTRY_FIXER_DEDUP_MINUTES: number;
    SENTRY_FIXER_AI_MODEL: string;
    SENTRY_FIXER_MAX_EXECUTION_MS: number;
    SENTRY_FIXER_BLOCKED_PATHS: string;
}>;
type SentryEnv = ReturnType<typeof keys>;

export { type SentryEnv, keys };
