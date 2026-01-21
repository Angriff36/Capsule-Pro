# Inventory Item CRUD

## Outcome
Users can manage inventory items with complete CRUD operations including SKUs, descriptions, units, suppliers, par levels, and reorder points. This forms the foundation for all inventory tracking.

## In Scope
- Create inventory items with: SKU, description, unit of measure, supplier, par level, reorder point
- Edit item information
- Delete items (with appropriate handling of linked recipes, stock levels, etc.)
- Search and filter items by name, SKU, supplier, or category
- Support multiple units of measure per item
- Organize items by categories or groups

## Out of Scope
- Automatic item creation from supplier catalogs
- Integration with external inventory systems
- Item pricing or cost tracking (handled by separate feature)
- Historical item analysis or reporting

## Invariants / Must Never Happen
- Items must never be deleted if linked to active recipes or stock levels
- SKUs must never be duplicated within a tenant
- Par levels and reorder points must never be negative
- Item updates must never be lost due to concurrent edits
- Items must never be visible to users from other tenants
- Required item fields must never be empty (SKU, description, unit)

## Acceptance Checks
- Create inventory item → item created with all details
- Edit item → changes saved and reflected
- Search items → results filtered by search criteria
- Delete item → item removed (if not in use)
- Attempt to delete item in use → warning shown, deletion prevented
- View item list → shows all items organized by category
