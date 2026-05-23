# AGENTS.md — E2E Workflow Loop

## Build & Run

- Loop runs from `ralph/in-progress/e2e/`. Monorepo root is `../../../`.
- App must be running on localhost:2221 before running tests.
- Chrome must be open with `--remote-debugging-port=9222` for PERSISTENT_BROWSER mode.

## Test Commands (run from monorepo root)

```bash
# Run all workflow specs (sequential, fail-hard)
PERSISTENT_BROWSER=true E2E_SUITE=workflows pnpm exec playwright test --reporter=list

# Run single workflow spec
PERSISTENT_BROWSER=true pnpm exec playwright test e2e/workflows/events.workflow.spec.ts --reporter=list

# Run full-site spider (10 min)
PERSISTENT_BROWSER=true E2E_SUITE=spider pnpm exec playwright test e2e/workflows/full-site.spider.spec.ts --reporter=list

# Run with UI (visual debugging)
PERSISTENT_BROWSER=true pnpm exec playwright test --ui

# Show last HTML report
pnpm exec playwright show-report
```

## Key File Locations

- Workflow specs: `e2e/workflows/*.spec.ts`
- Shared helpers: `e2e/helpers/workflow.ts`
- Failure reports: `e2e/reports/*.json` + `e2e/reports/*.png`
- Playwright config: `playwright.config.ts`
- Auth setup: `e2e/global-setup.ts`, `e2e/global-setup-persistent-browser.ts`

## Source Locations (for fixing broken tests)

- Events: `apps/app/app/(authenticated)/events/`
- Kitchen: `apps/app/app/(authenticated)/kitchen/`
- CRM: `apps/app/app/(authenticated)/crm/`
- Command Board: `apps/app/app/(authenticated)/command-board/`
- Staff: `apps/app/app/(authenticated)/staff/`
- Inventory: `apps/app/app/(authenticated)/inventory/`
- Scheduling: `apps/app/app/(authenticated)/scheduling/`
- Settings: `apps/app/app/(authenticated)/settings/`
- API routes: `apps/api/app/api/<module>/`

## Debugging a Failing Test

1. Read the failure report: `e2e/reports/failure-<test-name>-<ts>.json`
2. Look at the screenshot: `e2e/reports/failure-<test-name>-<ts>.png`
3. Search the component source for the actual selector:
   - Button labels: `grep -r "Add\|Create\|New" apps/app/app/(authenticated)/<module>/ --include="*.tsx"`
   - Input names: `grep -r 'name="' apps/app/app/(authenticated)/<module>/ --include="*.tsx"`
4. Update the test selector to match the actual UI
5. Re-run to confirm

## Common Selector Patterns

```typescript
// Button by text
page.getByRole("button", { name: /create|add|new/i })

// Input by name attribute
page.locator('input[name="title"]')

// Radix Select trigger
page.locator('[role="combobox"]').first()

// Dialog
page.locator('[role="dialog"]')

// Toast notification
page.locator('[data-sonner-toast]')
```

## Operational Notes

- Keep this file operational only — progress goes in `IMPLEMENTATION_PLAN.md`
- `e2e/reports/` is gitignored — failure reports are local only
- Tests run sequentially (workers=1) to avoid DB state conflicts
- retries=0 — fail hard, no retries, force fixes
