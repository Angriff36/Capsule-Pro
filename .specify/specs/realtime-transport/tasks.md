# Tasks: Realtime Transport (Outbox to Ably)

Feature ID: 001
Total Tasks: 21
Constitution: 1.0.0
Status: COMPLETE

## Phase 1: Setup

- [x] T001 [US1] Create packages/realtime scaffold `packages/realtime/`
  - **Do**:
    1. Create package.json with zod dependency, @repo/database peer dependency (optional)
    2. Create tsconfig.json extending @repo/typescript-config
    3. Create vitest.config.ts with vitest config
    4. Create src/index.ts placeholder
  - **Files**:
    - `packages/realtime/package.json`
    - `packages/realtime/tsconfig.json`
    - `packages/realtime/vitest.config.ts`
    - `packages/realtime/src/index.ts`
  - **Done when**: Package files exist, pnpm install succeeds
  - **Verify**: `cd /c/projects/capsule-pro && test -f packages/realtime/package.json && pnpm install --filter @repo/realtime`
  - **Commit**: `feat(realtime): create package scaffold`

## Phase 2: Core Implementation (POC)

- [x] T002 [P] [US3] Define event envelope base types `packages/realtime/src/events/envelope.ts`
  - **Do**:
    1. Export REALTIME_EVENT_VERSION = 1
    2. Define RealtimeEventBase interface (id, version, tenantId, aggregateType, aggregateId, occurredAt)
  - **Files**: `packages/realtime/src/events/envelope.ts`
  - **Done when**: RealtimeEventBase type exported
  - **Verify**: `cd /c/projects/capsule-pro/packages/realtime && pnpm typecheck`
  - **Commit**: `feat(realtime): define event envelope base types`

- [x] T003 [P] [US3] Define kitchen event types `packages/realtime/src/events/kitchen.ts`
  - **Do**:
    1. Define KitchenTaskClaimedEvent extends RealtimeEventBase
    2. Define KitchenTaskReleasedEvent extends RealtimeEventBase
    3. Define KitchenTaskProgressEvent extends RealtimeEventBase
    4. Export KitchenEvent union type
  - **Files**: `packages/realtime/src/events/kitchen.ts`
  - **Done when**: All three event types defined with discriminated eventType
  - **Verify**: `cd /c/projects/capsule-pro/packages/realtime && pnpm typecheck`
  - **Commit**: `feat(realtime): define kitchen event types`

- [x] T004 [P] [US4] Implement channel naming utilities `packages/realtime/src/channels/naming.ts`
  - **Do**:
    1. Create getChannelName(tenantId) returning `tenant:{tenantId}`
    2. Create getModuleFromEventType(eventType) extracting first part
    3. Create parseChannelName(channel) extracting tenantId
  - **Files**:
    - `packages/realtime/src/channels/naming.ts`
    - `packages/realtime/src/channels/index.ts`
  - **Done when**: Three functions exported
  - **Verify**: `cd /c/projects/capsule-pro/packages/realtime && pnpm typecheck`
  - **Commit**: `feat(realtime): implement channel naming utilities`

- [x] T005 [US3] Create Zod schemas for all events `packages/realtime/src/events/schemas.ts`
  - **Do**:
    1. Define RealtimeEventBaseSchema
    2. Define payload schemas for each kitchen event
    3. Define discriminated union RealtimeEventSchema
    4. Export parseRealtimeEvent() helper
  - **Files**: `packages/realtime/src/events/schemas.ts`
  - **Done when**: Zod schemas validate all event types
  - **Verify**: `cd /c/projects/capsule-pro/packages/realtime && pnpm typecheck`
  - **Commit**: `feat(realtime): add Zod validation schemas`

- [x] T006 [US2] Implement createOutboxEvent helper `packages/realtime/src/outbox/create.ts`
  - **Do**:
    1. Define CreateOutboxEventInput type
    2. Create createOutboxEvent(db, input) function
    3. Support PrismaClient and TransactionClient
    4. Include occurredAt in payload
  - **Files**:
    - `packages/realtime/src/outbox/create.ts`
    - `packages/realtime/src/outbox/index.ts`
  - **Done when**: Function inserts OutboxEvent with status=pending
  - **Verify**: `cd /c/projects/capsule-pro/packages/realtime && pnpm typecheck`
  - **Commit**: `feat(realtime): implement createOutboxEvent helper`

