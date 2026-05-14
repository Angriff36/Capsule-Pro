# Capsule CRM — Josh's Complete Wants Map

**Last updated:** 2026-04-27
**Status:** Bill blocked — this doc is ready to send when he's available
**Owner:** Josh | **Builder:** Bill | **QA:** Tito

---

## What Capsule Is

Not just a CRM. A **modular catering operating system** — event workflows, quoting, staffing, equipment, HR, reporting, venue management. TPP replacement + everything TPP never was.

---

## ALL OF JOSH'S WANTS (categorized)

### 1. EVENT LIFECYCLE MANAGEMENT
- [x] Event creation with all TPP fields (date, occasion, guest count, service style, venue, salesperson, referred from)
- [ ] **Online menu pricing** — clients can see menu items with prices
- [ ] **DM inquiry capture** — social media DMs flow into leads
- [ ] **Self-service quote builder** — clients can build their own quote online
- [ ] **Mobile-first** — Kayden and Josh use phones/tablets in the field
- [ ] **Social sharing** — proposals/decks shareable via link
- [ ] **Event status pipeline** — Quote → Sales Lock → Confirmed → Final → Complete (TPP statuses mapped)
- [ ] **Sales Lock status** — needs to be added to Capsule (TPP has it, Capsule doesn't)
- [ ] **Service Style entity** — Full Service / Limited Service / Drop Off / Vending (TPP core concept, missing from Capsule)
- [ ] **Event detail page** — currently crashes (is_active column missing bug)

### 2. PROPOSAL SYSTEM (First Wedge)
- [ ] **Proposal builder** — generate branded proposals from event data
- [ ] **TPP bridge approach** — import TPP data, generate Capsule proposals
- [ ] **Branded templates** — wedding-magazine quality (design system exists)
- [ ] **Digital signature ready** — CTA at bottom of proposals
- [ ] **Menu sections with pricing**
- [ ] **Timeline section**
- [ ] **Venue logistics section**
- [ ] **Enhancements/upgrades section**

### 3. DATA MIGRATION (TPP → Capsule)
- [x] Event data extracted (2,103 events, 27 fields, 2021–YTD 2026)
- [x] Revenue analysis complete (yearly, monthly, by salesperson, occasion, service style)
- [x] Data quality assessment done
- [x] TPP field → Capsule field mapping documented
- [x] TPP status → Capsule status mapping documented
- [ ] **CRM Contacts** — name, email, phone, company, address (requires TPP access)
- [ ] **Pipeline/Deals** — open deals, stages, close history
- [ ] **Menu Items catalog** — names, categories, pricing
- [ ] **Pack Lists** — per-event equipment/supply lists (NO bulk export — browser automation needed)
- [ ] **Venues** — full records with address, capacity, notes
- [ ] **Payment history** — reconcile with QB/Nowsta
- [ ] **⚠️ Pack List ≠ PrepList** — TPP pack lists are equipment/supply. Capsule PrepList is food prep only. Need equipment pack list entity.
- [ ] **Parallel run** — both systems live, daily comparison
- [ ] **Final cutover** — TPP archived

### 4. REPORTING & DASHBOARDS
- [ ] **Tim's KPIs** — replicate what TPP provides
- [ ] **Company Scorecard** — built as standalone HTML, needs to live in Capsule
- [ ] **L10 Meeting Template** — built as standalone HTML, needs to live in Capsule
- [ ] **Avg Event Value Growth Strategy** — built as standalone HTML, needs to live in Capsule
- [ ] **Comp Master Status Dashboard** — built as standalone HTML, needs to live in Capsule
- [ ] **Sales dashboard** — 3% of Josh's comp
- [ ] **Mangia Dashboard Round 4** — part of comp deliverables
- [ ] **Venue-based filtering** — on-premise vs off-premise events
- [ ] **Revenue attribution by venue** — commission tracking, split calculations

### 5. VENUE MANAGEMENT
- [ ] **Venue profiles** — kitchen access, load-in logistics, capacity, preferred/banned vendors, scorecard metrics
- [ ] **Event layouts** — venue-specific fields
- [ ] **Notes system** — venue-linked entries (not just event-linked)
- [ ] **Vendor ecosystem tracking** per venue
- [ ] **Revenue attribution** — commission tracking, split calculations
- **NOTE:** Venue management is a CORE use case, not a nice-to-have. Tell Bill when build resumes.

### 6. STAFFING & HR (Future)
- [ ] **Staff scheduling** per event
- [ ] **Role scorecards** — what each role requires
- [ ] **Hiring pipeline** — KM interview tool JSON schema maps to Capsule interview model
- [ ] **Performance tracking** — event feedback per staff member
- [ ] **Monthly 1-on-1 tracking** — goals, strengths, areas of opportunity

### 7. KITCHEN OPERATIONS (Future)
- [ ] **Menu management** — items, categories, pricing, seasonal updates
- [ ] **Food cost tracking** — per-event and aggregate
- [ ] **Waste tracking**
- [ ] **Inventory management**
- [ ] **Recipe management**

### 8. EQUIPMENT (Future)
- [ ] **Equipment inventory** — what we own, condition, location
- [ ] **Equipment pack lists** — per-event, per-service-style templates
- [ ] **Equipment tracking** — what's out, what's available, maintenance schedule

### 9. INTEGRATIONS (Future)
- [ ] **QuickBooks** — financial sync
- [ ] **Nowsta** — payroll sync
- [ ] **Google Calendar** — event scheduling
- [ ] **Email** — client communication tracking
- [ ] **SMS** — reminders, confirmations
- [ ] **Social media** — DM inquiry capture

---

## BLOCKERS / OPEN QUESTIONS FOR BILL

1. **Event detail crash** — is_active column missing. Fixed?
2. **Pack List entity** — TPP has equipment/supply pack lists. Capsule only has food PrepList. Need equipment pack list.
3. **Sales Lock status** — one-line manifest change needed.
4. **Service Style entity** — core TPP concept, missing from Capsule schema.
5. **Bot-to-bot communication** — Bill's bot reached Tito over Tailscale. What does Bill need from this?
6. **Skills setup** — Josh discussed with Bill during Riker's overnight work. What was agreed?
7. **Timeline** — when is Bill picking this back up?

---

## MIGRATION STRATEGY (A/B Parallel)

### Phase 1: Discovery (Week 1)
- Gap analysis complete ✅
- TPP data extracted ✅
- Dealbreakers identified ✅

### Phase 2: Foundation (Weeks 2-3)
- 2025 test data imported
- Menu/pack lists working
- Event lifecycle end-to-end

### Phase 3: Workflow Validation (Weeks 3-4)
- Kayden daily testing
- Tim review of reports
- Josh sign-off on event flow

### Phase 4: Reporting (Weeks 4-5)
- Tim's KPIs replicated
- Comp dashboards live in Capsule
- Josh's sales dashboard

### Phase 5: Parallel Run (Weeks 5-6)
- Both TPP and Capsule live
- Daily data comparison
- Bug fixes

### Phase 6: Cutover (Weeks 6-8)
- Final migration
- TPP archived
- Capsule is the system

---

## EXISTING RESEARCH FILES

| File | What It Covers |
|------|---------------|
| `research/capsule-migration-plan.md` | Full migration plan with timeline, risks, go/no-go gates |
| `research/tpp-capsule-data-map.md` | TPP → Capsule field mapping (27 fields analyzed) |
| `research/tpp-report-playbook.md` | How to extract remaining TPP data |
| `research/capsule-pro-manifest-analysis.md` | Capsule Pro schema analysis (5,493-line Prisma schema) |
| `research/venue-management-wireframe-2026-04-22.md` | Venue management requirements |
| `delivery/mangia-comp/` | All 4 comp deliverable HTML files (need to move into Capsule) |
| `memory/2026-04-20.md` | Capsule Pro handoff details, TPP status mapping, gaps found |

---

## WHAT'S READY TO SEND TO BILL

1. This document (complete wants map)
2. Migration plan (already exists, needs timeline update)
3. Data map (already exists)
4. Venue management requirements (already exists)
5. The 5 blocker questions above
6. Comp dashboard HTML files (4 deliverables ready to integrate)

**What needs to happen:** Josh says go → send to Bill in OpenClaw Hub Capsule topic → track his responses → update this doc.
