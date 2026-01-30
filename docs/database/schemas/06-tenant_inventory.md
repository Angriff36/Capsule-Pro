# tenant_inventory Schema

## Purpose

The `tenant_inventory` schema provides comprehensive inventory management capabilities for catering operations. It tracks physical items, stock levels across locations, transactions for audit trails, supplier relationships, purchase orders, and receiving workflows. The schema enables real-time inventory visibility, automated reorder suggestions, demand forecasting, and cycle counting for accuracy.

## Goals

- **Stock Visibility**: Real-time tracking of inventory quantities across multiple storage locations
- **Automated Ordering**: Reorder suggestions based on historical usage, events, and lead times
- **Demand Forecasting**: Predict future inventory needs using historical data, event schedules, and seasonality
- **Supplier Management**: Track vendor relationships, payment terms, and performance
- **Purchase Orders**: Streamline ordering workflow from draft to receipt
- **Cycle Counting**: Maintain inventory accuracy through regular physical counts and variance tracking
- **Traceability**: Track items from receipt through usage, including lot numbers and expiration dates
- **Cost Control**: Monitor unit costs, transaction values, and waste

## Rules

### Stock Level Management

- Every `InventoryItem` must have a unique `item_number` per tenant
- Stock levels tracked per location via `InventoryStock` (unique constraint on `tenantId + itemId + storageLocationId`)
- `quantity_on_hand` in `InventoryItem` represents aggregate across all locations
- `reorder_level` triggers `ReorderSuggestion` generation when stock falls below threshold
- Unit costs tracked as `Decimal(10, 2)` for items, `Decimal(10, 4)` for purchase orders (higher precision)

### Transaction Tracking

- All stock movements must create `InventoryTransaction` records
- `transactionType` categorizes movements: purchase, sale, adjustment, waste, transfer, production, consumption
- Transactions include reference linking (e.g., event_id, task_id) for traceability
- `reason` field mandatory for all adjustments
- `employee_id` tracks who performed the transaction

### FIFO/LIFO and Expiration

- `ShipmentItem` tracks `lotNumber` and `expirationDate` for perishable items
- No enforced FIFO/LIFO at database level (application selects lots based on business rules)
- `InventoryStock` tracks `last_counted_at` for cycle counting intervals

### Cycle Counting

- `CycleCountSession` organizes counts by location and date
- Count types: `ad_hoc`, `scheduled`, `full`, `partial`
- `status` workflow: `draft` → `in_progress` → `completed` → `finalized`
- Records not verified until `isVerified = true` and `verifiedById` set
- `VarianceReport` auto-generated from `CycleCountRecord` differences
- `CycleCountAuditLog` tracks all actions for compliance

### Purchase Orders

- `PurchaseOrder` status workflow: `draft` → `submitted` → `approved` → `received` (or `cancelled`)
- `poNumber` unique per tenant (auto-generated)
- `PurchaseOrderItem` tracks ordered vs received quantities with discrepancy handling
- Quality checks via `qualityStatus`: `pending`, `approved`, `rejected`
- Links to `InventorySupplier` (vendor) and `Location` (delivery destination)

### Supplier Management

- `InventorySupplier` requires unique `supplier_number` per tenant
- Payment terms default to `NET_30`
- `Shipment` links suppliers to actual deliveries
- Support for multiple contact methods and tags for categorization

### Forecasts and Alerts

- `InventoryForecast` stores daily predictions with confidence intervals
- `ForecastInput` captures historical usage, events, promotions, seasonality factors
- `ReorderSuggestion` calculated from forecasts, lead times, and safety stock levels
- `InventoryAlert` triggered by thresholds (low stock, overstock, expiration, waste)
- `AlertsConfig` defines notification channels (email, SMS, webhook)

## Decisions

### Why Cycle Counting vs Annual Physical Counts?

- **Tradeoff**: Cycle counting requires more effort but provides continuous accuracy
- **Decision**: Support both cycle counting (scheduled location rotations) and ad-hoc counts
- **Rationale**: Catering has high transaction volume; waiting for annual counts leads to costly inaccuracies
- **Implementation**: `CycleCountSession` with flexible `countType`, `VarianceReport` for reconciliation

### Why Separate InventoryStock from InventoryItem?

- **Tradeoff**: More complex queries vs simpler denormalized design
- **Decision**: Track stock per location in `InventoryStock`, aggregate on `InventoryItem`
- **Rationale**: Catering operations span multiple kitchens, trucks, off-site venues
- **Benefit**: Enables location-level reporting (e.g., "par levels by kitchen")

### Why Flexible Forecasting?

- **Tradeoff**: Complex forecasting logic vs simple reorder point rules
- **Decision**: Store forecast inputs (events, promotions, seasonality) separate from predictions
- **Rationale**: Catering demand highly variable; events drive usage patterns
- **Benefit**: Can re-run forecasts as new information arrives without losing context

### Why Shipment Model Separate from Purchase Orders?

- **Tradeoff**: Extra join vs single table
- **Decision**: `Shipment` independent of `PurchaseOrder` for flexibility
- **Rationale**: Not all inventory comes through POs (donations, transfers, customer returns)
- **Benefit**: Supports complex supply chains while maintaining PO workflow

