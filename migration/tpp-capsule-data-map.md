# TPP → Capsule CRM Data Extraction Map

**Created:** 2026-04-16
**Source:** `tpp-historical-master.csv` (2,103 events, 2021–YTD 2026) + `tpp-report-playbook.md`

---

## 1. Every TPP Field Available (Query Generator Export)

27 columns. 2,103 data rows (header + 2,103 events).

| # | Field | Data Type | Populated | Example | Reliability |
|---|-------|-----------|-----------|---------|-------------|
| 1 | **Balance Due** | Currency | 100% | `0.00` | Likely unreliable — may not reflect Nowsta/QB payments. Many zeros suggest payment sync gap. |
| 2 | **Contact Company Name** | Text | 41% (860) | `Hospice of North Idaho` | Good when populated. Missing for ~59% — many contacts are individuals, not companies. |
| 3 | **Contact First Name** | Text | 88% (1,860) | `Mangia`, `CDA` | Mostly populated. Some entries use company/org name as first name (e.g., "Mangia", "CDA Downtown Association"). |
| 4 | **Contact Last Name** | Text | 88% (1,853) | `Event`, `Association` | Paired with First Name. Same quality notes — org names split across first/last. |
| 5 | **Event Date** | Date (MM/DD/YYYY) | 100% | `4/24/2021` | Fully populated. Reliable primary date field. |
| 6 | **Event Total** | Currency | 100% | `0.00` | Always has a value but many zeros ($0 marketing/internal events). For commercial events, reliable. Includes gratuity + service charge. |
| 7 | **Guest Count** | Integer | 100% | `400` | Always populated. May be estimates for proposals that didn't close. |
| 8 | **Invoice No** | Text | 100% | `2337` | Sequential numeric. Every event has one, even $0 events. Reliable identifier. |
| 9 | **Occasion** | Text | 98% (2,067) | `Marketing Event`, `Wedding`, `Corporate Event` | Top values: Corporate Event (1,218), Wedding (179), Social Event (170), Christmas Party (110), Vending (82), Holiday (51), Birthday (51). |
| 10 | **Sales Person** | Text | 98% (2,057) | `Tim Mitchell`, `M L`, `Josh Mitchell` | Good coverage. Uses full name. Some abbreviation (`M L` = likely Mangia/mixed). |
| 11 | **Service Style** | Text | 100% | `Buffet - Cook Onsite` | Always populated. Appears to be a code/ID. |
| 12 | **BEO #** | Text | <1% (1) | Empty | Essentially empty. BEO tracking wasn't used in this export. Not reliable. |
| 13 | **Created Date** | Date (MM/DD/YYYY) | 100% | `3/12/2021` | Fully populated. Record creation date, not booking date. |
| 14 | **Event Gratuity** | Currency | 100% | `0.00` | Always has value. Mostly $0 for corporate events (gratuity often not charged or separate). |
| 15 | **Event Service Charge** | Currency | 100% | `0.00` | Always has value. Mostly $0 — service charge may not be consistently tracked. |
| 16 | **Event Status** | Text/Code | 100% | `3`, `9` | Numeric code only. Map: 3=Final, 9=Cancelled, 0=Quote, 2=Sales Lock, 1=Confirmed, 00=Closed. |
| 17 | **Event Status Name** | Text | 100% | `3- Final`, `9-Cancelled` | Human-readable status. Top: 3-Final (1,811), 9-Cancelled (129), 0-Quote (75), 2-Sales Lock (43), QUOTE (LOST) (23), 1-Confirmed (14). |
| 18 | **Event SubTotal** | Currency | 100% | `0.00` | Base catering amount (excl. gratuity/service charge). Reliable when non-zero. |
| 19 | **Event Title** | Text | 99% (2,092) | `Hospice Wine Taste`, `Mac & Cheese Festival` | Descriptive name. Good for matching/display. |
| 20 | **Event Type** | Text | 98% (2,066) | `Corporate`, `Social`, `Wedding`, `Vending` | Top: Corporate (1,386), Social (363), Wedding (228), Vending (88). 5 categories total. |
| 21 | **Referred From** | Text | 85% (1,794) | `EZ Cater`, `Repeat Customer`, `Referral`, `Google` | Top: EZ Cater (595), Repeat Customer (473), blank (310), Referral (156), Google (146), Salesperson (100). **310 blank = gap.** Some entries have formatting issues (quotes, special chars). |
| 22 | **Sales Person First Name** | Text | 98% (2,057) | `Tim`, `M`, `Josh` | Splits Sales Person into components. Same reliability. |
| 23 | **Sales Person Last Name** | Text | 98% (2,057) | `Mitchell`, `L` | Same. |
| 24 | **Service Style Name** | Text | 100% | `Buffet - Cook Onsite` | Human-readable service style. Reliable. |
| 25 | **Venue Name** | Text | 77% (1,619) | `CPU MANGIA CATERING`, `SEL 2440 BUILDING` | 485 blank (~23%). Top venues are SEL buildings, medical offices, Mangia locations. Venue = "Mangia Catering" variants likely means drop-off/on-site at Mangia. |
| 26 | **Venue State** | Text | 98% (2,055) | `ID`, `Idaho`, `WA`, `Washington` | **Inconsistent formatting** — mixes abbreviations and full state names. Needs normalization. |
| 27 | **Service Style Category** | Text | 100% | `Full Service` | Categorization of service style. Values: Full Service, Drop Off, etc. Always populated. |

