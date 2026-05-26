# Capsule-Pro Event-as-Spine Audit

**Date:** 2026-05-26
**Repo:** `/home/oc/projects/capsule-pro`
**Manifest:** `@angriff36/manifest@1.0.10`
**Mode:** Audit only. No code changes.

---

## 1. Executive Summary (Plain English)

**Event is a database spine, not a business spine.**

In Prisma, 11 tables include `eventId` as a foreign key — Event is structurally the hub. But in Manifest, **zero relationships exist between Event and any of those tables**. All 101+ commands across Event, Invoice, Payment, Budget, PrepTask, Collections, PurchaseOrders, and RevenueRecognition have **zero policy coverage** and **zero automatic cross-entity updates**. When an Event is confirmed, nothing triggers budget creation, invoice generation, or prep list setup. When a Payment is recorded, no invoice status or event revenue is updated. Every domain is a silo connected only by a shared column name.

**16 of 18 key financial commands have NO runtime callers.** They exist in Manifest IR as ghosts. All actual writes happen through direct Prisma calls in custom route handlers that bypass the Manifest dispatcher entirely.

**What works:** Manual CRUD. Users can create events, invoices, payments, and prep tasks.

**What's broken:** Cross-domain automation. Nothing cascades. Nothing reconciles. Budget actuals are manual.

**What's wide open:** All 101 commands have `policies: []` — any authenticated user can call any of them.

---

## 2. Current Business Spine Map

### Prisma: Event IS the central hub

| Table | Has `eventId` FK | Prisma @relation |
|---|---|---|
| Invoice | ✅ | No direct relation; raw FK |
| Payment | ✅ | `event Event @relation` |
| EventBudget | ✅ | `event Event @relation` |
| PrepTask | ✅ | No relation |
| PrepList | ✅ | No relation |
| EventStaff | ✅ | No relation |
| EventContract | ✅ | `event Event? @relation` |
| EventDish | ✅ | No relation |
| EventGuest | ✅ | No relation |
| CateringOrder | ✅ (nullable) | No relation |
| CollectionCase | ✅ | No relation |
| Proposal | ✅ (nullable) | No relation |
| RevenueRecognitionSchedule | ✅ | No relation |
| Schedule | ❌ | — |
| ScheduleShift | ❌ | — |
| TimeEntry | ❌ | — |
| PurchaseOrder | ❌ | — |
| WorkOrder | ❌ | — |

### Manifest: Event is an island

Every entity in the audit scope has `relationships: []`. The only exception is `PurchaseOrder → PurchaseOrderItem` (simple parent-child). No entity-to-entity relationships exist between Event and any other entity.

---

## 3. Event Relationship Matrix

| Domain Entity | Prisma eventId | Manifest eventId prop | Manifest relationship | Connected at runtime |
|---|---|---|---|---|
| Invoice | ✅ | ✅ (`string`) | ❌ | Direct Prisma |
| Payment | ✅ + relation | ✅ | ❌ | Direct Prisma |
| EventBudget | ✅ + relation | ✅ | ❌ | Direct Prisma |
| BudgetLineItem | ❌ (via budgetId) | ❌ | ❌ | Direct Prisma |
| PrepTask | ✅ | ✅ | ❌ | Mixed |
| PrepList | ✅ | ✅ | ❌ | Mixed |
| Schedule | ❌ | ❌ | ❌ | Direct Prisma |
| ScheduleShift | ❌ | ❌ | ❌ | Direct Prisma |
| TimeEntry | ❌ | ❌ | ❌ | Direct Prisma |
| CollectionCase | ✅ | ❌ | ❌ | Direct Prisma |
| PurchaseOrder | ❌ | ❌ | ❌ | Direct Prisma |
| WorkOrder | ❌ | ❌ | ❌ | Direct Prisma |
| CateringOrder | ✅ (nullable) | ❌ | ❌ | Direct Prisma |
| Proposal | ✅ (nullable) | ❌ | ❌ | Direct Prisma |
| RevenueRecognitionSchedule | ✅ | ❌ | ❌ | Direct Prisma |
| ActivityLog | Not in Manifest | Not in Manifest | Not in Manifest | Raw SQL |

---

## 4. Manifest vs Prisma Mismatch Table

