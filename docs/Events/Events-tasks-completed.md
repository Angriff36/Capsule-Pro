# Task Plan: Event Contracts Implementation

## Goal
Implement complete Event Contract Management system for Convoy catering platform including database models, API endpoints, and UI components.

## Phases
- [x] Phase 1: Database Schema (EventContract, ContractSignature models)
- [x] Phase 2: API Endpoints (CRUD operations, signature capture, expiration alerts)
- [x] Phase 3: UI Components (contract forms, signature pad, document viewer, status dashboard)
- [x] Phase 4: Testing and validation
- [x] Phase 5: Update IMPLEMENTATION_PLAN.md and commit

## Key Questions
1. What's the correct schema for EventContract and ContractSignature models? **Answered** - See notes.md
2. How should contracts relate to existing Event and Client models? **Answered** - Composite FKs to Event and Client
3. What's the proper location for API routes (apps/api per invariant)? **Answered** - apps/api/app/api/events/contracts/
4. What UI components are needed for contract management? **Answered** - List page, detail page, signature pad, document viewer

## Decisions Made
- **Database location**: tenant_events schema (follows existing pattern)
- **API location**: apps/api/app/api/events/contracts/ (per invariant - /api/** must be in apps/api)
- **Document storage**: Store URL references, use existing storage infrastructure
- **Signature format**: Base64 encoded for simplicity, can migrate to proper storage later

## Errors Encountered
- (None yet)

## Status
**COMPLETE** - All phases finished successfully. Commit created: 6845dfb57

## Phase 4 Completed
- [x] Fixed import paths (changed from relative to @/app/lib/tenant)
- [x] Fixed Button component type error (removed invalid 'component' prop)
- [x] Verified no contract-related type errors
- [x] Updated IMPLEMENTATION_PLAN.md with completion status

## Phase 5 Completed
- [x] Updated IMPLEMENTATION_PLAN.md with Event Contracts marked complete
- [x] Updated Events module progress to ~85%
- [x] Updated overall progress to ~55-60%
- [x] Removed Event Contracts from "Key Gaps" and "Next Steps"
- [x] Created git commit: 6845dfb57

## Phase 1 Completed
- [x] Created migration: supabase/migrations/20260122000005_event_contracts.sql
- [x] Updated Prisma schema with EventContract and ContractSignature models
- [x] Migration includes RLS policies, indexes, triggers, and auto-numbering function

## Phase 2 Completed
- [x] Created types: apps/api/app/api/events/contracts/types.ts
- [x] Created validation: apps/api/app/api/events/contracts/validation.ts
- [x] Created main route: apps/api/app/api/events/contracts/route.ts (GET list, POST create)
- [x] Created [id] route: apps/api/app/api/events/contracts/[id]/route.ts (GET single, PUT update, DELETE)
- [x] Created signature routes:
  - apps/api/app/api/events/contracts/[id]/signature/route.ts (POST signature)
  - apps/api/app/api/events/contracts/[id]/signatures/route.ts (GET signatures)
- [x] Created expiring route: apps/api/app/api/events/contracts/expiring/route.ts (GET expiring)

## Phase 3 Completed
- [x] Created contract list page: apps/app/app/(authenticated)/events/contracts/page.tsx
- [x] Created contract list client: contracts-page-client.tsx with filters, search, pagination
- [x] Created contract detail page: apps/app/app/(authenticated)/events/contracts/[id]/page.tsx
- [x] Created contract detail client: contract-detail-client.tsx with signatures, document viewer
- [x] Created signature pad component: signature-pad.tsx for drawing signatures
- [x] Created app-level API routes for status, document, send, and signature operations

## Implementation Details

### Database Models (from specs)
- **EventContract**: contractNumber, eventId, clientId, status, documentUrl, expiresAt, notes
- **ContractSignature**: contractId, signedAt, signatureData, signerName, signerEmail, ipAddress

### API Endpoints Required
- POST /api/events/[eventId]/contracts - Create contract
- GET /api/events/[eventId]/contracts - List contracts
- GET /api/events/contracts/[id] - Get single contract
- PUT /api/events/contracts/[id] - Update contract
- DELETE /api/events/contracts/[id] - Delete contract
- POST /api/events/contracts/[id]/signature - Capture signature
- GET /api/events/contracts/[id]/signatures - List signatures
- GET /api/events/contracts/expiring - Get expiring contracts

### UI Components Required
- Contract list page
- Contract detail view
- Contract creation/edit form
- Signature pad component
- Document upload/viewer
- Status dashboard with expiration alerts

## Files to Create
1. Database migration: `supabase/migrations/*_event_contracts.sql`
2. Prisma schema updates: `packages/database/prisma/schema.prisma`
3. API routes: `apps/api/app/api/events/contracts/route.ts`
4. UI pages: `apps/app/app/(authenticated)/events/[eventId]/contracts/page.tsx`