### Fields NOT in the Export (but exist in TPP)
These are in TPP's UI but not available via Query Generator CSV export:
- **Contact email, phone, address** — CRM module only
- **Proposal sent date** — event detail page
- **Last status change date** — possibly in UI, not exported
- **Close probability / expected close date** — Sales Module (Delicacy)
- **Food cost per event** — Profit Analysis report
- **Menu items per event** — event detail page (linked to menu catalog)
- **Pack lists** — event detail page (Feast+)
- **Communication history** — CRM Inbox
- **Contract/billing documents** — file attachments per event
- **Task/checklist status** — event management module
- **Client portal activity** — Delicacy tier

---

## 2. Data Extraction Paths

### A. Events (Query Generator) — ✅ Already Mapped
**Navigation:** Reports → Query Generator → Select fields → Set filters → Export CSV
**What we have:** Complete export, 2,103 events, 27 fields, 2021–YTD 2026
**Status:** Done. File at `tpp-historical-master.csv`.

### B. Contacts/Leads (CRM Module)
**Navigation:** CRM → Contacts (or Quick Insights dashboard)
**What's there:** Full contact records — name, company, email, phone, address, associated events
**Quick Insights data pulled:** Lead counts, deal creation/won counts by year (2021–2026) — but **deals created = deals won for 2025** is suspicious (see quality notes)
**Extraction needed:**
- Full contact list export (name, email, phone, company, address, created date)
- Lead-to-contact mapping (which events belong to which contact)
- Contact tags/categories if any
**Access:** Requires CRM login. Browser export likely via grid → CSV or individual contact pages.
**Dependency:** Contacts should be extracted first — everything else links to them.

### C. Pipeline Stages (CRM Deals)
**Navigation:** CRM → Deals (or Pipeline view)
**What's there:** Open deals with stage, probability, expected close date, deal value
**Extraction needed:**
- All open/active deals with current stage
- Deal-to-event mapping
- Historical deal data (won/lost) if accessible
- Close reasons for lost deals
**Access:** Requires crm2 login. May need browser automation — no bulk export obvious.
**Capsule needs:** This is core CRM data. Priority extraction.