- [x] T007 [VERIFY] Quality checkpoint
  - **Do**: Run quality commands on new package
  - **Verify**: `cd /c/projects/capsule-pro && pnpm check && pnpm typecheck --filter @repo/realtime`
  - **Done when**: All commands exit 0
  - **Commit**: `chore(realtime): pass quality checkpoint` (if fixes needed)

- [x] T008 [P] [US3] Export all event types `packages/realtime/src/events/index.ts`
  - **Do**:
    1. Re-export envelope types
    2. Re-export kitchen events
    3. Re-export Zod schemas
  - **Files**: `packages/realtime/src/events/index.ts`
  - **Done when**: All types available from @repo/realtime/events
  - **Verify**: `cd /c/projects/capsule-pro/packages/realtime && pnpm typecheck`
  - **Commit**: `feat(realtime): export event types`

- [x] T009 [US1] Refine publisher endpoint with envelope `apps/api/app/outbox/publish/route.ts`
  - **Do**:
    1. Import types from @repo/realtime
    2. Build RealtimeEvent envelope (id, version, tenantId, aggregateType, aggregateId, occurredAt, eventType, payload)
    3. Publish envelope to Ably
    4. Add oldestPendingSeconds to response
  - **Files**: `apps/api/app/outbox/publish/route.ts`
  - **Done when**: Ably messages include full envelope
  - **Verify**: `cd /c/projects/capsule-pro/apps/api && pnpm typecheck`
  - **Commit**: `feat(api): add envelope to outbox publisher`

- [x] T010 [US1] Add payload size validation `apps/api/app/outbox/publish/route.ts`
  - **Do**:
    1. Check serialized message size (warn at 32 KiB, reject at 64 KiB)
    2. Set error status on oversized payloads
  - **Files**: `apps/api/app/outbox/publish/route.ts`
  - **Done when**: Oversized events rejected
  - **Verify**: `cd /c/projects/capsule-pro/apps/api && pnpm typecheck`
  - **Commit**: `feat(api): add payload size validation`

- [x] T011 [VERIFY] Quality checkpoint
  - **Do**: Run quality commands
  - **Verify**: `cd /c/projects/capsule-pro && pnpm check && pnpm typecheck --filter @repo/realtime && pnpm typecheck --filter api`
  - **Done when**: All commands exit 0
  - **Commit**: `chore(realtime): pass quality checkpoint` (if fixes needed)

- [x] T012 [US1] POC validation - end-to-end publish
  - **Do**:
    1. Create test outbox event via SQL/Prisma
    2. Call /api/outbox/publish with valid token
    3. Verify status becomes published
    4. Verify Ably message received with envelope
  - **Done when**: Full pipeline works: DB -> Publisher -> Ably
  - **Verify**: Manual test with curl/Ably dashboard or write E2E script
  - **Commit**: `feat(realtime): complete POC validation`

## Phase 3: Refinement

- [x] T013 [US5] Add SKIP LOCKED for concurrency safety `apps/api/app/outbox/publish/route.ts`
  - **Do**:
    1. Replace findMany with $queryRaw SELECT FOR UPDATE SKIP LOCKED
    2. Keep limit parameter
  - **Files**: `apps/api/app/outbox/publish/route.ts`
  - **Done when**: Concurrent publishers won't process same events
  - **Verify**: `cd /c/projects/capsule-pro/apps/api && pnpm typecheck`
  - **Commit**: `feat(api): add SKIP LOCKED for concurrent safety`

- [x] T014 [VERIFY] Quality checkpoint
  - **Do**: Run quality commands
  - **Verify**: `cd /c/projects/capsule-pro && pnpm check && pnpm typecheck`
  - **Done when**: All commands exit 0
  - **Commit**: `chore(realtime): pass quality checkpoint` (if fixes needed)

## Phase 4: Testing

- [x] T015 [US3] Unit tests for event schemas `packages/realtime/__tests__/events.test.ts`
  - **Do**:
    1. Test valid payload acceptance
    2. Test invalid payload rejection (wrong version, missing fields, bad timestamps)
  - **Files**: `packages/realtime/__tests__/events.test.ts`
  - **Done when**: All schemas tested with valid/invalid cases
  - **Verify**: `cd /c/projects/capsule-pro/packages/realtime && pnpm test`
  - **Commit**: `test(realtime): add event schema unit tests`