### Why Bulk Combine Rules in tenant_kitchen?

- **Tradeoff**: Cross-schema dependency vs duplication
- **Decision**: `bulk_combine_rules` lives in `tenant_kitchen` but references inventory items
- **Rationale**: Recipe consolidation is a kitchen concern, not pure inventory
- **Note**: This creates a cross-schema dependency handled at application layer

## Relations

### Internal to tenant_inventory

- `InventoryItem` ← `InventoryStock` (1:N) - stock levels per location
- `InventoryItem` ← `InventoryTransaction` (1:N) - movement history
- `InventoryItem` ← `InventoryAlert` (1:N) - threshold alerts
- `InventoryItem` ← `ShipmentItem` (1:N) - receiving records
- `InventoryStock` ← `storage_locations` (N:1 via `location_id`) - physical locations
- `CycleCountSession` ← `CycleCountRecord` (1:N) - count records per session
- `CycleCountRecord` ← `VarianceReport` (1:1) - reconciliation reports
- `CycleCountSession` ← `CycleCountAuditLog` (1:N) - audit trail
- `PurchaseOrder` ← `PurchaseOrderItem` (1:N) - order line items
- `Shipment` ← `ShipmentItem` (1:N) - shipment line items
- `InventorySupplier` ← `Shipment` (1:N) - supplier deliveries
- `InventorySupplier` ← `PurchaseOrder` (1:N via `vendorId`) - supplier orders

### Cross-Schema Relations

#### tenant_kitchen

- `InventoryItem` → `RecipeIngredient` (items used in recipes)
- `InventoryTransaction` → `KitchenTask` (production/consumption)
- `Shipment` → `Location` (delivery to kitchens)
- `storage_locations` → `Location` (linked to kitchen locations)

#### tenant_events

- `Shipment` → `Event` (event-specific deliveries)
- `InventoryTransaction` → `Event` (event consumption)
- `ForecastInput` includes event schedules for demand planning

#### public

- All tables → `Account` (tenant isolation via `tenantId`)
- `InventoryItem` → `WasteEntry` (waste tracking)

## Lifecycle

### Item Creation

1. Create `InventoryItem` with `item_number`, `name`, `category`, `unitCost`
2. Set initial `quantityOnHand` (usually 0)
3. Set `reorder_level` for automated reorder suggestions
4. (Optional) Configure FSA status for regulated items

### Stock Receipt

1. Create `PurchaseOrder` (draft status)
2. Add `PurchaseOrderItem` lines with quantities and unit costs
3. Submit PO (`status: submitted`)
4. When received, create `Shipment` linked to PO
5. Add `ShipmentItem` records with actual received quantities
6. Create `InventoryTransaction` (type: `purchase`) to increase stock
7. Update `InventoryStock.quantity_on_hand` for each location
8. Mark `PurchaseOrder.status: received`

### Stock Usage

1. Kitchen task consumes item → create `InventoryTransaction` (type: `consumption`)
2. Decrease `InventoryStock.quantity_on_hand`
3. Decrease `InventoryItem.quantityOnHand` (aggregate)
4. If below `reorder_level`, generate `ReorderSuggestion`

### Cycle Counting

1. Create `CycleCountSession` with `locationId` and `scheduledDate`
2. Generate `CycleCountRecord` for items at that location (expected quantities)
3. Staff counts items → update `countedQuantity`
4. Calculate `variance = countedQuantity - expectedQuantity`
5. Verify count (`isVerified: true`, `verifiedById`)
6. Finalize session (`status: finalized`)
7. Auto-generate `VarianceReport` for items with variance > threshold
8. Apply adjustments via `InventoryTransaction` (type: `adjustment`)
9. Update `InventoryStock.quantity_on_hand` to actual counted values

### Forecasting and Reordering

1. Aggregate `InventoryTransaction` history for usage patterns
2. Pull upcoming events from `ForecastInput.events`
3. Apply seasonality factors
4. Generate `InventoryForecast` for future dates (with confidence intervals)
5. Calculate `ReorderSuggestion`:
   - `reorder_point = (avg_daily_usage * lead_time_days) + safety_stock`
   - `recommended_order_qty = (forecast - current_stock) + safety_stock`
6. Trigger `InventoryAlert` if stock falls below threshold
7. Create `PurchaseOrder` from suggestions

## Performance

### Indexes

**Hot Paths:**

- `inventory_transactions_tenant_date_idx` - transaction history queries (dashboard metrics)
- `inventory_stock_tenant_item_location_idx` - stock lookups by location
- `cycle_count_sessions_tenant_location_status_idx` - active count sessions
- `purchase_orders_tenant_status_idx` - open orders list
- `forecasts_tenant_sku_date_idx` - forecast retrieval for planning
- `shipment_items_shipment_idx` - receiving workflow
- `variance_reports_tenant_status_idx` - pending adjustments

**Compound Index Strategy:**

