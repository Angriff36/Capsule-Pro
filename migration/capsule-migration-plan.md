# Capsule CRM Migration Plan

**TPP → Capsule | A/B Parallel Migration**
**Last updated:** 2026-04-16 (TPP data status update)
**Project Owner:** Josh | **Builder:** Bill | **QA/Review:** Tito | **Ops User:** Kayden | **Exec Stakeholder:** Tim

---

## Executive Summary for Josh

### What We're Doing
Migrating Mangia's entire event operations out of TPP (legacy ASP.NET, no API, 2,491 events) into Capsule — the custom CRM/ops system Bill is building. We're doing this side-by-side, not with a hard cutover, so TPP stays live until Capsule is proven.

### Current TPP Data Status (as of 2026-04-16)

**✅ Extracted & Analyzed:**
- **2,103 events** exported via Query Generator CSV (27 fields, 2021–YTD 2026)
  - Note: the migration plan references 2,491 events — need to reconcile (2,103 in CSV vs 2,491 in TPP Quick Insights; difference likely includes pre-2021 events, deleted/archived, or dashboard counting method)
- **Full revenue analysis** complete — yearly, monthly, by salesperson, by occasion, by service style
- **Service style mapping** done (Full Service / Limited Service / Drop Off / Vending-Other)
- **Data quality assessment** complete — reliability tiers documented per field
- **Data extraction playbook** written (tpp-report-playbook.md)
- **Extraction paths mapped** for all remaining TPP data (contacts, deals, menus, pack lists, venues, financials)

**⏳ Still Needs Extraction (requires live TPP access):**
- CRM Contacts (name, email, phone, company, address)
- Pipeline/Deals (open deals, stages, close history)
- Menu Items catalog (names, categories, pricing)
- Pack Lists (per-event, no bulk export — browser automation or template capture)
- Venues (full records with address, capacity, notes)
- Payment history (Ledger Report — reconcile with QB/Nowsta)

**❌ Not Migrating:**
- Historical notes/communications (too costly to extract; Capsule captures new comms from go-live)
- BEO numbers (essentially unused in TPP)
- Balance Due field (unreliable — payment truth lives in QB/Nowsta)

### Timeline (8 Weeks)

| Week | Phase | Key Milestone |
|------|-------|---------------|
| 1 | Discovery | Gap analysis complete, dealbreakers identified |
| 2-3 | Foundation | 2025 test data imported, menu/pack lists working |
| 3-4 | Workflow Validation | Full event lifecycle works end-to-end in Capsule |
| 4-5 | Reporting & Dashboards | Tim's KPIs replicated, dashboards live |
| 5-6 | Parallel Run | Both systems live, daily data comparison |
| 6-8 | Cutover | Final migration, TPP archived, Capsule is the system |

### What Could Go Wrong (Top Risks)
1. **Menu/pack list integrity** — These are hooked to 2,491 events. A mapping error here is catastrophic. Mitigation: validate on 2025 data first, triple-check before backfill.
2. **Capsule gaps not found until parallel run** — Discovery might miss edge cases only daily users catch. Mitigation: Kayden and Tim in workflow validation early.
3. **Bill scope creep** — Builder can start over-engineering. Mitigation: Tito challenges every "nice-to-have" vs "need-to-have."
4. **Timeline slip** — Any phase delay cascades into cutover. Mitigation: hard weekly check-ins, phase gates don't open until acceptance criteria are met.
5. **Data loss during migration** — No API means export/import is manual/scripted. Mitigation: full TPP backup before any data moves, checksum validation on import.

### Go/No-Go Gates
After each phase, Josh signs off before next phase begins. No exceptions.

---

## Roles

| Role | Person | Responsibility |
|------|--------|----------------|
| Project Owner | Josh | Final decisions, go/no-go gates, timeline calls |
| Builder | Bill | Capsule development, data migration scripts, bug fixes |
| QA / External Review | Tito | Challenge assumptions, gap analysis, test cases, acceptance validation |
| Ops User / Coordinator | Kayden | Daily workflow testing, real-world feedback, data entry validation |
| Exec Stakeholder | Tim | KPI/reporting requirements, kitchen display needs, final cutover sign-off |

