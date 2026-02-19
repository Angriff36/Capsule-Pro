# Sentry-to-PR Auto-Fixer Pipeline

An automated pipeline that receives Sentry Issue Alert webhooks, analyzes errors, creates fixes, and opens Pull Requests with human review required.

## Overview

This pipeline automates the following workflow:

1. **Receive Webhook**: Accepts Sentry Issue Alert webhooks with signature verification
2. **Enqueue Job**: Creates a job record with deduplication and rate limiting
3. **Create Branch**: Creates a git branch for the fix
4. **Analyze & Fix**: Analyzes the error and attempts to generate a fix
5. **Run Tests**: Executes the test suite to validate the fix
6. **Open PR**: Creates a Pull Request with Sentry context
7. **Notify Slack**: Sends a notification with the PR link

## Guardrails

- **Never auto-merge**: All PRs require human review and approval
- **Rate limiting**: Prevents multiple jobs for the same issue within a configurable window
- **Deduplication**: Skips repeated alerts for the same issue within a time window
- **Blocked paths**: Hard-blocks auto-fix on sensitive files:
  - Database migrations (`migrations/`)
  - Authentication (`auth/`, `authentication/`)
  - Billing and payments (`billing/`, `payment/`, `stripe/`)
  - Secrets and credentials (`secrets/`, `credentials/`, `.env`)
- **Full file rewrites**: No patch snippets - entire files are rewritten per repo conventions

## Setup

### 1. Create Sentry Internal Integration

1. Go to **Settings > Integrations > Internal Integrations** in Sentry
2. Click **New Internal Integration**
3. Configure the integration:
   - **Name**: "Auto-Fixer Pipeline"
   - **Webhook URL**: `https://your-api.com/webhooks/sentry`
   - **Permissions**:
     - `Project: Read`
     - `Issue: Read`
     - `Event: Read`
   - **Webhooks**: Enable "Issue Alert" webhook
4. Save and note the **Client Secret** for webhook verification

### 2. Create Sentry Alert Rule

1. Go to **Alerts > Create Alert** in Sentry
2. Select your project
3. Configure conditions (e.g., "When an issue is created" or "When issue count exceeds threshold")
4. In **Actions**, select your Internal Integration
5. Save the alert rule

### 3. Configure Environment Variables

Add these environment variables to your API deployment:

```bash
# Required: Sentry webhook verification
SENTRY_WEBHOOK_SECRET=your-client-secret-from-sentry

# Required: Enable the fixer pipeline
SENTRY_FIXER_ENABLED=true

# Optional: Configuration overrides
SENTRY_FIXER_RATE_LIMIT_MINUTES=60
SENTRY_FIXER_DEDUP_MINUTES=30
SENTRY_FIXER_MAX_RETRIES=3
SENTRY_FIXER_RUN_TESTS=true
SENTRY_FIXER_TEST_COMMAND="pnpm test"

# Required for PR creation: GitHub
GITHUB_TOKEN=ghp_your_github_token
GITHUB_REPO_OWNER=your-org
GITHUB_REPO_NAME=your-repo
GITHUB_BASE_BRANCH=main

# Optional: Slack notifications (choose one method)
# Method 1: Incoming Webhook (simpler)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxx

# Method 2: Bot Token (more features)
SLACK_BOT_TOKEN=xoxb-xxx
SLACK_CHANNEL_ID=C1234567890
```

### 4. Run Database Migration

After adding the `SentryFixJob` model to your Prisma schema:

```bash
pnpm db:migrate
```

### 5. Set Up Job Processor

The job processor endpoint needs to be called periodically to process queued jobs.

#### Option A: Vercel Cron

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/sentry-fixer/process",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

#### Option B: External Scheduler

Call the endpoint every 5 minutes:

```bash
curl -X POST https://your-api.com/api/sentry-fixer/process
```

## API Endpoints

### `POST /webhooks/sentry`

Receives Sentry Issue Alert webhooks.

- **Signature verification**: Uses `Sentry-Hook-Signature` header with HMAC-SHA256
- **Returns**:
  - `202`: Job enqueued
  - `200`: Skipped (duplicate, rate limited, or disabled)
  - `401`: Invalid signature
  - `400`: Invalid payload

