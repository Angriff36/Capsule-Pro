# GoodShuffle Inventory Sync

## Outcome

The system maintains bi-directional sync with GoodShuffle Pro for inventory
data. Changes in either system are reflected in the other, reducing double-entry
and keeping systems aligned.

## In Scope

- Sync inventory items and stock levels between systems
- Handle sync conflicts (which system wins, or manual resolution)
- Support one-way or bi-directional sync configuration
- Log sync operations and errors

## Out of Scope

- GoodShuffle account setup or authentication
- Custom field mapping between systems
- Sync scheduling or frequency configuration
- Historical sync analysis or reporting

## Invariants / Must Never Happen

- Sync operations must never cause data loss in either system
- Sync conflicts must never be resolved automatically without user awareness
- Sync must never send data from one tenant to another tenant's GoodShuffle
  account
- Sync failures must never be ignored; must be logged and reported
- Sync operations must never block main application operations
- Bi-directional sync must never create infinite update loops

## Acceptance Checks

- Update inventory in Convoy → changes synced to GoodShuffle
- Update inventory in GoodShuffle → changes reflected in Convoy
- Sync conflict occurs → conflict resolution UI shown
- View sync logs → shows all sync operations and results
- Disable sync → no data synced while disabled
- Sync fails → error logged, user notified, retry scheduled
