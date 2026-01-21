# Receiving Workflow

## Outcome
The system provides a digital receiving process with PO matching, quantity verification, quality checks, and automatic inventory updates. The workflow reduces receiving errors and maintains inventory accuracy.

## In Scope
- Match received items to purchase orders
- Verify received quantities against ordered quantities
- Record quality checks and condition notes
- Update inventory stock levels automatically upon receiving confirmation
- Support partial receiving (receiving items in multiple shipments)
- Generate receiving reports and documentation

## Out of Scope
- Purchase order creation or management
- Integration with supplier systems for automatic receiving
- Barcode scanning for receiving
- Receiving approval workflows

## Invariants / Must Never Happen
- Inventory must never be updated without corresponding receiving record
- Received quantities must never exceed ordered quantities without explicit override
- Receiving records must never be deleted if inventory was already updated
- Stock levels must never be updated for items not in the purchase order
- Receiving must never be completed without quantity verification
- Partial receiving must never mark purchase order as complete prematurely

## Acceptance Checks
- Receive items matching PO → inventory updated automatically
- Receive partial shipment → PO shows remaining items to receive
- Verify quantities → system records received vs ordered quantities
- Complete receiving → inventory stock levels updated, receiving record created
- Attempt to receive items not in PO → error shown
- View receiving history → shows all receiving records with details