---

## Phase 1: Discovery (Week 1)

> **Goal:** Know exactly what Capsule can and can't do before any data moves. No surprises.

### Kanban Board

| # | Task | Owner | Dependencies | Acceptance Criteria | Risk |
|---|------|-------|-------------|-------------------|------|
| 1.1 | Get Capsule access for Tito | Bill | — | Tito has login, can navigate all modules | 🔴 Blocks everything downstream |
| 1.2 | Capsule feature inventory | Tito | 1.1 | Documented list of every Capsule module, field, workflow | — |
| 1.3 | TPP feature inventory | Tito | — | Documented list of every TPP feature actually used (not theoretical) | — |
| 1.4 | Gap analysis: TPP vs Capsule | Tito | 1.2, 1.3 | Mapped list: ✅ covered / ⚠️ partial / ❌ missing | 🔴 Dealbreakers flagged here |
| 1.5 | TPP data map (events, clients, venues, contacts, menus, pack lists) | Tito | — | Complete field-by-field data dictionary | 🔴 Being built separately — on track? |
| 1.6 | Dealbreaker review with Josh | Josh | 1.4, 1.5 | Josh aware of every gap, priorities set for what Bill must build | — |
| 1.7 | TPP full backup before any migration | Bill | — | Verified backup, stored in 2+ locations | 🔴 Non-negotiable prerequisite |

### Phase Gate
- [ ] Josh sign-off: gaps acceptable, no unknown dealbreakers, priorities clear

---

## Phase 2: Foundation (Weeks 2-3)

> **Goal:** Core data lives in Capsule. Menu items and pack lists work without breaking event history.

### Kanban Board

| # | Task | Owner | Dependencies | Acceptance Criteria | Risk |
|---|------|-------|-------------|-------------------|------|
| 2.1 | Build data migration script (events, clients, venues, contacts) | Bill | Phase 1 gate | Script runs, produces import-ready data | — |
| 2.2 | Test import: 2025 events only | Bill | 2.1 | All 2025 events imported, counts match TPP | — |
| 2.3 | Validate 2025 data accuracy | Tito | 2.2 | Spot-check 20+ events — every field correct | — |
| 2.4 | Menu item structure mapping | Bill + Tito | 1.5 | Menu items linked to events correctly, no orphans | 🔴 Highest risk — event integrity |
| 2.5 | Pack list structure mapping | Bill + Tito | 1.5 | Pack lists linked to events, items count matches | 🔴 Second highest risk |
| 2.6 | Salesperson assignments and permissions | Bill | 2.2 | All 5 salespeople assigned to correct historical events, permissions scoped | — |
| 2.7 | Backfill historical data (2020-2024, 2026) | Bill | 2.3, 2.4, 2.5 | All 2,491 events migrated, counts verified | — |
| 2.8 | Full data validation (checksum) | Tito | 2.7 | Event count, client count, venue count, menu item count all match TPP | 🔴 Must pass before Phase 3 |
| 2.9 | Kayden smoke test: can she find and view events | Kayden | 2.7 | Kayden can navigate, search, and view events without training | — |

### Phase Gate
- [ ] Tito sign-off: data counts match, menu/pack lists intact, no orphaned records
- [ ] Kayden sign-off: basic navigation works

---

## Phase 3: Workflow Validation (Weeks 3-4)

> **Goal:** Every daily operation works in Capsule. If someone can't do their job, we find out here.

### Kanban Board