| Gap | Severity | Detail |
|---|---|---|
| Manifest `string` for FKs | High | `eventId`, `invoiceId`, `clientId` are plain strings in Manifest, not typed relationships |
| ActivityLog missing | High | ActivityLog has NO Manifest entity. 100% of activity writes bypass semantic layer |
| Schedule/Shift/TimeEntry no eventId | High | Labor costs can't be traced to events. Budget actuals are manual |
| PurchaseOrder/WorkOrder no eventId | High | Vendor costs can't be tied to events |
| Invoice → LineItems missing | Medium | Manifest Invoice has `lineItems: string` (JSON blob), not `hasMany` relationship |
| Payment → Gateway missing | Medium | Payment has `gatewayTransactionId: string` but no PaymentMethod relationship |
| CateringOrder.eventId nullable | Medium | Orders can exist without events in both Prisma and Manifest |

---

## 5. Command Workflow Matrix (excerpt)

| Command | Entity | Guards | Policies | Has caller? |
|---|---|---|---|---|
| `Event.confirm` | Event | ✅ | ❌ | ✅ (command-board only) |
| `Event.cancel` | Event | ✅ | ❌ | ✅ (command-board only) |
| `Event.finalize` | Event | ✅ | ❌ | ❌ |
| `Invoice.send` | Invoice | ✅ | ❌ | ❌ |
| `Invoice.markAsPaid` | Invoice | ❌ | ❌ | ❌ |
| `Invoice.voidInvoice` | Invoice | ✅ | ❌ | ❌ |
| `Invoice.writeOff` | Invoice | ✅ | ❌ | ❌ |
| `Payment.process` | Payment | ✅ | ❌ | ❌ |
| `Payment.refund` | Payment | ✅ | ❌ | ❌ |
| `EventBudget.create` | EventBudget | ✅ | ❌ | ❌ |
| `PurchaseOrder.approve` | PurchaseOrder | ✅ | ❌ | ❌ |
| `CollectionCase.writeOff` | CollectionCase | ✅ | ❌ | ❌ |

---

## 6. Automatic Cross-Entity Updates

**Current state: NONE.**

| Trigger | What should happen | What actually happens |
|---|---|---|
| Event.confirm | Create budget, generate invoice, create prep template | Updates `status` only |
| Invoice.markAsPaid | Update payment, event revenue, revenue recognition | Nothing — no caller |
| Payment.process | Update invoice amountPaid, budget actuals, activity log | Nothing — no caller |
| VendorOrder.commit | Update BudgetLineItem actualAmount | Not modeled |
| Event.cancel | Void invoices, cancel prep, release staff | Updates `status` only |

**Outbox:** The runtime supports `emits` on commands, but there is no listener/subscriber infrastructure to consume them.

---

## 7. Manual or Missing Links

- **Labor → Event: MISSING.** Schedule/Shift/TimeEntry have no `eventId`. Cannot determine which event a labor cost belongs to.
- **Vendor → Event: MISSING.** PurchaseOrder/WorkOrder have no `eventId`. Cannot tie vendor costs to events.
- **ActivityLog → Everything: MISSING.** ActivityLog is not a Manifest entity. All activity writes use raw SQL in `apps/api/app/lib/activity-feed-service.ts`.

---

## 8. Manifest-Governed Writes

| Domain | Manifest-governed? |
|---|---|
| PrepTask.claim/complete/cancel | ✅ Yes |
| PrepList.create/finalize | ✅ Yes |
| Recipe.create/update | ✅ Yes |
| Event.create/cancel/confirm | ⚠️ Via command-board only; NOT via Event API route |
| Invoice.* | ❌ Direct Prisma |
| Payment.* | ❌ Direct Prisma |
| EventBudget.* | ❌ Direct Prisma |
| CollectionCase.* | ❌ Direct Prisma |
| PurchaseOrder.* | ❌ Direct Prisma |

**27 files call `runCommand`** — all in kitchen/inventory/command-board domains.

---

## 9. Direct Prisma or Raw SQL Bypasses

**Direct Prisma writes:**
- `apps/api/app/api/events/route.ts:151` — `database.event.findMany()`
- `apps/api/app/api/accounting/invoices/route.ts:245` — `database.invoice.create()`
- `apps/api/app/api/accounting/payments/route.ts:233` — `database.payment.create()`

**Raw SQL:**
- `apps/api/app/lib/activity-feed-service.ts` — Activity feed
- `apps/app/app/(authenticated)/events/[eventId]/battle-board/actions/tasks.ts` — Battle board (had `t.startTime` bug)
- `apps/app/app/(authenticated)/analytics/*/actions/*.ts` — Analytics queries

