# Implementation Plan (Scoped)

Scope: Expand Recipes and Events Pages with rich interactive features, image management, and modal-based editing

Non-goals:
- Calendar export to Google/Apple/Outlook
- Recipe rating system (1-5 stars)
- Comments/Notes on recipes
- Print view functionality
- Event reminders via email notifications
- Camera capture for images

## Blockers / Decisions

- [ ] Image storage provider (Supabase Storage or other)
- [ ] Image upload endpoint implementation
- [ ] Recipe favorites data model (new table/column)

## Tasks (ordered)

- [x] T1: Update recipes page grid to responsive layout (2 mobile, 3 tablet, 4 desktop) with 16:9 aspect ratio images
- [x] T2: Add heart/favorite icon with hover animation to recipe cards
- [x] T3: Create shared modal component with full-screen mobile and centered desktop views (max-width 800px)
- [x] T4: Implement recipe editor modal with Basic Info section (title, description, prep/cook time, servings, difficulty)
- [x] T5: Add image upload section with drag-and-drop zone, preview, and progress indicators
- [x] T6: Implement dynamic ingredients list with add/remove rows (quantity, unit, name, optional checkbox)
- [x] T7: Add step-by-step instructions with drag-to-reorder handles
- [x] T8: Implement tag input with suggestions
- [x] T9: Add toast notification component with 3s auto-dismiss and undo support
- [x] T10: Update events page with enhanced card layout and RSVP functionality
- [ ] T11: Add loading states (skeleton cards, spinners, progress bars)
- [ ] T12: Implement empty and error states with retry buttons
- [ ] T13: Add keyboard navigation and focus management for modals
- [ ] T14: Add ARIA labels and screen reader announcements
- [ ] T15: Implement lazy loading for images below fold
- [ ] T16: Add progress tracking for ingredients and steps in recipe detail view

## Exit Criteria

- [x] Recipe cards render in responsive grid with 2/3/4 columns on mobile/tablet/desktop
- [x] Heart/favorite icon with animation on recipe cards
- [x] Modal-based recipe editor opens (full-screen mobile, centered desktop)
- [x] Recipe editor saves successfully with toast notification
- [x] Image upload works with drag-drop and progress indicators
- [x] Ingredients and steps can be added/removed dynamically
- [ ] RSVP functionality works on events with attendee count updates
- [ ] Loading, empty, and error states display correctly
- [ ] Keyboard navigation and ARIA labels implemented
- [ ] Images lazy-load efficiently

## Notes

- Use existing shadcn/ui components from @repo/design-system
- Follow existing code patterns from event-form.tsx
- Use existing Toast component from @repo/design-system/components/ui/sonner.tsx
- Images use 16:9 aspect ratio on cards
- Modal opens < 300ms (animation duration)
- Toast auto-dismisses after 3s
- Debounced search at 300ms to reduce API calls
- Touch targets minimum 44x44px for mobile

## Database Migration Work: tenant_events.timeline_tasks

- Created/updated `tenant_events.timeline_tasks` per Schema Contract v2:
 	- TIMESTAMPTZ for all timestamps; added `end_time >= start_time`, non-negative `slack_minutes`, bounded `status/priority`.
 	- Enabled RLS with tenant-isolated policies and service_role bypass.
 	- Attached standard triggers: `core.fn_update_timestamp`, `core.fn_prevent_tenant_mutation`, `core.fn_audit_trigger`.
 	- Added tenant-aware composite partial indexes for active records.
- Checklist updated: see `DATABASE_PRE_MIGRATION_CHECKLIST.md` entry for `create_timeline_tasks_table.sql`.
- Validation: `pnpm check` fails with existing lint/format issues unrelated to this SQL change. Per AGENTS.md, documenting and pausing broader validation until app-layer fixes are addressed.

## Warehouse Receiving Workflow Implementation Notes

- Added PurchaseOrder and PurchaseOrderItem Prisma models to packages/database/prisma/schema.prisma
- Created SQL migration: docs/legacy-migrations/supabase-migrations/20260122000001_purchase_orders_receiving.sql (archived) following Schema Contract v2
  - Composite PK (tenant_id, id), RLS policies (5 each), tenant-aware indexes
  - Standard triggers (update timestamp, prevent tenant mutation, audit), REPLICA IDENTITY for real-time
  - FK constraints to inventory_suppliers, locations, inventory_items, core.units
  - Receiving workflow fields: quality_status (pending/approved/rejected/needs_inspection), discrepancy_type (shortage/overage/damaged/wrong_item/none), discrepancy_amount
- Created mobile-friendly receiving interface at apps/app/app/(authenticated)/warehouse/receiving/page.tsx
  - PO lookup and barcode scanning
  - Item list with quantity received input
  - Quality status selection (pending, approved, needs inspection, rejected)
  - Discrepancy type reporting (shortage, overage, damaged, wrong item)
  - PO summary panel with progress tracking
- Created receiving reports and supplier performance metrics at apps/app/app/(authenticated)/warehouse/receiving/reports/page.tsx
  - Supplier performance table with quality scores, on-time deliveries, lead times, discrepancy rates
  - Discrepancy breakdown by type with visual progress bars
  - Summary metrics cards for POs received, items received, quality score, discrepancies
- Validation: `pnpm check` shows pre-existing lint issues in analytics/components, API routes, config files - NOT related to warehouse receiving implementation

## Database Schema Synchronization Issue (2026-01-23)

**Problem:** Runtime PrismaClientKnownRequestError when querying `database.event.findMany()`:
```
The column `(not available)` does not exist in the current database.
```

**Root Cause:** Prisma schema had `venueId` column and `venue` relation on Event model, but the actual `tenant_events.events` table in the database was missing this column. The schema and database were out of sync.

**Investigation Steps:**
1. Verified Prisma schema at `packages/database/prisma/schema.prisma:307-333` - Event model had `venueId`
2. Checked migration status - reported "Database schema is up to date!" (incorrect)
3. Ran `prisma db pull` to introspect actual database schema
4. Confirmed `tenant_events.events` table structure via `psql` - no `venue_id` column existed

**Fix Applied:**
1. Added column to database:
   ```sql
   ALTER TABLE tenant_events.events ADD COLUMN venue_id uuid;
   CREATE INDEX idx_events_venue_id ON tenant_events.events (tenant_id, venue_id) WHERE venue_id IS NOT NULL;
   ```
2. Restored `venueId` field to Event model in Prisma schema
3. Added index definition: `@@index([tenantId, venueId], map: "idx_events_venue_id")`
4. Regenerated Prisma client: `npx prisma generate`
5. Validated schema: `npx prisma validate` - schema is valid

**Note:** No FK constraint was added since `tenant_crm.venues` table doesn't exist yet. When Venue table is created, add:
```sql
ALTER TABLE tenant_events.events
ADD CONSTRAINT fk_events_venue
FOREIGN KEY (tenant_id, venue_id)
REFERENCES tenant_crm.venues(tenant_id, id)
ON DELETE SET NULL;
```

**Lesson:** `prisma migrate status` only checks if migrations are applied, not if schema matches. Always run `prisma db pull` to sync when encountering column-not-found errors. The `prisma.config.ts` setup required running commands from `packages/database` directory.
