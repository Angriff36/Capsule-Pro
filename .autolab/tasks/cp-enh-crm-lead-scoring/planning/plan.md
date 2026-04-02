# Lead Scoring Feature Plan

## Discovery Findings

- **CRM Entities**: `Client` (primary) and `Lead` in `tenant_crm` schema
- **Lead fields**: `companyName`, `contactName`, `contactEmail`, `contactPhone`, `eventType`, `eventDate`, `estimatedGuests`, `estimatedValue`, `status`, `assignedTo`, `notes`
- **Client fields**: `company_name`, `first_name`, `last_name`, `email`, `phone`, `city`, `stateProvince`, `tags`, `source`, etc.
- **API Pattern**: `GET` routes use direct Prisma with tenant isolation; `POST` uses manifest commands
- **Client list**: `ClientsClient` component in `crm/clients/components/clients-client.tsx` using `@tanstack/react-table`

## Implementation Plan

### 1. Migration: `packages/database/prisma/migrations/20260327040000_add_lead_scoring/`

- Add `score INTEGER DEFAULT 0` and `score_breakdown JSONB DEFAULT '{}'` to `tenant_crm.leads`
- Create `tenant_crm.crm_scoring_rules` table:
  - `id UUID PRIMARY KEY`
  - `tenant_id UUID`
  - `rule_name VARCHAR(255)`
  - `field VARCHAR(100)` — which lead field to evaluate
  - `condition VARCHAR(50)` — equals | gt | lt | gte | lte | contains | exists
  - `value VARCHAR(255)` — value to compare against
  - `points INTEGER`
  - `is_active BOOLEAN DEFAULT true`
  - `priority INTEGER DEFAULT 0`
  - `created_at TIMESTAMPTZ`
  - `updated_at TIMESTAMPTZ`

### 2. Scoring API Routes: `apps/api/app/api/crm/scoring/`

- `route.ts` — GET list rules, POST create rule
- `[id]/route.ts` — PUT update rule, DELETE rule
- `calculate/route.ts` — POST recalculate scores for all leads
- All use `Prisma.sql` with tenant isolation, auth via `auth()` from `@repo/auth/server`

### 3. Scoring Config Page: `apps/app/app/(authenticated)/crm/scoring/page.tsx`

- Page with scoring rules list, toggle enable/disable
- Add/edit rule dialog (field selector, condition, value, points)
- Recalculate all scores button
- Score distribution cards (hot/warm/cold counts)

### 4. Lead List (modify `ClientsClient`)

- The CRM clients page is the main list view for leads/prospects
- Add score column with color-coded badges to `ClientsClient`
- Note: `Client` model doesn't have leads; this component already exists

### 5. Nav Link

- Add "Scoring" nav item to CRM layout sidebar navigation

### 6. Verify

- `npx tsc --noEmit` must pass with 0 errors
