# Outbound Shipment Tracking

## Outcome
The system tracks shipments to event sites with packing lists, delivery status, and confirmation. Shipments link to events and inventory movements for complete traceability.

## In Scope
- Create shipments linked to events with packing lists
- Track shipment status (prepared, in transit, delivered, returned)
- Record delivery confirmation with timestamp and recipient
- Update inventory levels when shipments are prepared and delivered
- Generate packing lists with items and quantities
- Support multiple shipments per event

## Out of Scope
- Integration with shipping carriers for automatic tracking
- Route optimization or delivery scheduling
- Shipment approval workflows
- Historical shipment analysis or reporting

## Invariants / Must Never Happen
- Shipments must never be created for items not in inventory
- Inventory levels must never be updated incorrectly during shipment process
- Shipment status must never move backward (e.g., delivered back to in transit) without explicit override
- Packing lists must never include items with insufficient stock
- Shipments must never be deleted if inventory was already updated
- Shipment confirmations must never be recorded without delivery verification

## Acceptance Checks
- Create shipment for event → packing list generated with required items
- Update shipment status → status changes, inventory updated appropriately
- Confirm delivery → status updated to delivered, timestamp recorded
- View shipment history → shows all shipments with status and details
- Attempt to ship unavailable items → error shown, shipment not created
- Prepare shipment → inventory levels decrease for shipped items
