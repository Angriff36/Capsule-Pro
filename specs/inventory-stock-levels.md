# Real-time Stock Level Tracking

## Outcome
The system tracks current inventory levels with automatic updates from usage, receiving, and adjustments. Users can see current quantity, par levels, and reorder status for all inventory items.

## In Scope
- Track current quantity on hand for each inventory item
- Automatically update stock levels when items are used (events, waste, adjustments)
- Automatically update stock levels when items are received
- Display par levels and reorder points for each item
- Show reorder status (below par, at par, above par)
- Maintain stock level history for audit purposes
- Support multiple locations/warehouses with location-specific stock levels

## Out of Scope
- Automatic reorder generation or purchase order creation
- Integration with supplier systems for automatic receiving
- Stock level forecasting or predictions
- Barcode scanning for stock updates

## Invariants / Must Never Happen
- Stock levels must never go negative without explicit adjustment reason
- Stock updates must never be lost; all usage, receiving, and adjustments must be recorded
- Stock levels must never be updated without corresponding transaction record
- Par levels must never be set below zero
- Stock levels must never be modified by users without proper permissions
- Stock level calculations must never be incorrect due to race conditions or concurrent updates

## Acceptance Checks
- Use inventory item for event → stock level decreases automatically
- Receive inventory items → stock level increases automatically
- View inventory item → shows current quantity, par level, and reorder status
- Adjust stock level → change is recorded with reason and user
- View stock below par level → reorder status indicates need to reorder
- Multiple users update stock simultaneously → all updates applied correctly