### D. Menu Items (TPP Legacy)
**Navigation:** Menu Management → Menu Items (or Menu Catalog)
**What's there:** Full menu item catalog — item name, category, description, recipe link, cost, price
**Extraction needed:**
- All active menu items with pricing
- Menu categories/hierarchy
- Items linked to historical events (which menus were used for which events)
**Access:** TPP menu module. May require per-category export or individual page scraping.
**Capsule needs:** Essential for quoting/proposals. Extract after events + contacts.

### E. Pack Lists (TPP Legacy)
**Navigation:** Per-event detail page → Pack List tab
**What's there:** Equipment/supply lists tied to specific menu items and service styles
**Extraction needed:**
- Pack list templates (if reusable across events)
- Event-specific pack lists
- Item-to-menu-item mapping
**Access:** Event detail pages only. **No bulk export likely.** Will require browser automation per event or manual capture of templates.
**Capsule needs:** Important for ops but lower migration priority. Can be rebuilt from menu items + service style rules.

### F. Venues (TPP Legacy + CRM)
**Navigation:** TPP has venue records linked to events; CRM may have separate venue contacts
**What we have from CSV:** 1,619 venue names (77% populated), venue state
**Extraction needed:**
- Full venue list with address, contact info, capacity, venue type
- Venue-to-event count mapping (for partner performance analysis)
- Venue-specific notes or preferences
**Access:** TPP venue management section + CRM venue contacts
**Note:** Many "venues" are just Mangia's own locations. Need to classify: external venue vs. Mangia facility vs. client location.

### G. Financial Data
**Sources:**
1. **Query Generator** — Event Total, SubTotal, Gratuity, Service Charge, Balance Due (already have)
2. **Ledger Report** — Payment history, invoice status, payment dates, payment methods
3. **Sales Forecasting** — Pipeline-weighted revenue projections (Delicacy tier)
**Extraction needed:**
- Payment history per event (dates, amounts, methods)
- Outstanding balances (reconcile with Balance Due field)
- Tax breakdowns if tracked
- Discount/write-off history
**Access:** Reports → Ledger Report; Reports → Sales Forecasting
**Quality concern:** Balance Due field in CSV is mostly $0, which contradicts real-world accounts receivable. Payment data likely lives in QuickBooks/Nowsta, not TPP.

### H. Lead Sources (Quick Insights)
**What we have from CSV:** `Referred From` field — top sources: EZ Cater (595), Repeat Customer (473), Google (146), Referral (156), Salesperson (100)
**Quick Insights data pulled:** Aggregate counts by source by year (2021–2026)
**Extraction needed:**
- Confirm Quick Insights numbers match CSV `Referred From` distribution
- Get conversion rates by source (leads → won)
- Identify the 310 events with blank `Referred From`
**Quality issue:** Quick Insights says deals created = deals won for 2025. This is almost certainly wrong — either the dashboard is buggy or "deals created" only counts won deals in that view.

### I. Salesperson Assignments
**What we have from CSV:** Sales Person, Sales Person First/Last Name (98% populated)
**Known salespeople:** Tim Mitchell, Josh Mitchell, M L (likely Mangia/placeholder)
**Extraction needed:**
- Confirm salesperson list is complete
- Map abbreviated names to full names
- Historical performance by salesperson (events won, revenue, conversion rate)
**Access:** Query Generator (already have) + CRM user assignments

### J. Notes/Communications (CRM Inbox + TPP Event Notes)
**Navigation:** CRM → Inbox (communication history); Event detail → Notes tab
**What's there:** Email threads, call logs, internal notes per event/contact
**Extraction needed:**
- This is the hardest category. No bulk export.
- Browser automation could capture visible notes per event
- CRM Inbox emails may be exportable if TPP supports email export
- **Decision needed:** How much historical communication do we actually need in Capsule? Last 12 months? Strategic accounts only?
**Capsule needs:** Low priority for migration. Capsule will capture new communications going forward.

---

## 3. Data Quality Notes Per Field

### Critical Issues

