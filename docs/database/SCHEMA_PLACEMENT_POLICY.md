# Schema Placement Policy (Capsule-Pro)

**Status:** Binding POLICY for schema placement decisions (documentation — not consumed by any
script; the live `@@schema` placement is the hand-maintained `multiSchema.entitySchema` map in
`manifest/prisma-options.config.json` / `manifest.config.yaml`, which must follow these rules).
**Machine-readable companion:** `manifest/schema-placement.rules.json`.

## Why this exists

Capsule-Pro's database is **multi-schema** (12 domain schemas plus `public`, which holds only Manifest-runtime infra tables). Every generated Prisma model **must** declare a `@@schema(...)`. The goal of this policy is that **an agent (or the generator) can decide which schema a new Manifest entity belongs to without asking a human every time** — and when it genuinely can't, it **fails loudly with a useful error instead of silently dumping the table in `public`.**

`public` is **not** the architecture. A tenant entity must never land in `public`.

Sources this policy is built from: `docs/database/README.md`, the `manifest/source/*.manifest` filenames, and the known-good multi-schema `schema.prisma` (commit `923baaa8`).

## The schemas and what each owns

| Schema | Owns | Tenant-scoped? |
|---|---|---|
| `platform` | SaaS/account layer: tenants, accounts, platform audit, sent emails, platform jobs, API keys. **Not** normal tenant business data. | No (no `tenant_id`) |
| `core` | Shared immutable reference data: enums, units, conversion tables, status types, system functions. Cross-domain. | No |
| `tenant` | Shared tenant **infrastructure** used by multiple domains: locations, settings, documents, outbox/events, generic tenant-wide records **not owned by one module**. | Yes |
| `tenant_crm` | Sales/customer lifecycle: leads, clients, contacts, proposals, deals, follow-ups, CRM interactions. | Yes |
| `tenant_events` | Booked event operations: events, battle boards, event imports, timelines, guest lists, event budgets, waitlists, event setup sessions, command boards. | Yes |
| `tenant_inventory` | Inventory & purchasing: inventory items, stock, suppliers/vendors, purchase orders, shipments, reorder suggestions, storage locations, pricing. | Yes |
| `tenant_kitchen` | Kitchen/food ops: recipes, prep lists/tasks, dishes, menus, method videos, bulk prep, allergens, **food-safety QA**, temperature logs, stations, kitchen waste, constraint-override audit. | Yes |
| `tenant_staff` | Workforce/HR: employees, schedules, shifts, time entries, payroll, performance, availability, training, labor budgets, **staff disciplinary/corrective actions**. | Yes |
| `tenant_admin` | Tenant control-plane metadata: reports, workflows, notifications, permissions/roles config, admin audit, generic approval/versioning/configuration records, email/SMS templates, rate limits, seed data. **Do not** dump operational records here just because an admin clicks the button. | Yes |
| `tenant_accounting` | Accounting/finance: bank accounts, chart of accounts, invoices, payments, payment methods, revenue recognition, collections, payroll accounting, finance budgets (unless clearly event-owned). | Yes |
| `tenant_facilities` | Facilities/maintenance: facility schedules, work orders, equipment/facility maintenance. | Yes |
| `tenant_logistics` | Routing/dispatch/delivery logistics: routes, dispatches, transport coordination. | Yes |

## Decision order (first match wins)

1. **Explicit override.** If the entity has an entry in `manifest.config.yaml` → `projections.prisma.options.multiSchema.entitySchema`, use it. *(Overrides are exceptions only — see below.)*
2. **Source-file rule.** Match the `.manifest` file the entity is authored in against `sourceFileRules` in the rules JSON (e.g. anything in `*facilit*` → `tenant_facilities`, `invoice|payment|bank-account|…` → `tenant_accounting`). This handles the normal case — the author already filed the entity in a domain.
3. **Name pattern.** If the source file is multi-domain or doesn't match, match the **entity name** against `namePatterns` (e.g. `^QA|temperature` → `tenant_kitchen`, `vendor|supplier|inventory` → `tenant_inventory`).
4. **Shared tenant infrastructure.** If it's a generic tenant-wide record not owned by one module (`Location`, `Setting`, `Document`, `Outbox*`, `KnowledgeBase`, …) → `tenant`.
5. **Fail.** Emit `UNMAPPED_SCHEMA_PLACEMENT` with the entity, source file, fields, and the missing-rule hint. **Never** fall back to `public`.

**`entitySchema` is the exception layer, not the main system.** Most entities are placed by rules 2–4. Only put an entity in `entitySchema` when:
- it's a **hand-preserved (non-Manifest) model** with no `.manifest` source file, or
- it's authored in a **multi-domain file** (`staff-logistics-extended`, `crm-admin-extended`, `events-extended`, `equipment`) where one file rule can't be right, or
- it's a **documented ambiguous entity** (e.g. `Budget`).

## Worked examples

| Entity | Schema | Reason |
|---|---|---|
| `QACheck`, `QATemperatureLog` | `tenant_kitchen` | Food-safety QA is a kitchen operation. |
| `QACorrectiveAction` | `tenant_kitchen` **or** `tenant_staff` | Kitchen if it's a food-safety/process correction; **staff** if it's employee discipline/performance. Defaults to `tenant_kitchen` (authored in `qa-rules`); override to `tenant_staff` if it models discipline. |
| `StaffPerformance`, `WorkforceOptimization`, `PerformancePrediction` | `tenant_staff` | Workforce/HR. |
| `Deal`, `AutomatedFollowup` | `tenant_crm` | Sales lifecycle. |
| `EventTimelineItem`, `EventWaitlistEntry`, `EventImportWorkflow`, `AiEventSetupSession` | `tenant_events` | Event operations. |
| `BankAccount` | `tenant_accounting` | Finance. |
| `Budget` | `tenant_accounting` | Finance budget — **unless** it's clearly an `EventBudget` (→ `tenant_events`) or `LaborBudget` (→ `tenant_staff`). This is an explicit override. |
| `Vendor` | `tenant_inventory` | Procurement. |
| `FacilitySchedule`, `FacilityWorkOrder` | `tenant_facilities` | Facilities/maintenance. |
| `LogisticsDispatch`, `LogisticsRoute` | `tenant_logistics` | Routing/dispatch. |
| `EntityVersion`, `VersionedEntity`, `VersionApproval`, `SampleData` | `tenant_admin` | Control-plane/config — **unless** tied to a specific operational domain. |

## When placement fails

If no rule resolves an entity, generation **stops** with:

```
UNMAPPED_SCHEMA_PLACEMENT: cannot place entity '<Entity>' (source: <file>.manifest).
No entitySchema override, no sourceFileRule, no namePattern, and not shared tenant infra matched.
Add an override to manifest.config.yaml (projections.prisma.options.multiSchema.entitySchema)
OR add a domain rule to manifest/schema-placement.rules.json. Fields: <...>.
```

This is intentional — an unplaced tenant entity is a **policy gap to fill**, not a reason to default to `public`.

## How to extend it

- **New entity in an existing domain file** → usually nothing to do; the source-file rule places it.
- **New domain / new source-file naming** → add a `sourceFileRules` entry in `manifest/schema-placement.rules.json`.
- **Genuinely ambiguous or multi-domain-file entity** → add a single line to `entitySchema` in `manifest.config.yaml` and (if it's a judgement call) note it under `ambiguityGuidance` in the rules JSON.
- **Never** widen a rule so broadly that it silently mis-places another domain's entities — prefer a precise rule plus an override.
