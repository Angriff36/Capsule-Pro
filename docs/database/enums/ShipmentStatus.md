# ShipmentStatus

> **First documented**: 2025-01-30
> **Last updated**: 2025-01-30
> **Last verified by**: spec-executor (T032)
> **Verification status**: ✅ Verified

## Overview

Defines the lifecycle status of inventory shipments, tracking from draft creation through delivery or cancellation.

**Business Context**: Inventory management requires tracking shipments from suppliers to understand stock in-transit, predict arrival times, and manage receiving workflows.

**Key Use Cases**:
- Track expected delivery dates for inventory planning
- Filter shipments by status (show only in-transit shipments)
- Calculate lead times from suppliers
- Trigger stock updates when shipments delivered
- Monitor delayed or missing shipments

**Lifecycle**: `draft` → `scheduled` → `preparing` → `in_transit` → `delivered` (or `cancelled`/`returned`)

## Schema Reference

```prisma
enum ShipmentStatus {
  draft
  scheduled
  preparing
  in_transit
  delivered
  returned
  cancelled

  @@schema("core")
}
```

**PostgreSQL Type**: `core.shipment_status`
**Database Location**: `core` schema (shared across all tenants)
**Mutability**: Immutable (adding values requires migration)

## Values

| Value | Description | When to Use | Business Rules |
|-------|-------------|-------------|----------------|
| `draft` | Shipment created but not finalized | Initial creation, adding items, reviewing | Can be edited, not yet communicated to supplier |
| `scheduled` | Shipment scheduled with supplier | Supplier confirmed, awaiting preparation | Editable with restrictions, scheduled date set |
| `preparing` | Supplier is preparing shipment | Supplier actively picking/packing items | Limited edits, expected ship date known |
| `in_transit` | Shipment picked up and en route | Left supplier facility, tracking active | Immutable items, tracking number required |
| `delivered` | Shipment received and processed | Goods received into inventory | Immutable, triggers stock level updates |
| `returned` | Shipment returned to supplier | Goods rejected or wrong items received | Immutable, tracks returns for credit |
| `cancelled` | Shipment cancelled before delivery | Order cancelled with supplier | Immutable, no items received |

## Status Flow

```
    ┌─────────┐
    │  draft  │  ← Initial state
    └────┬────┘
         │
         │ (finalize with supplier)
         ▼
    ┌────────────┐
    │ scheduled  │
    └────┬───────┘
         │
         │ (supplier begins prep)
         ▼
    ┌────────────┐
    │ preparing  │
    └────┬───────┘
         │
         │ (shipped)
         ▼
    ┌────────────┐
    │ in_transit │  ← Tracking active
    └──────┬─────┘
           │
           │ (received or returned)
      ┌────┴────┐
      │         │
      ▼         ▼
  ┌──────────┐ ┌─────────┐
  │ delivered│ │ returned│  ← End states
  └──────────┘ └─────────┘

      ┌───────────┐
      │ cancelled │  ← Can cancel from draft/scheduled/preparing
      └───────────┘
```

## Business Rules

1. **State Transitions**:
   - `draft` → `scheduled`: Shipment finalized with supplier
   - `scheduled` → `preparing`: Supplier confirms preparation started
   - `preparing` → `in_transit`: Supplier ships, tracking available
   - `in_transit` → `delivered`: Goods received into inventory
   - `in_transit` → `returned`: Goods rejected/returned
   - `draft`/`scheduled`/`preparing` → `cancelled`: Cancel before shipping

2. **Edit Restrictions**:
   - `draft`: Fully editable (items, quantities, supplier)
   - `scheduled`: Limited edits (may require supplier approval)
   - `preparing`: Minimal edits (critical corrections only)
   - `in_transit` onwards: Immutable

3. **Inventory Impact**:
   - `delivered` triggers stock increase for all shipment items
   - `returned` does NOT increase stock (tracks return for credit)
   - `cancelled` has no inventory impact

4. **Required Fields by Status**:
   - `scheduled`: `expectedShipAt`, `expectedDeliveryAt` required
   - `in_transit`: `trackingNumber`, `actualShipAt` required
   - `delivered`: `actualDeliveryAt` required
   - `returned`: `returnReason`, `returnedAt` required

## Usage in Shipment Model

```typescript
import { Shipment, ShipmentStatus } from '@repo/database/generated'

// Create draft shipment
const draftShipment = await database.shipment.create({
  data: {
    tenantId,
    supplierId: supplierId,
    status: ShipmentStatus.draft,
    items: {
      create: [
        { inventoryItemId: item1, quantity: 100 },
        { inventoryItemId: item2, quantity: 50 }
      ]
    }
  }
})

// Finalize with supplier (transitions to scheduled)
const scheduledShipment = await database.shipment.update({
  where: { id: shipmentId },
  data: {
    status: ShipmentStatus.scheduled,
    expectedShipAt: new Date('2025-02-01'),
    expectedDeliveryAt: new Date('2025-02-05')
  }
})

// Mark as in transit (supplier shipped)
const inTransitShipment = await database.shipment.update({
  where: { id: shipmentId },
  data: {
    status: ShipmentStatus.in_transit,
    trackingNumber: '1Z999AA1 trackingnumber',
    actualShipAt: new Date()
  }
})

// Receive shipment (delivered)
await database.$transaction(async (tx) => {
  // Update shipment status
  await tx.shipment.update({
    where: { id: shipmentId },
    data: {
      status: ShipmentStatus.delivered,
      actualDeliveryAt: new Date()
    }
  })

  // Increase stock for all items
  const shipmentItems = await tx.shipmentItem.findMany({
    where: { shipmentId }
  })

  for (const item of shipmentItems) {
    await tx.inventoryStock.update({
      where: {
        tenantId_inventoryItemId: {
          tenantId,
          inventoryItemId: item.inventoryItemId
        }
      },
      data: {
        quantityOnHand: { increment: item.quantityReceived }
      }
    })
  }
})
```

## Common Queries

### Get in-transit shipments (for receiving dashboard)
```typescript
const inTransitShipments = await database.shipment.findMany({
  where: {
    tenantId,
    status: ShipmentStatus.in_transit
  },
  include: {
    supplier: true,
    items: {
      include: { inventoryItem: true }
    }
  },
  orderBy: { expectedDeliveryAt: 'asc' }
})
```

### Get overdue shipments (alert condition)
```typescript
const overdueShipments = await database.shipment.findMany({
  where: {
    tenantId,
    status: { in: [ShipmentStatus.in_transit, ShipmentStatus.preparing] },
    expectedDeliveryAt: { lt: new Date() }
  }
})
```

### Track supplier performance
```typescript
const supplierPerformance = await database.shipment.groupBy({
  by: ['supplierId'],
  where: {
    tenantId,
    status: ShipmentStatus.delivered,
    actualDeliveryAt: { not: null }
  },
  _avg: {
    actualDeliveryAt: true,
    expectedDeliveryAt: true
  }
})
```

## Related Tables

- **[Shipment](../tables/tenant_inventory/Shipment.md)** - Main shipment model
- **[ShipmentItem](../tables/tenant_inventory/ShipmentItem.md)** - Shipment line items
- **[InventoryStock](../tables/tenant_inventory/InventoryStock.md)** - Updated on delivery
- Schema: [`tenant_inventory`](../schemas/06-tenant_inventory.md)
- Schema: [`core`](../schemas/01-core.md)

## See Also

- Process: Purchase order to shipment to inventory receiving
- Integration: Supplier tracking number integration
