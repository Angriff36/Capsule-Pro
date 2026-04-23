# Top 10 User Workflows — Capsule Pro

> End-to-end scenarios crossing multiple modules. Each workflow represents a realistic operational path a catering business follows daily.

---

## 1. Event Lead-to-Contract Lifecycle

**Modules touched:** CRM → Events → Menus → Contracts → Payments → Notifications

A prospective client submits an inquiry. The sales coordinator creates a client record in CRM, then initiates an event. AI-assisted event setup (via `ai-event-setup` manifest) pre-fills details from the inquiry. The coordinator builds a menu from the recipe catalog, attaches a pricing tier, and generates a quote. The client approves; the system creates an event contract with signature tracking. A payment schedule is generated automatically. All parties receive notifications at each stage transition.

**Key state transitions:** Lead → Proposal → Contract → Confirmed → Deposited

---

## 2. Event Day Kitchen Execution

**Modules touched:** Events → Menus → Recipes → Prep Tasks → Kitchen Command Board → Inventory → Staffing

On event day, the head chef opens the Kitchen Command Board (real-time via Ably). The prep list auto-generates from the event's menu and guest count. Each prep task has assigned staff, ingredient pull quantities, and time targets. As tasks complete, the command board updates in real time — mobile kitchen staff see status on their devices. Ingredient quantities are reserved against inventory. Any last-minute menu change (e.g., allergy substitution) triggers a recalculation of prep tasks and inventory reservations.

**Key state transitions:** Prep List Generated → Tasks Assigned → In Progress → Completed → Service Ready

---

## 3. Inventory Procurement Cycle

**Modules touched:** Inventory → Procurement → Vendors → Purchase Orders → Warehouse → Notifications

The kitchen reports low stock on critical ingredients. The inventory module flags items below reorder thresholds and generates requisitions. The procurement coordinator reviews, selects vendors (via `supplier-connectors`), and creates purchase orders. POs route through approval workflows. Upon vendor confirmation, expected delivery dates populate the warehouse receiving queue. When goods arrive, warehouse staff receive against the PO, updating inventory levels. Alerts fire if received quantities don't match ordered quantities.

**Key state transitions:** Stock Alert → Requisition → PO Created → Approved → Ordered → Received → Stocked

---

## 4. Staff Scheduling & Time Tracking

**Modules touched:** Staffing → Scheduling → Availability → Time Off → Kitchen → Payroll

A scheduler views team availability (including time-off requests) and open shifts for the upcoming week. They assign staff to events and kitchen shifts, respecting certification requirements (e.g., food handler cards, alcohol service permits). Staff confirm shifts via mobile. On event day, staff clock in/out through time entry. Hours feed directly into payroll timecards. The scheduling module enforces labor budgets per event and alerts when approaching overtime thresholds.

**Key state transitions:** Shift Open → Assigned → Confirmed → Clocked In → Completed → Timecard Generated

---

## 5. Client Communication & Quote Revision

**Modules touched:** CRM → Events → Menus → Pricing → Email → Notifications → Collaboration

An existing client requests changes to their upcoming event — increase guest count from 100 to 150, add a vegan station. The coordinator updates the event record, adjusts menu items, and the system recalculates costs using recipe cost data and pricing tier rules. A revised quote is generated and sent via the email workflow system. The client replies through the collaboration workspace (administrative chat). Once approved, the updated menu triggers prep list regeneration and inventory reservation adjustments. All communication is logged against the event record for audit.

**Key state transitions:** Change Request → Quote Revised → Sent → Client Response → Approved → Downstream Updates

---

## 6. Multi-Event Weekend Logistics

**Modules touched:** Events → Logistics → Vehicles → Drivers → Routes → Staffing → Warehouse → Dispatch

Friday: three events on Saturday, two on Sunday. The logistics coordinator opens the dispatch view and sees all confirmed events. They assign vehicles and drivers, optimize delivery routes to minimize travel time between venues. Equipment and supply lists per event pull from warehouse stock — containers, linens, serving ware. Conflicts surface automatically (same driver assigned to overlapping events, insufficient chafing dishes). The coordinator resolves conflicts, publishes the dispatch plan. Drivers receive route details on mobile. After each event, equipment is checked back into warehouse.

