# Migration 0003_seed_units_and_waste_reasons

## Date
2026-01-24 00:00:01

## Description
Seeds reference data for units of measure and waste reasons. These core reference tables are used throughout the kitchen and inventory modules.

## Changes

### Part 1: Seed Units of Measure

#### Weight Units (Metric & Imperial)
```sql
INSERT INTO "core"."units" ("id", "code", "name", "name_plural", "unit_system", "unit_type", "is_base_unit") VALUES
(1, 'g', 'gram', 'grams', 'metric', 'weight', false),
(2, 'kg', 'kilogram', 'kilograms', 'metric', 'weight', true),
(3, 'mg', 'milligram', 'milligrams', 'metric', 'weight', false),
(4, 'oz', 'ounce', 'ounces', 'imperial', 'weight', false),
(5, 'lb', 'pound', 'pounds', 'imperial', 'weight', true),
(6, 't', 'ton', 'tons', 'imperial', 'weight', false);
```

#### Volume Units (Metric & Imperial)
```sql
(10, 'ml', 'milliliter', 'milliliters', 'metric', 'volume', false),
(11, 'l', 'liter', 'liters', 'metric', 'volume', true),
(12, 'floz', 'fluid ounce', 'fluid ounces', 'imperial', 'volume', false),
(13, 'cup', 'cup', 'cups', 'imperial', 'volume', false),
(14, 'pt', 'pint', 'pints', 'imperial', 'volume', false),
(15, 'qt', 'quart', 'quarts', 'imperial', 'volume', false),
(16, 'gal', 'gallon', 'gallons', 'imperial', 'volume', true);
```

#### Count Units
```sql
(20, 'ea', 'each', 'each', 'custom', 'count', true),
(21, 'doz', 'dozen', 'dozens', 'custom', 'count', false),
(22, 'pcs', 'piece', 'pieces', 'custom', 'count', false);
```

#### Length Units
```sql
(30, 'mm', 'millimeter', 'millimeters', 'metric', 'length', false),
(31, 'cm', 'centimeter', 'centimeters', 'metric', 'length', false),
(32, 'm', 'meter', 'meters', 'metric', 'length', true),
(33, 'in', 'inch', 'inches', 'imperial', 'length', false),
(34, 'ft', 'foot', 'feet', 'imperial', 'length', true);
```

#### Temperature Units
```sql
(40, 'c', 'celsius', 'celsius', 'metric', 'temperature', true),
(41, 'f', 'fahrenheit', 'fahrenheit', 'imperial', 'temperature', true);
```

#### Time Units
```sql
(50, 's', 'second', 'seconds', 'metric', 'time', false),
(51, 'min', 'minute', 'minutes', 'metric', 'time', false),
(52, 'h', 'hour', 'hours', 'metric', 'time', false),
(53, 'd', 'day', 'days', 'metric', 'time', true);
```

### Part 2: Seed Unit Conversions

#### Weight Conversions
```sql
-- Metric
(1, 2, 0.001),  -- gram to kilogram
(3, 1, 0.001),  -- milligram to gram
(2, 1, 1000),   -- kilogram to gram

-- Imperial
(4, 5, 0.0625), -- ounce to pound
(5, 4, 16),     -- pound to ounce

-- Cross-system
(1, 4, 0.035274), -- gram to ounce
(2, 5, 2.20462),  -- kilogram to pound
```

#### Volume Conversions
```sql
-- Metric
(10, 11, 0.001), -- milliliter to liter
(11, 10, 1000),  -- liter to milliliter

-- Imperial
(12, 13, 0.125), -- fluid ounce to cup
(13, 14, 0.5),   -- cup to pint
(14, 15, 0.5),   -- pint to quart
(15, 16, 0.25),  -- quart to gallon
(16, 15, 4),     -- gallon to quart

-- Cross-system
(11, 16, 0.264172), -- liter to gallon
(10, 12, 0.033814), -- milliliter to fluid ounce
```

#### Count Conversions
```sql
(20, 22, 1),     -- each to piece
(21, 20, 12),    -- dozen to each
```

#### Length Conversions
```sql
-- Metric
(30, 31, 0.1),   -- millimeter to centimeter
(31, 32, 0.01),  -- centimeter to meter
(30, 32, 0.001), -- millimeter to meter

-- Imperial
(33, 34, 0.0833333), -- inch to foot
(34, 33, 12),        -- foot to inch

-- Cross-system
(31, 33, 0.393701),  -- centimeter to inch
(32, 34, 3.28084),   -- meter to foot
```

#### Time Conversions
```sql
(50, 51, 0.0166667), -- second to minute
(51, 52, 0.0166667), -- minute to hour
(52, 53, 0.0416667), -- hour to day
(51, 50, 60),        -- minute to second
(52, 51, 60),        -- hour to minute
(53, 52, 24)         -- day to hour
```

### Part 3: Seed Waste Reasons

