# Recipe Costing Engine

## Outcome
The system calculates recipe costs by linking ingredients to inventory items with current pricing. Recipe costs automatically update when ingredient prices change.

## In Scope
- Link recipe ingredients to inventory items
- Calculate recipe cost from ingredient quantities and current inventory prices
- Update recipe costs automatically when inventory item prices change
- Show cost breakdown per ingredient within a recipe
- Calculate total recipe cost and cost per serving
- Support multiple recipes and track cost changes over time

## Out of Scope
- Automatic menu pricing based on recipe costs
- Cost forecasting or predictions
- Integration with supplier pricing systems
- Historical cost analysis or reporting

## Invariants / Must Never Happen
- Recipe costs must never be calculated with missing or invalid ingredient prices
- Recipe costs must never be negative
- Cost updates must never be lost when inventory prices change
- Recipe costs must never include ingredients that don't exist in inventory
- Cost calculations must never use outdated inventory prices
- Recipe costs must never be calculated without all required ingredients linked

## Acceptance Checks
- Create recipe with ingredients → recipe cost calculated from ingredient prices
- Update inventory item price → recipe costs using that ingredient update automatically
- View recipe cost breakdown → shows cost per ingredient and total
- Calculate cost per serving → total cost divided by serving count
- Create recipe with missing ingredient prices → cost calculation shows missing prices
- Update recipe ingredients → cost recalculates with new ingredients