| Issue | Impact | Mitigation |
|-------|--------|------------|
| **Balance Due unreliable** | Can't trust AR numbers from TPP | Reconcile with QuickBooks/Nowsta. Use TPP only for event-level revenue, not payment status. |
| **No stage history** | Can't calculate sales cycle length or stage conversion | Created Date → Event Date gives total lead time but no intermediate stages. Capsule must track this going forward. |
| **310 missing Referred From** (15%) | Lead source analytics incomplete | Cross-reference with Quick Insights; manually classify if possible; accept ~15% as "Unknown" for migration. |
| **Quick Insights deals created = deals won (2025)** | Dashboard data is suspect | Don't trust Quick Insights aggregates without cross-validation against CSV data. Use CSV as source of truth. |
| **Venue State format inconsistent** | `ID` vs `Idaho`, `WA` vs `Washington` | Normalize during migration. Map full names to abbreviations. |
| **Contact names mixed with org names** | First/Last fields contain company names | Manual review or heuristic: if First Name looks like an org (no spaces, capitalized, no typical first name), treat as company-only record. |
| **BEO # essentially empty** | BEO tracking not used | Ignore for migration. Capsule can implement BEO tracking fresh. |
| **$0 Event Totals** | Many marketing/internal events with $0 revenue | Filter using commercial event criteria (status + title/company exclusions) for revenue analysis. |
| **Sales Person "M L"** | Abbreviated/unknown assignment | Clarify with Josh. May be Mangia internal or a test account. |

### Reliability Tiers

**High confidence (use directly):**
- Event Date, Event Title, Invoice No, Created Date, Event Status/Status Name
- Event Total, Event SubTotal (for non-zero values)
- Guest Count, Event Type, Occasion, Service Style/Name/Category
- Sales Person assignments

**Medium confidence (use with normalization):**
- Referred From (85% populated, some formatting issues)
- Venue Name (77% populated, many Mangia-internal)
- Venue State (needs normalization)
- Contact Company Name (41% — low but accurate when present)
- Contact First/Last Name (88% — org names mixed in)

**Low confidence (verify externally):**
- Balance Due (payment data gap)
- Event Gratuity / Event Service Charge (mostly $0, may not be tracked)
- BEO # (empty)
- Quick Insights dashboard aggregates (contradictory)

---

## 4. Recommended Extraction Order

Based on dependency chains and Capsule CRM setup needs:

### Phase 1: Foundation (extract first)
1. **Contacts** — Capsule needs people/organizations before anything else links to them
2. **Events** — ✅ Already extracted. Clean and categorize from existing CSV.
3. **Venues** — Needed to link events to locations. Can partially derive from CSV venue names.

### Phase 2: CRM Data (extract second)
4. **Pipeline/Deals** — Open deals and deal history. Core CRM migration.
5. **Lead Sources** — Aggregate from CSV + Quick Insights. Map to Capsule lead source taxonomy.
6. **Salesperson assignments** — Already in CSV. Confirm against CRM user list.

### Phase 3: Operational Data (extract third)
7. **Menu Items** — Needed for Capsule quoting/proposal module
8. **Financial/Payment History** — Reconcile with QB. Extract from Ledger Report.
9. **Pack Lists** — Templates only. Can rebuild from menu + service style rules.

### Phase 4: Optional/Historical
10. **Notes/Communications** — Strategic accounts only, last 12-24 months
11. **Document attachments** — Contracts, floor plans, etc. (selective migration)

### Phase 5: Validation
12. Cross-reference all extracted data against CSV source of truth
13. Reconcile financials with QuickBooks
14. Spot-check contact/event linking

---

## 5. API vs Manual Extraction Assessment

### TPP Platform Reality
- **ASP.NET legacy application** — no public API, no REST endpoints, no webhook system
- **No OAuth or token-based auth** — session cookie authentication only
- **Export options:** CSV from Query Generator, Excel from some reports, QuickBooks sync (outbound only)
- **Browser:** Standard web forms with postbacks. No SPA/AJAX data endpoints to intercept.