**Key state transitions:** Events Confirmed → Dispatch Planned → Conflicts Resolved → Published → In Transit → Delivered → Returned

---

## 7. Financial Close & Invoice Generation

**Modules touched:** Events → Accounting → Payments → Invoices → Payroll → Analytics → Chart of Accounts

After an event completes, the finance team triggers the event report workflow. Revenue from the event is recognized against the chart of accounts. Labor costs pull from payroll timecards; ingredient costs from inventory consumption. The system generates an invoice for the client, applying any deposit credits. Payment status updates in real time. Monthly, the finance team reviews the sales reporting dashboard — revenue by event type, client profitability, food cost percentages. Discrepancies between quoted and actual costs feed into pricing tier adjustments.

**Key state transitions:** Event Completed → Costs Tallied → Invoice Generated → Sent → Payment Received → Revenue Recognized

---

## 8. Cycle Count & Inventory Reconciliation

**Modules touched:** Inventory → Warehouse → Cycle Counting → Procurement → Analytics

Weekly cycle count: the inventory manager assigns count zones to warehouse staff. Staff use the mobile scanner to count items in their assigned zones. Actual counts are compared against system quantities. Variances are flagged — some above threshold trigger immediate investigation (possible theft, spoilage, or receiving errors). Confirmed variances adjust inventory levels and generate waste entries where applicable. Procurement is notified if adjustments affect reorder points. The cycle count report feeds into kitchen analytics for food cost accuracy.

**Key state transitions:** Count Assigned → In Progress → Submitted → Variances Flagged → Investigated → Adjusted

---

## 9. Employee Onboarding & Certification Tracking

**Modules touched:** Staff → Training → Certifications → Scheduling → Notifications

A new hire joins the kitchen team. HR creates the employee record with role and department. Required training modules are auto-assigned based on role (food safety, allergen handling, equipment operation). The employee completes training through the training module. Upon completion, certifications are recorded with expiration dates. The scheduling module now considers this employee eligible for events requiring those certifications. Notifications fire 30/14/7 days before certification expiration, blocking assignment to events that require them if not renewed.

**Key state transitions:** Employee Created → Training Assigned → In Progress → Completed → Certified → Eligible for Assignment

---

## 10. Waste Tracking & Food Cost Optimization

**Modules touched:** Kitchen → Inventory → Waste Entry → Analytics → Recipes → Menus

After each service, kitchen staff log waste entries — spoiled ingredients, overproduction, plate waste, and trim loss. Each entry references the specific ingredient and reason code. The analytics module aggregates waste data weekly, surfacing patterns (e.g., "30% of basil waste is spoilage — reduce standing order"). Recipe cost calculations are updated based on actual yield data from waste tracking. The head chef reviews the kitchen analytics dashboard and adjusts prep quantities or menu items. High-waste recipes are flagged for revision. Cost savings are tracked month-over-month.

**Key state transitions:** Waste Logged → Categorized → Aggregated → Patterns Identified → Recipes/Orders Adjusted → Savings Tracked

---

## Module Cross-Reference

| Workflow | Events | Kitchen | Inventory | Staffing | Procurement | Logistics | CRM | Accounting | Payroll | Analytics | Notifications |
|----------|--------|---------|-----------|----------|-------------|-----------|-----|------------|---------|-----------|---------------|
| 1. Lead-to-Contract | ✅ | | | | | | ✅ | ✅ | | | ✅ |
| 2. Kitchen Execution | ✅ | ✅ | ✅ | ✅ | | | | | | | |
| 3. Procurement Cycle | | | ✅ | | ✅ | ✅ | | | | | ✅ |
| 4. Scheduling & Time | | ✅ | | ✅ | | | | | ✅ | | |
| 5. Quote Revision | ✅ | | | | | | ✅ | | | | ✅ |
| 6. Multi-Event Logistics | ✅ | | ✅ | ✅ | | ✅ | | | | | |
| 7. Financial Close | ✅ | | | | | | | ✅ | ✅ | ✅ | |
| 8. Cycle Count | | | ✅ | | ✅ | ✅ | | | | ✅ | |
| 9. Employee Onboarding | | | | ✅ | | | | | | | ✅ |
| 10. Waste Tracking | ✅ | ✅ | ✅ | | | | | | | ✅ | |
