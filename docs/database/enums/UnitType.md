# UnitType

**Purpose**: Categorizes units of measure by their physical quantity type

**Schema**: `core`
**PostgreSQL Name**: `unit_type`
**Last Updated**: 2026-01-30

## Values

| Value | Description | Usage Context | Example Units |
|-------|-------------|---------------|---------------|
| `volume` | Liquid or fluid volume | Recipes, beverages, liquids | liters, gallons, mL, cups |
| `weight` | Mass or weight | Dry ingredients, solid items | grams, pounds, kilograms, oz |
| `count` | Integer quantities | Individual items, portions | pieces, dozens, cases |
| `length` | Distance or dimensions | Equipment, prep dimensions | meters, feet, inches, cm |
| `temperature` | Thermal measurement | Cooking temps, storage | Celsius, Fahrenheit |
| `time` | Duration or time | Prep time, cook time | minutes, hours, seconds |

## Business Context

The `UnitType` enum provides semantic meaning to units of measure, enabling:

1. **Smart Conversions**: Only convert within same type (volume → volume, not volume → weight)
2. **Inventory Tracking**: Different quantities require different handling
   - **Volume**: Liquids measured by volume
   - **Weight**: Dry goods typically weighed
   - **Count**: Individual items tracked by count

3. **Recipe Scaling**: Proper scaling behavior depends on unit type
   - **Volume**: Scale linearly
   - **Weight**: Scale linearly
   - **Count**: May have rounding rules

4. **Supplier Ordering**: Suppliers quote in different unit types
   - Produce: weight or count
   - Liquids: volume
   - Packaged goods: count

## Usage

### In Models

Used in:
- Unit definitions (conceptual) - Categorizes what the unit measures
- `Ingredient` - May specify preferred unit type for measurement
- `InventoryItem` - Specifies unit type for stock tracking

### Default Values

- Depends on ingredient or item type
- Liquids default to `volume`
- Solids default to `weight`
- Individual items default to `count`

## Validation

### Application-Level

- **Type Consistency**: Cannot convert between different types
- **Density Required**: Volume ↔ weight conversion requires ingredient density
- **Quantity Validation**: Negative quantities not allowed

### Database-Level

- **PostgreSQL Enum**: Only defined values allowed
- **Check Constraints**: May enforce unit type matches inventory item type

## Unit Type Characteristics

### Volume (`volume`)

**Common Units**:
- Metric: liters (L), milliliters (mL)
- Imperial: gallons, quarts, cups, fluid ounces

**Usage**:
- Liquids (water, oil, milk)
- Semi-liquids (sauces, purees)
- Beverages

**Conversion**:
- Linear scaling (2× quantity = 2× volume)

### Weight (`weight`)

**Common Units**:
- Metric: grams (g), kilograms (kg)
- Imperial: pounds (lb), ounces (oz)

**Usage**:
- Dry ingredients (flour, sugar, spices)
- Meats, proteins
- Produce

**Conversion**:
- Linear scaling (2× quantity = 2× weight)

### Count (`count`)

**Common Units**:
- pieces, each, units
- dozens (12)
- cases, boxes

**Usage**:
- Individual items (eggs, apples)
- Portion-controlled items
- Packaged goods

**Conversion**:
- Integer rounding required
- May need bulk-breaking rules

### Length (`length`)

**Common Units**:
- Metric: meters (m), centimeters (cm), millimeters (mm)
- Imperial: feet (ft), inches (in)

**Usage**:
- Equipment dimensions
- Prep area layout
- Cutting dimensions

**Conversion**:
- Linear scaling

### Temperature (`temperature`)

**Common Units**:
- Metric: Celsius (°C)
- Imperial: Fahrenheit (°F)

**Usage**:
- Cooking temperatures
- Storage requirements
- Oven settings

**Conversion**:
- Formula-based (non-linear)
- °F = (°C × 9/5) + 32

### Time (`time`)

**Common Units**:
- seconds, minutes, hours

**Usage**:
- Prep time
- Cook time
- Shelf life

**Conversion**:
- Linear scaling (60 seconds = 1 minute)

## Migration History

| Date | Migration | Change |
|------|-----------|--------|
| 2026-01-30 | Initial enum creation | Part of core schema setup |

## Future Changes

- [ ] Consider adding `area` for surface measurements (square footage)
- [ ] Add density database for volume ↔ weight conversions

## Related

- **UnitSystem**: Measurement system (metric/imperial) for each unit
- **Inventory**: Items tracked in appropriate unit types
- **Recipes**: Ingredient amounts specify unit type

## See Also

- [Prisma Schema](../../../packages/database/prisma/schema.prisma) - Line 2671
- [UnitSystem Documentation](./UnitSystem.md) - Measurement systems