### `GET /webhooks/sentry`

Health check endpoint.

```json
{
  "ok": true,
  "configured": true,
  "enabled": true
}
```

### `POST /api/sentry-fixer/process`

Processes queued jobs.

- **Query params**:
  - `batch`: Number of jobs to process (default: 1, max: 5)
- **Returns**:
  ```json
  {
    "ok": true,
    "processed": 1,
    "succeeded": 1,
    "failed": 0,
    "results": [{ "jobId": "abc123", "success": true }]
  }
  ```

### `GET /api/sentry-fixer/process`

Status check endpoint.

```json
{
  "ok": true,
  "enabled": true,
  "configured": {
    "github": true,
    "slack": true
  },
  "hasPendingJobs": true
}
```

## Data Model

### SentryFixJob

| Field            | Type      | Description                                   |
| ---------------- | --------- | --------------------------------------------- |
| id               | UUID      | Unique job identifier                         |
| sentryIssueId    | String    | Sentry issue ID                               |
| sentryEventId    | String?   | Sentry event ID                               |
| organizationSlug | String    | Sentry organization                           |
| projectSlug      | String    | Sentry project                                |
| environment      | String?   | Environment (production, staging, etc.)       |
| release          | String?   | Release version                               |
| issueTitle       | String    | Error title                                   |
| issueUrl         | String    | Sentry issue URL                              |
| status           | Enum      | queued, running, succeeded, failed, cancelled |
| payloadSnapshot  | JSON      | Full webhook payload                          |
| branchName       | String?   | Git branch name                               |
| prUrl            | String?   | Pull request URL                              |
| prNumber         | Int?      | PR number                                     |
| errorMessage     | String?   | Error message if failed                       |
| retryCount       | Int       | Number of retry attempts                      |
| maxRetries       | Int       | Maximum retries allowed                       |
| startedAt        | DateTime? | When processing started                       |
| completedAt      | DateTime? | When processing completed                     |
| createdAt        | DateTime  | Job creation time                             |
| updatedAt        | DateTime  | Last update time                              |

## Slack Notifications

### PR Created Notification

```
🤖 Sentry Auto-Fix PR Created

TypeError: Cannot read property 'x' of undefined

Pull Request: #123
Environment: production
Sentry Issue: View Issue
Branch: fix/sentry-abc123-...

⚠️ Please review carefully before merging. This PR should never be auto-merged.
```

### Fix Failed Notification

```
❌ Sentry Auto-Fix Failed

TypeError: Cannot read property 'x' of undefined

Sentry Issue: View Issue
Retry: 3 / 3

Error:
```

Tests failed: 2 tests failed

```

```

## Testing

Run the test suite:

```bash
cd packages/sentry-integration
pnpm test
```

## Troubleshooting

### Webhook signature verification fails

1. Ensure `SENTRY_WEBHOOK_SECRET` matches the client secret from Sentry
2. Verify the webhook URL is correct in Sentry
3. Check that the request body is being read as raw text

### Jobs not being processed

1. Check that `SENTRY_FIXER_ENABLED=true`
2. Verify the cron job or scheduler is running
3. Check `/api/sentry-fixer/process` status endpoint

### PR creation fails

1. Ensure `GITHUB_TOKEN` has `repo` scope
2. Verify `GITHUB_REPO_OWNER` and `GITHUB_REPO_NAME` are correct
3. Check that `gh` CLI is installed and authenticated

### Tests failing in pipeline

1. Set `SENTRY_FIXER_RUN_TESTS=false` to skip tests temporarily
2. Check `SENTRY_FIXER_TEST_COMMAND` matches your test command
3. Review test output in job error message

## Security Considerations

1. **Webhook secret**: Keep `SENTRY_WEBHOOK_SECRET` secure
2. **GitHub token**: Use a token with minimal required permissions
3. **Slack token**: Use a dedicated bot account with limited scope
4. **Blocked paths**: Review and customize `DEFAULT_BLOCKED_PATTERNS` for your codebase
5. **Rate limiting**: Adjust based on your error volume and team capacity

## License

MIT