| # | Task | Owner | Dependencies | Acceptance Criteria | Risk |
|---|------|-------|-------------|-------------------|------|
| 3.1 | Create new event end-to-end | Kayden | Phase 2 gate | Event created with all required fields, saves correctly | — |
| 3.2 | Build menu for an event | Kayden | 3.1 | Menu items selectable, quantities editable, saves to event | — |
| 3.3 | Generate pack list from menu | Kayden | 3.2 | Pack list auto-generates from menu, editable, printable | — |
| 3.4 | Create quote/proposal | Josh / Kayden | 3.2 | Proposal generates from event+menu, looks professional, exportable | — |
| 3.5 | Contract workflow | Josh | 3.4 | Contract generated, sendable, trackable (sent/viewed/signed status) | — |
| 3.6 | Communication tracking (notes, inbox replacement) | Kayden | 3.1 | Notes per event, timestamped, searchable. Replaces TPP inbox | — |
| 3.7 | Sales pipeline: full lifecycle | Josh | 3.1 | Lead → Qualified → Proposal → Contract → Final → Event — all stages work | — |
| 3.8 | Edit existing event data | Kayden | 3.1 | Can modify any field on existing event without breaking links | — |
| 3.9 | Tito workflow QA report | Tito | 3.1-3.8 | Written report: what works, what's broken, what's janky | 🔴 Determines if we proceed |
| 3.10 | Josh review of QA report + priority fixes | Josh | 3.9 | Prioritized fix list agreed, Bill has sprint tasks | — |
| 3.11 | Bill implements critical fixes | Bill | 3.10 | All critical and high-priority items resolved | — |

### Phase Gate
- [ ] Tito sign-off: no critical workflow gaps
- [ ] Josh sign-off: acceptable UX, fixes prioritized and assigned

---

## Phase 4: Reporting & Dashboard (Weeks 4-5)

> **Goal:** Tim gets his numbers. Sales floor and kitchen have what they need.

### Kanban Board

| # | Task | Owner | Dependencies | Acceptance Criteria | Risk |
|---|------|-------|-------------|-------------------|------|
| 4.1 | Document Tim Tab KPIs (exact metrics, calculations) | Tito + Tim | Phase 3 gate | Every KPI defined with formula, data source, refresh frequency | 🔴 Tim availability |
| 4.2 | Build KPI reports in Capsule | Bill | 4.1 | Reports produce same numbers as TPP Tim Tab | — |
| 4.3 | Validate report accuracy (cross-reference TPP) | Tito | 4.2 | Spot-check: same event, same period, same number in both systems | — |
| 4.4 | Sales floor dashboard | Bill | 4.2 | Pipeline view, upcoming events, conversion metrics — visible and current | — |
| 4.5 | Kitchen display / event prep view | Bill | Phase 2 gate | Kitchen can see upcoming events, menus, pack lists, counts | — |
| 4.6 | Custom report builder validation | Tito | 4.2 | Can build ad-hoc reports without Bill's help | ⚠️ Nice-to-have, not a gate |
| 4.7 | Tim review and feedback | Tim | 4.3, 4.4 | Tim confirms reports meet his needs | — |

### Phase Gate
- [ ] Tim sign-off: reports accurate, dashboards useful
- [ ] Tito sign-off: numbers verified

---

## Phase 5: Parallel Run (Weeks 5-6)

> **Goal:** Both systems live. Real data, real events. Capsule proves itself or exposes last problems.

### Kanban Board

| # | Task | Owner | Dependencies | Acceptance Criteria | Risk |
|---|------|-------|-------------|-------------------|------|
| 5.1 | Define parallel run rules (what gets entered where, by whom) | Josh | Phase 4 gate | Written protocol: which events go in both, which are Capsule-only | — |
| 5.2 | All new events entered in both TPP and Capsule | Kayden + Josh | 5.1 | Every new event exists in both systems for 2 weeks | 🔴 User discipline required |
| 5.3 | Daily data comparison (event counts, dollar amounts, statuses) | Tito | 5.2 | Daily log: systems match or discrepancy documented | — |
| 5.4 | Weekly discrepancy review | Josh | 5.3 | All discrepancies categorized: data error, workflow gap, user error | — |
| 5.5 | User feedback collection (Tim, Josh, Kayden) | Tito | 5.2 | Structured feedback form, responses compiled weekly | — |
| 5.6 | Bill fixes from parallel run issues | Bill | 5.4, 5.5 | Issues triaged and fixed per priority | — |
| 5.7 | Parallel run assessment report | Tito | End of Week 6 | Go/no-go recommendation with data: accuracy rate, user satisfaction, remaining gaps | 🔴 Determines cutover readiness |