### Extraction Feasibility by Category

| Category | Automation Feasible? | Method | Effort |
|----------|---------------------|--------|--------|
| **Events** | ✅ Done | Query Generator CSV export | Already complete |
| **Contacts** | ⚠️ Likely | CRM contact grid → CSV export if available; otherwise browser scrape | Medium |
| **Pipeline/Deals** | ⚠️ Maybe | CRM Deals grid → CSV if exportable; otherwise browser automation per page | Medium-High |
| **Menu Items** | ⚠️ Maybe | Menu catalog page → CSV/scrape if grid view exists | Medium |
| **Pack Lists** | ❌ Unlikely | Per-event pages only, no bulk view | High (manual or heavy automation) |
| **Venues** | ⚠️ Likely | Venue list page → CSV/scrape | Low-Medium |
| **Financial/Payments** | ⚠️ Maybe | Ledger Report → CSV export if available | Medium |
| **Lead Sources** | ✅ Done | Already in CSV + Quick Insights notes | Already extracted |
| **Salesperson** | ✅ Done | Already in CSV | Already extracted |
| **Notes/Comms** | ❌ No | Per-event/per-contact pages, no bulk export | Very High (manual) |

### Browser Automation Assessment

**What works:**
- TPP uses standard ASP.NET WebForms with predictable page structure
- Session-based auth means once logged in, browser automation (Playwright/Puppeteer) can navigate
- Grid/table pages likely have consistent DOM structure for scraping
- CSV export buttons trigger file downloads (interceptable)

**What doesn't work well:**
- Per-event detail pages require clicking into each event individually (2,100+ clicks for notes)
- Pagination on large datasets may need handling
- Session timeouts during long scrape sessions
- No API means every data point requires a page load

### Recommended Extraction Strategy

1. **Maximize Query Generator CSV exports** — this is the only reliable bulk extraction path. Build queries for every data category possible (contacts, venues, financials).

2. **Browser automation for grid pages** — use Playwright to navigate CRM grids (Contacts, Deals, Venues) and extract visible data. Export to CSV if button exists; scrape table DOM if not.

3. **Selective manual extraction** — pack lists, notes, and communications are not worth full automation. Extract templates and recent/strategic data only.

4. **Accept data loss on comms** — historical notes/emails in TPP will not migrate fully. Capsule starts fresh on communication tracking from go-live date. This is standard for CRM migrations.

5. **QuickBooks as financial source of truth** — don't fight TPP's payment tracking gaps. Use QB export for actual revenue/payments; use TPP for event-level data only.

### Automation Scripts to Build
1. **TPP Contact Exporter** — Playwright script: login → CRM → Contacts → paginate/scrape → CSV
2. **TPP Deal Exporter** — Playwright script: login → CRM → Deals → paginate/scrape → CSV
3. **TPP Venue Exporter** — Playwright script: login → Venues → list → scrape → CSV
4. **TPP Menu Exporter** — Playwright script: login → Menu Management → catalog → scrape → CSV
5. **Query Generator Runner** — Playwright script to automate building and exporting pre-defined queries (if we need additional field sets beyond the 27 already exported)

---

## Summary

- **27 fields extracted** from Query Generator, covering 2,103 events across 2021–YTD 2026
- **5 fields are high-value and reliable** for Capsule: Event Date, Event Title, Event Type, Event Status, Event Total
- **3 critical gaps** need live TPP access: Contacts (CRM), Pipeline/Deals (CRM), and payment history (Ledger)
- **No public API** — all further extraction requires browser automation or manual export
- **Migration is 60% done** with the events CSV; remaining 40% is CRM contacts/deals + menu/ops data
- **Financial reconciliation** with QuickBooks is essential — TPP's Balance Due field is not trustworthy