- [x] T016 [US4] Unit tests for channel naming `packages/realtime/__tests__/channels.test.ts`
  - **Do**:
    1. Test getChannelName format
    2. Test empty tenantId throws
    3. Test getModuleFromEventType extraction
  - **Files**: `packages/realtime/__tests__/channels.test.ts`
  - **Done when**: All channel functions tested
  - **Verify**: `cd /c/projects/capsule-pro/packages/realtime && pnpm test`
  - **Commit**: `test(realtime): add channel naming unit tests`

- [x] T017 [US1] Integration tests for publisher `apps/api/__tests__/outbox-publish.test.ts`
  - **Do**:
    1. Test pending event -> published status transition
    2. Test failed events marked with error
    3. Test response includes published/failed counts
    4. Mock Ably client
  - **Files**: `apps/api/__tests__/outbox-publish.test.ts`
  - **Done when**: Publisher flow fully tested
  - **Verify**: `cd /c/projects/capsule-pro/apps/api && pnpm test`
  - **Commit**: `test(api): add publisher integration tests`

- [x] T018 [VERIFY] Quality checkpoint
  - **Do**: Run full test suite
  - **Verify**: `cd /c/projects/capsule-pro && pnpm check && pnpm typecheck && pnpm test --filter @repo/realtime && pnpm test --filter api`
  - **Done when**: All tests pass
  - **Commit**: `chore(realtime): pass quality checkpoint` (if fixes needed)

## Phase 5: Quality Gates

- [x] T019 [VERIFY] Full local CI
  - **Do**: Run complete local CI suite
  - **Verify**: `cd /c/projects/capsule-pro && pnpm check && pnpm typecheck && pnpm test --filter @repo/realtime && pnpm test --filter api && pnpm build --filter @repo/realtime && pnpm build --filter api`
  - **Done when**: All commands pass
  - **Commit**: `chore(realtime): pass local CI` (if fixes needed)

- [x] T020 Create PR and verify CI
  - **Do**:
    1. Push branch: `git push -u origin <branch>`
    2. Create PR: `gh pr create --title "feat(realtime): implement outbox to Ably transport" --body "Implements Feature 001"`
  - **Verify**: `gh pr checks --watch`
  - **Done when**: All CI checks green
  - **Commit**: None (PR creation)

- [x] T021 [VERIFY] AC checklist
  - **Do**: Verify all acceptance criteria from spec.md
  - **Verify**:
    - AC-1.1: Pending events read ordered by createdAt
    - AC-1.2: Events publish to tenant:{tenantId}
    - AC-1.3: Published events have status=published
    - AC-1.4: Failed events have error message
    - AC-1.5: Bearer token required
    - AC-1.6: Response returns counts
    - AC-2.1 through AC-3.5: Type-safe helpers
    - AC-4.1 through AC-4.4: Channel naming
  - **Done when**: All ACs confirmed met
  - **Commit**: None

## Notes

### POC Shortcuts
- Manual trigger for /api/outbox/publish (no cron)
- No retry logic for failed events
- No dead letter queue
- Single-publisher acceptable until SKIP LOCKED added

### Constitution Alignment
- [C2.1] Business-critical realtime uses outbox + Ably
- [C2.1] Supabase Realtime prohibited
- [C2.1] Use Prisma + Neon
- [C2.1] Tenant isolation at application layer
- [C2.2] Use Zod for runtime validation
- [C2.2] Prioritize Kitchen events

### Technical Debt
| Debt | Future Fix | Tracking |
|------|------------|----------|
| No exponential backoff | Phase 2 retry logic | Spec 4.3 |
| No dead letter queue | Phase 2 | Spec 4.3 |
| Client-side filtering | Phase 2 module channels | Spec 8.2 |
| No event archival | Separate cleanup job | Spec 4.3 |

### Dependencies
- Internal: @repo/database (Prisma client), apps/api (publisher host)
- External: ably (installed in apps/api), zod (project-wide)

### Build Sequence
| Phase | Tasks | Est. Time |
|-------|-------|-----------|
| 1. Setup | T001 | 15 min |
| 2. Core (POC) | T002-T012 | 2.5 hours |
| 3. Refinement | T013-T014 | 30 min |
| 4. Testing | T015-T018 | 1.5 hours |
| 5. Quality Gates | T019-T021 | 30 min |

**Total Estimated**: ~5 hours

### Parallel Batches
- Batch 1: T002, T003, T004 (types can be defined in parallel)
- Remaining tasks are sequential due to dependencies
