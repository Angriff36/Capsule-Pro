# Kitchen Waste Tracking

## Outcome
The system allows logging of food waste with reasons and quantities. Waste analytics identify reduction opportunities and cost savings by tracking what is wasted and why.

## In Scope
- Log waste entries with: item, quantity, reason, date/time, and location
- Categorize waste reasons (spoilage, overproduction, preparation error, etc.)
- Calculate waste cost based on item costs
- Generate waste reports and analytics
- Track waste trends over time
- Support waste logging from mobile devices

## Out of Scope
- Automatic waste detection or measurement
- Integration with inventory systems for automatic stock adjustments
- Waste reduction recommendations or AI suggestions
- Integration with external waste tracking systems

## Invariants / Must Never Happen
- Waste entries must never be logged without required fields (item, quantity, reason)
- Waste quantities must never be negative
- Waste cost calculations must never use incorrect item costs
- Waste data must never be deleted without proper authorization
- Waste entries must never be logged for items not in inventory
- Waste tracking must never include data from other tenants

## Acceptance Checks
- Log waste entry → waste recorded with all details
- View waste report → shows waste by item, reason, and cost
- Calculate waste cost → cost calculated from item prices
- View waste trends → shows waste over time with patterns
- Log waste from mobile → entry created and synced
- Attempt to log waste without required fields → validation error shown