```sql
INSERT INTO "core"."waste_reasons" ("id", "code", "name", "description", "color_hex", "is_active", "sort_order") VALUES
(1, 'spoilage', 'Spoilage', 'Food that has spoiled or expired', '#ef4444', true, 1),
(2, 'overproduction', 'Overproduction', 'Food prepared in excess of what was needed', '#f59e0b', true, 2),
(3, 'prep_error', 'Preparation Error', 'Mistakes made during food preparation', '#f97316', true, 3),
(4, 'burnt', 'Burnt', 'Food that was burnt during cooking', '#dc2626', true, 4),
(5, 'expired', 'Expired', 'Food that reached its expiration date before use', '#b91c1c', true, 5),
(6, 'quality', 'Quality Issues', 'Food that did not meet quality standards', '#eab308', true, 6),
(7, 'dropped', 'Dropped/Spilled', 'Food that was dropped or spilled', '#ca8a04', true, 7),
(8, 'leftovers', 'Leftovers', 'Uneaten food from events or service', '#84cc16', true, 8),
(9, 'customer_return', 'Customer Return', 'Food returned by customers', '#a3e635', true, 9),
(10, 'other', 'Other', 'Other waste reasons not covered above', '#6b7280', true, 10);
```

## Usage Examples

### Unit Conversions
The `unit_conversions` table enables dynamic unit conversion:
```sql
-- Convert 5 kg to grams
SELECT 5 * multiplier
FROM core.unit_conversions
WHERE from_unit_id = 2  -- kg
  AND to_unit_id = 1;    -- g
-- Result: 5000
```

### Waste Entry Classification
When logging waste:
```sql
INSERT INTO tenant_kitchen.waste_entries (
  inventory_item_id, reason_id, quantity, unit_id
) VALUES (
  $1,  -- item_id
  1,   -- reason: spoilage
  2.5, -- quantity
  2    -- unit: kg
);
```

### Waste Reporting by Reason
```sql
SELECT
  wr.name AS reason,
  COUNT(*) AS occurrences,
  SUM(we.quantity) AS total_quantity
FROM tenant_kitchen.waste_entries we
JOIN core.waste_reasons wr ON we.reason_id = wr.id
WHERE we.tenant_id = $1
  AND we.deleted_at IS NULL
GROUP BY wr.name
ORDER BY occurrences DESC;
```

## Design Decisions

### Unit ID Range Strategy
- **1-9**: Weight units
- **10-19**: Volume units
- **20-29**: Count units
- **30-39**: Length units
- **40-49**: Temperature units
- **50-59**: Time units

This range-based approach:
1. Groups related units together
2. Allows easy filtering by category
3. Provides space for future additions

### Color Coding for Waste Reasons
Each waste reason includes `color_hex` for UI visualization:
- **Red tones (#ef4444, #dc2626, #b91c1c)**: Critical issues (spoilage, burnt, expired)
- **Orange tones (#f59e0b, #f97316)**: Process issues (overproduction, prep errors)
- **Yellow tones (#eab308, #ca8a04)**: Minor issues (quality, dropped)
- **Green tones (#84cc16, #a3e635)**: Recoverable (leftovers, returns)
- **Gray (#6b7280)**: Other/uncategorized

### Base Units
`is_base_unit` marks the canonical unit for each type:
- Weight: kilogram (kg) = 2
- Volume: liter (l) = 11
- Count: each (ea) = 20
- Length: meter (m) = 32
- Temperature: celsius (c) = 40
- Time: day (d) = 53

Base units are used for:
- Standardized storage
- Cost calculations
- Reporting aggregations

## Integration Points

### Affected Tables
- `tenant_kitchen.ingredients`: Uses `default_unit_id`
- `tenant_kitchen.recipe_ingredients`: Uses `unit_id` for quantities
- `tenant_kitchen.prep_tasks`: Uses `quantity_unit_id`
- `tenant_inventory.inventory_items`: Stores quantities in base units
- `tenant_inventory.inventory_stock`: Uses `unit_id`
- `tenant_kitchen.waste_entries`: Uses `unit_id` and `reason_id`

### Features Enabled
1. **Recipe scaling**: Convert units for batch adjustments
2. **Inventory par levels**: Set reorder points in any unit
3. **Waste analytics**: Report waste by reason/category
4. **Purchase ordering**: Order in supplier's preferred units
5. **Nutritional labeling**: Display in region-appropriate units

## Data Integrity

### Idempotent Inserts
```sql
ON CONFLICT ("id") DO NOTHING;  -- units
ON CONFLICT ("from_unit_id", "to_unit_id") DO NOTHING;  -- conversions
```
Ensures migration can be re-run safely.

### Conversion Accuracy
- Multipliers stored to 10 decimal places
- Cross-system conversions use industry-standard factors
- Supports bidirectional conversion (A→B and B→A)

## Migration Notes

### Dependencies
- Requires `core.units` table (from 0000_init)
- Requires `core.unit_conversions` table (from 0000_init)
- Requires `core.waste_reasons` table (from 0000_init)

### Rollback
```sql
DELETE FROM core.unit_conversions;
DELETE FROM core.units;
DELETE FROM core.waste_reasons;
```

### Future Enhancements
- Add density factors for volume↔weight conversions
- Support for custom tenant-specific units
- Regional unit preferences per tenant
- Unit aliases (e.g., "tsp" for "teaspoon")