- Most queries filter by `tenantId` first (isolation)
- Second filter typically: date range, item SKU, location, or status
- Indexes designed for dashboard queries (last 30 days, low stock, pending actions)

### Query Patterns

**Dashboard Metrics:**
```sql
-- Stock value by location
SELECT location_id, SUM(quantity_on_hand * unit_cost)
FROM inventory_stock
JOIN inventory_items ON inventory_stock.itemId = inventory_items.id
WHERE inventory_stock.tenantId = ? AND deletedAt IS NULL
GROUP BY location_id

-- Low stock alerts
SELECT * FROM inventory_alerts
WHERE tenantId = ? AND resolved_at IS NULL
AND alertType IN ('low_stock', 'overstock', 'expiration')
```

**Transaction History:**
```sql
-- Movement history for item
SELECT * FROM inventory_transactions
WHERE tenantId = ? AND itemId = ?
AND transaction_date >= (NOW() - INTERVAL '30 days')
ORDER BY transaction_date DESC
```

**Cycle Count Progress:**
```sql
-- Session status with item counts
SELECT s.*, COUNT(r.id) as items_counted, SUM(CASE WHEN r.isVerified THEN 1 ELSE 0 END) as items_verified
FROM cycle_count_sessions s
LEFT JOIN cycle_count_records r ON s.id = r.sessionId
WHERE s.tenantId = ? AND s.status IN ('draft', 'in_progress')
GROUP BY s.id
```

### N+1 Query Risks

**Fetching stock for all items:**
- ❌ Bad: Query items, then N queries for stock per item
- ✅ Good: Single query with JOIN or separate queries with `IN` clause

**Cycle count records:**
- ❌ Bad: Fetch sessions, then N queries per session for records
- ✅ Good: Fetch records with `sessionId IN (...)`, group in application

**Purchase orders with items:**
- ❌ Bad: Fetch POs, then N queries per PO for line items
- ✅ Good: Fetch items with `purchaseOrderId IN (...)`

## TODOs

### High Priority

- [ ] Add `InventoryStock.triggered_at` to track when low stock alerts fired
- [ ] Implement lot number selection logic (FIFO/FEFO) in application layer
- [ ] Add `InventoryTransaction.cost_adjustment` type for value corrections
- [ ] Create `InventoryItem.template` flag for reusable item definitions

### Medium Priority

- [ ] Add `StorageLocation.capacity` and `capacity_utilization` metrics
- [ ] Implement `PurchaseOrder.approval_workflow` with multi-level approvals
- [ ] Add `Shipment.carrier_tracking_api` integration
- [ ] Create `InventoryItem.substitutes` relation for alternate items

### Low Priority

- [ ] Add `InventorySupplier.performance_rating` from PO history
- [ ] Implement `ForecastInput.actual` vs `ForecastInput.predicted` comparison
- [ ] Create `CycleCountSession.reconciliation_status` for variance approval
- [ ] Add `InventoryItem.images` for visual identification during counts

### Technical Debt

- [ ] Move `bulk_combine_rules` from `tenant_kitchen` to `tenant_inventory` for consistency
- [ ] Standardize `item_id` vs `itemId` naming (currently mixed)
- [ ] Add `InventoryTransaction.batch_id` for bulk import transactions
- [ ] Consider materialized view for dashboard metrics (current stock value, low stock count)

## Schema Diagram

```
tenant_inventory
│
├── Core Item Management
│   ├── InventoryItem (catalog of all items)
│   ├── InventoryStock (quantities per location)
│   └── storage_locations (physical storage areas)
│
├── Movement Tracking
│   ├── InventoryTransaction (audit trail of all movements)
│   ├── Shipment (deliveries from suppliers)
│   └── ShipmentItem (line items per shipment)
│
├── Supplier Management
│   ├── InventorySupplier (vendor catalog)
│   ├── PurchaseOrder (ordering workflow)
│   └── PurchaseOrderItem (order line items)
│
├── Cycle Counting
│   ├── CycleCountSession (organize counts)
│   ├── CycleCountRecord (individual item counts)
│   ├── VarianceReport (reconciliation reports)
│   └── CycleCountAuditLog (audit trail)
│
└── Intelligence
    ├── InventoryForecast (demand predictions)
    ├── ForecastInput (historical data + context)
    ├── ReorderSuggestion (automated ordering)
    ├── InventoryAlert (threshold notifications)
    └── AlertsConfig (notification routing)
```

## Notes

- **Multi-tenant**: All tables include `tenantId` with indexes for isolation
- **Soft Deletes**: Tables use `deletedAt` (filter with `WHERE deletedAt IS NULL`)
- **Audit Trail**: All tables have `createdAt`, `updatedAt` timestamps
- **ID Strategy**: UUIDs generated via `gen_random_uuid()` PostgreSQL function
- **Decimal Precision**: Varies by use case (10,2 for costs, 12,3 for quantities)
- **Cross-Schema**: `bulk_combine_rules` lives in `tenant_kitchen` but used by inventory
- **Event Integration**: Shipments and transactions can link to `Event` for catering-specific tracking
- **Kitchen Integration**: Recipes consume inventory items; production tasks increase stock
