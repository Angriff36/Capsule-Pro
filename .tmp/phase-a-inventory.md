# Phase A: Relationship Inventory — Prisma → Manifest Mapping

**Branch:** `feat/manifest-relationship-backfill`
**Date:** 2024-05-24
**Manifest version:** 0.8.1
**Prisma schema:** 6,385 lines, 224 models
**Manifest IR:** 130 entities, 0 existing relationship declarations

## Summary

| Category | Count | Can Backfill? |
|----------|-------|---------------|
| Tenant (→ Account) | 145 | No — Account is not a manifest entity |
| **Domain (both sides in manifest)** | **53** | **Yes** |
| Partial (one side missing) | 31 | No — needs missing entity added first |
| Orphan (neither side in manifest) | 9 | No — no manifest files to edit |
| **TOTAL** | **238** | |

## Domain Relations (53) — Backfillable NOW

Both source and target entities exist in the manifest IR. These are 47 belongsTo + 6 hasMany (parent-side).

### By Source Entity

**AdminChatParticipant (1)**
- `user` belongsTo User | FK:tenantId,userId ref:tenantId,id

**BudgetAlert (1)**
- `budget` belongsTo EventBudget | FK:budgetId ref:id onDelete:Cascade

**BudgetLineItem (1)**
- `budget` belongsTo EventBudget | FK:budgetId ref:id onDelete:Cascade

**Client (1)**
- `events` hasMany Event | (implicit parent side)

**CollectionAction (1)**
- `collectionCase` belongsTo CollectionCase | FK:collectionCaseId ref:id onDelete:Cascade

**CollectionCase (3)**
- `invoice` belongsTo Invoice | FK:invoiceId ref:id onDelete:Restrict
- `event` belongsTo Event | FK:eventTenantId,eventId ref:tenantId,id
- `client` belongsTo Client | FK:clientTenantId,clientId ref:tenantId,id

**CollectionPaymentPlan (1)**
- `collectionCase` belongsTo CollectionCase | FK:collectionCaseId ref:id onDelete:Cascade

**CommandBoardCard (2)**
- `board` belongsTo CommandBoard | FK:tenantId,boardId ref:tenantId,id onDelete:Cascade
- `group` belongsTo CommandBoardGroup | FK:tenantId,groupId ref:tenantId,id

**CommandBoardConnection (1)**
- `board` belongsTo CommandBoard | FK:tenantId,boardId ref:tenantId,id onDelete:Cascade

**CommandBoardGroup (2)**
- `board` belongsTo CommandBoard | FK:tenantId,boardId ref:tenantId,id onDelete:Cascade
- `cards` hasMany CommandBoardCard | (implicit parent side)

**ContractSignature (1)**
- `contract` belongsTo EventContract | FK:contractId,tenantId ref:id,tenantId onDelete:Cascade

**DocumentVersion (1)**
- `createdBy` belongsTo User | FK:createdById,tenantId ref:id,tenantId onDelete:Cascade

**Driver (1)**
- `vehicle` belongsTo Vehicle | FK:vehicleId ref:id onDelete:SetNull

**EmailWorkflow (1)**
- `emailTemplate` belongsTo EmailTemplate | FK:emailTemplateTenantId,emailTemplateId ref:tenantId,id onDelete:SetNull

**Event (1)**
- `client` belongsTo Client | FK:clientId ref:id onDelete:SetNull

**EventBudget (3)**
- `event` belongsTo Event | FK:eventId ref:id onDelete:Cascade
- `lineItems` hasMany BudgetLineItem | (implicit parent side)
- `alerts` hasMany BudgetAlert | (implicit parent side)

**EventContract (2)**
- `event` belongsTo Event | FK:eventId ref:id onDelete:Cascade
- `client` belongsTo Client | FK:clientId ref:id onDelete:Restrict

**EventReport (1)**
- `event` belongsTo Event | FK:eventId ref:id onDelete:Cascade

**InventoryItem (1)**
- `supplier` belongsTo InventorySupplier | FK:supplierId ref:id onDelete:SetNull

**InventorySupplier (1)**
- `shipments` hasMany Shipment | (implicit parent side)

**Invoice (2)**
- `client` belongsTo Client | FK:clientId ref:id onDelete:Restrict
- `event` belongsTo Event | FK:eventId ref:id onDelete:Restrict

**MenuDish (2)**
- `menu` belongsTo Menu | FK:tenantId,menuId ref:tenantId,id onDelete:Restrict
- `dish` belongsTo Dish | FK:tenantId,dishId ref:tenantId,id onDelete:Restrict

**Payment (3)**
- `invoice` belongsTo Invoice | FK:invoiceId ref:id onDelete:Restrict
- `event` belongsTo Event | FK:eventId ref:id onDelete:Restrict
- `client` belongsTo Client | FK:clientId ref:id onDelete:Restrict

**PaymentMethod (1)**
- `client` belongsTo Client | FK:clientId ref:id onDelete:Restrict

**PrepListItem (1)**
- `station` belongsTo Station | FK:stationId,tenantId ref:id,tenantId onDelete:Restrict

**Proposal (3)**
- `client` belongsTo Client | FK:clientId ref:id onDelete:SetNull
- `lead` belongsTo Lead | FK:leadId ref:id onDelete:SetNull
- `event` belongsTo Event | FK:eventId ref:id onDelete:SetNull