### Phase Gate
- [ ] Tito recommendation: Capsule ready for cutover (or not, with reasons)
- [ ] Josh decision: proceed to cutover or extend parallel run

---

## Phase 6: Cutover (Weeks 6-8)

> **Goal:** Capsule is the system. TPP becomes a read-only archive.

### Kanban Board

| # | Task | Owner | Dependencies | Acceptance Criteria | Risk |
|---|------|-------|-------------|-------------------|------|
| 6.1 | Final data migration (delta: anything entered in TPP during parallel run) | Bill | Phase 5 gate | All new/changed data since initial migration is in Capsule | 🔴 Last migration — must be clean |
| 6.2 | Final data validation | Tito | 6.1 | Counts match, no missing events, no duplicate records | — |
| 6.3 | TPP set to read-only | Bill | 6.2 | Nobody can edit data in TPP. Archive snapshot taken. | — |
| 6.4 | Capsule declared system of record | Josh | 6.2, 6.3 | Formal decision: all new data goes to Capsule only | — |
| 6.5 | User training session (Kayden, Josh, Tim) | Tito | 6.4 | Everyone can do their core workflows without help | — |
| 6.6 | Quick reference guide / cheat sheet | Tito | 6.5 | One-page per role: how to do the 5 things you do most | — |
| 6.7 | 30-day support window | Bill | 6.4 | Bill available for rapid bug fixes, UX tweaks | — |
| 6.8 | TPP decommission decision (keep archive or kill) | Josh | Week 8+ | Decision documented — archive retained for 12 months minimum | — |

### Phase Gate
- [ ] Josh sign-off: cutover complete, TPP archived, Capsule is live
- [ ] 30-day check-in scheduled

---

## Dependency Map (Simplified)

```
Phase 1 (Discovery)
  └─→ Phase 2 (Foundation)
        └─→ Phase 3 (Workflow Validation)
              ├─→ Phase 4 (Reporting) ──→ Phase 5 (Parallel Run)
              └────────────────────────────→ Phase 5
                                              └─→ Phase 6 (Cutover)
```

## Risk Register

| Risk | Likelihood | Impact | Mitigation | Status |
|------|-----------|--------|------------|--------|
| Menu/pack list data corruption during migration | Medium | Critical | Validate on 2025 first, checksum validation, TPP backup | ⚠️ No access to menus/pack lists yet — Bill needs to provide |
| Capsule missing critical TPP feature discovered late | Medium | High | Thorough discovery, Kayden involved in workflow testing early | 🔴 Blocked — no Capsule access yet (Task 1.1) |
| Bill availability delays (he has other commitments) | Medium | Medium | Hard weekly check-ins, clear sprint commitments | 🔴 ACTIVE — Bill hasn't responded to access request (sent Apr 12) |
| User adoption resistance | Low | Medium | Parallel run proves value, training built in, Kayden involved from Phase 2 | — |
| Timeline slip from Phase 3 fixes | Medium | Medium | Buffer built into Phase 5-6, critical-only fixes for Phase 3 gate | — |
| TPP data export is messy/incomplete | Medium | High | Manual audit of export before migration script runs | ✅ Mitigated — events CSV audited, quality tiers documented |
| Event count discrepancy (2,103 vs 2,491) | Medium | Medium | Reconcile before migration; identify missing events | ⚠️ Needs investigation with TPP access |

---

## Weekly Rhythm

- **Monday:** Tito sends week's priorities + open blockers
- **Wednesday:** Bill + Tito sync (30 min) — progress, blockers, questions
- **Friday:** Josh gets end-of-week status update (Tito sends, Josh reviews)
- **Phase gates:** Josh reviews acceptance criteria, signs off or extends

---

_This is a living document. Update as reality dictates. No plan survives contact with the data._
