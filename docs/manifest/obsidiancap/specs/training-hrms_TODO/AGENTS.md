## Build & Run

Succinct rules for how to BUILD the project:

```bash
# Install dependencies
pnpm install

# Run database migrations
pnpm migrate

# Build all packages
pnpm build

# Run dev server
pnpm dev
```

## Validation

Run these after implementing to get immediate feedback:

- Tests: `pnpm test` (focus on `apps/api/__tests__/training` and `apps/api/__tests__/hrms`)
- Typecheck: `pnpm typecheck`
- Lint: `pnpm lint`
- Format: `pnpm format`

## Operational Notes

Succinct learnings about how to RUN the project:

### Security Requirements

- PINs MUST be encrypted at rest using the project's encryption utilities
- All access to sensitive data (PINs, certifications, disciplinary records) MUST be logged with `Sentry` or database audit logs
- Employee self-service means employees can only access THEIR OWN records, not others'
- HR/Manager roles have escalated permissions based on their reporting relationships

### Multi-Tenant Architecture

- All tables MUST include `tenant_id` for data isolation
- Queries MUST filter by current tenant context
- Indexes MUST include `tenant_id` for performance

### Notification System

- Uses Ably via outbox pattern for real-time notifications
- Scheduled notifications (birthdays, anniversaries, expirations) use a cron/job pattern
- Notification preferences respect employee settings where applicable

### Codebase Patterns

- **API Routes**: Follow `apps/api/app/api/[domain]/[resource]/[operation]/route.ts` pattern
- **Domain Logic**: Use Manifest for domain definitions when applicable
- **Database**: Prisma with Neon - edit `packages/database/prisma/schema.prisma` then run `pnpm migrate`
- **Authentication**: Uses existing auth system - check `apps/api/lib/auth` for patterns
- **File Uploads**: Use existing file storage utilities in `packages/storage`
- **Date/Time**: Use project's date utilities, not native Date (for timezone consistency)

### Related Existing Code

- Staff management: `apps/app/app/(authenticated)/staff/`
- Authentication: `apps/api/lib/auth/`
- Notification templates: Check existing email/notification templates
- File uploads: `packages/storage/`