---

## 10. Policy and Tenant Coverage

**Every command in scope has `policies: []` and `defaultPolicies: []`.**

| Entity | Commands | Policies | Impact |
|---|---|---|---|
| Event | 10 | 0 | Any user can cancel/archive any event |
| Invoice | 10 | 0 | Any user can void/writeoff any invoice |
| Payment | 9 | 0 | Any user can refund/chargeback any payment |
| EventBudget | 4 | 0 | Any user can approve/finalize any budget |
| CollectionCase | 18 | 0 | Any user can writeoff/close any case |
| PurchaseOrder | 7 | 0 | Any user can approve/reject any PO |

**Runtime behavior:** Empty `command.policies` → legacy fallback → no matching policies found → returns `{ allowed: true }`.

**Tenant:** All entities have `tenantId`. Manifest runtime injects it. Direct Prisma writes use `requireTenantId()`. Protected at DB level, not governed by Manifest.

---

## 11. User-Visible Product Impact

| Symptom | Root cause | Severity |
|---|---|---|
| Confirming event doesn't create budget/prep | No cross-entity automation | High |
| Recording payment doesn't update invoice | Payment.process has no caller | High |
| Budget actuals don't reflect real costs | Labor/vendor tables have no eventId | High |
| No audit trail for refunds/voids | ActivityLog not in Manifest; no automatic writes | High |
| Any staff can void invoice/refund payment | Zero policies on all commands | High |
| Raw SQL schema-drift bugs (e.g., `t.startTime`) | CamelCase in raw SQL | Medium |

---

## 12. Top 10 Fixes to Make Event a Real App-Wide Entity

1. **Add Manifest relationships** between Event and Invoice/Payment/Budget/PrepTask/CateringOrder/CollectionCase
2. **Wire Invoice/Payment commands** to Manifest dispatcher; replace direct Prisma in accounting routes
3. **Add policies** to every command in Event/Invoice/Payment/Budget/Collections domains
4. **Build outbox subscribers** for Event.confirm → create budget, generate invoice, create prep template
5. **Link labor to events** by adding `eventId` to Schedule/ScheduleShift/TimeEntry
6. **Link vendor orders to events** by adding `eventId` to PurchaseOrder/WorkOrder
7. **Create ActivityLog Manifest entity** with commands for each activity type
8. **Fix raw SQL column names** — audit all `$queryRawUnsafe` for CamelCase vs snake_case mismatches
9. **Wire RevenueRecognition** to trigger on Invoice.markAsPaid
10. **Add CollectionCase automation** for overdue invoices (auto-create case at 30/60/90 days)

---

## 13. Evidence Files and Lines

| Claim | File | Line(s) |
|---|---|---|
| Invoice has eventId FK | `packages/database/prisma/schema.prisma` | Invoice model, `eventId` field |
| Payment has eventId FK with @relation | `packages/database/prisma/schema.prisma` | Payment model, `event Event @relation` |
| Manifest Event has zero relationships | `manifest/ir/kitchen.ir.json` | Event entity, `relationships: []` |
| All commands have zero policies | `manifest/ir/kitchen.ir.json` | Every entity in scope, `policies: []` |
| Invoice.create uses direct Prisma | `apps/api/app/api/accounting/invoices/route.ts` | 245 |
| Payment.create uses direct Prisma | `apps/api/app/api/accounting/payments/route.ts` | 233 |
| Event routes use direct Prisma | `apps/api/app/api/events/route.ts` | 151, 173 |
| Policy evaluator allows empty policies | `runtime-engine.ts` (Manifest) | 1506-1540 |
| ActivityLog not in Manifest IR | `manifest/ir/kitchen.ir.json` | No entity named ActivityLog |
| Schedule has no eventId | `packages/database/prisma/schema.prisma` | Schedule model |
| PurchaseOrder has no eventId | `packages/database/prisma/schema.prisma` | PurchaseOrder model |
| Battle board raw SQL CamelCase bug | `apps/app/.../battle-board/actions/tasks.ts` | 83-84 (now fixed) |
| Invoice.send / Payment.process zero callers | Codebase grep | 0 results |
| validate-ai: collections 0, invoice 50, payment 55 | `pnpm exec manifest validate-ai` per file | Reported above |