**ProposalLineItem (1)**
- `proposal` belongsTo Proposal | FK:proposalId,tenantId ref:id,tenantId onDelete:Cascade

**PurchaseOrderItem (1)**
- `purchaseOrder` belongsTo PurchaseOrder | FK:purchaseOrderId ref:id onDelete:Cascade

**PurchaseRequisitionItem (1)**
- `requisition` belongsTo PurchaseRequisition | FK:tenantId,requisitionId ref:tenantId,id onDelete:Cascade

**RevenueRecognitionLine (1)**
- `schedule` belongsTo RevenueRecognitionSchedule | FK:tenantId,scheduleId ref:tenantId,id onDelete:Cascade

**Shipment (2)**
- `event` belongsTo Event | FK:eventId ref:id onDelete:SetNull
- `supplier` belongsTo InventorySupplier | FK:supplierId ref:id onDelete:SetNull

**ShipmentItem (2)**
- `shipment` belongsTo Shipment | FK:shipmentId ref:id onDelete:Cascade
- `item` belongsTo InventoryItem | FK:itemId ref:id onDelete:Restrict

**Station (1)**
- `prepListItems` hasMany PrepListItem | (implicit parent side)

**TrainingAssignment (1)**
- `module` belongsTo TrainingModule | FK:tenantId,moduleId ref:tenantId,id

**VendorCatalog (1)**
- `supplier` belongsTo InventorySupplier | FK:supplierId,tenantId ref:id,tenantId

**WasteEntry (2)**
- `inventoryItem` belongsTo InventoryItem | FK:tenantId,inventoryItemId ref:tenantId,id onDelete:Restrict
- `event` belongsTo Event | FK:tenantId,eventId ref:tenantId,id onDelete:Cascade

**WorkOrder (1)**
- `equipment` belongsTo Equipment | FK:equipmentId,tenantId ref:id,tenantId onDelete:Cascade

### hasMany Parent-Side Relations (need matching belongsTo on child)

These 6 relations are the parent side — the child already has the FK field, we just need to declare both sides:

| Parent | Field | Target | Child FK field |
|--------|-------|--------|---------------|
| Client | events | Event | Event.clientId |
| CommandBoardGroup | cards | CommandBoardCard | CommandBoardCard.groupId |
| EventBudget | lineItems | BudgetLineItem | BudgetLineItem.budgetId |
| EventBudget | alerts | BudgetAlert | BudgetAlert.budgetId |
| InventorySupplier | shipments | Shipment | Shipment.supplierId |
| Station | prepListItems | PrepListItem | PrepListItem.stationId |

## Partial Relations (31) — Need Missing Entities

### Source in manifest, target NOT (10)

| Source | Field | Missing Target | FK |
|--------|-------|---------------|-----|
| User | payrollRole | **Role** | roleId,tenantId |
| User | department | **Department** | departmentId,tenantId |
| Event | location | **Location** | locationId |
| Event | venue | **Location** | venueId |
| Event | venueEntity | **Venue** | venueEntityId |
| Proposal | template | **ProposalTemplate** | templateId |
| CommandBoardGroup | projections | **BoardProjection** | (implicit) |
| Shipment | location | **Location** | locationId |
| AdminChatParticipant | thread | **AdminChatThread** | tenantId,threadId |
| WasteEntry | reason | **WasteReason** | reasonId |

### Source NOT in manifest, target IS (21)

These are orphan entities that reference domain entities. Adding manifest entities for the sources would unlock these.

## Incidental Classification

The **145 tenant relations** (→ Account) are structural multi-tenancy — every entity has a `tenantId` FK. `Account` is not a manifest entity. These are truly structural (like a WHERE clause filter) and should probably NOT be declared as manifest relationships — they'd add noise. The projection handles tenantId as a property, not a relationship.

The **10 partial source-in-manifest** relations above are candidates for future backfill once their target entities get manifests.

## Proposed Batch Order (Phase B)

Group by domain to minimize cross-batch dependencies:

1. **Batch 1 — Events & Budgets** (EventBudget, BudgetAlert, BudgetLineItem, EventContract, ContractSignature, EventReport, Event, Client) — 12 rels
2. **Batch 2 — Collections & Invoicing** (CollectionCase, CollectionAction, CollectionPaymentPlan, Invoice, Payment, PaymentMethod) — 10 rels
3. **Batch 3 — Kitchen & Prep** (Station, PrepListItem, MenuDish, Menu, Dish, WasteEntry, InventoryItem, InventorySupplier, Shipment, ShipmentItem) — 10 rels  
4. **Batch 4 — Command Boards** (CommandBoard, CommandBoardCard, CommandBoardGroup, CommandBoardConnection) — 5 rels
5. **Batch 5 — Procurement & Purchasing** (PurchaseOrderItem, PurchaseOrder, PurchaseRequisitionItem, PurchaseRequisition) — 2 rels
6. **Batch 6 — Remaining** (AdminChatParticipant, DocumentVersion, Driver, EmailWorkflow, Proposal, ProposalLineItem, TrainingAssignment, VendorCatalog, WorkOrder, RevenueRecognitionLine) — 14 rels
