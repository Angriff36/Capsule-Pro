# UnitSystem

**Purpose**: Defines the measurement system used for units of measure

**Schema**: `core`
**PostgreSQL Name**: `unit_system`
**Last Updated**: 2026-01-30

## Values

| Value | Description | Usage Context |
|-------|-------------|---------------|
| `metric` | Metric system (SI) | Liters, grams, Celsius, meters |
| `imperial` | Imperial/US customary system | Gallons, pounds, Fahrenheit, feet |
| `custom` | Custom or unit-specific measurements | Industry-specific units, hybrids |

## Business Context

The `UnitSystem` enum supports multi-regional catering operations by:

1. **Regional Support**: Different regions use different measurement systems
   - **Metric**: Most of world (Europe, Asia, Africa, South America)
   - **Imperial**: United States (and limited use in UK/Canada)

2. **Recipe Scaling**: Automatic conversion when scaling between systems

3. **Inventory Management**: Units can be categorized by system for reporting

4. **Supplier Integration**: Suppliers may use different systems

5. **Regulatory Compliance**: Labels and reporting must use local system

## Usage

### In Models

Used in:
- Unit definitions (conceptual) - Categorizes units by measurement system
- `Recipe` - May specify preferred unit system for display

### Default Values

- Location-based default based on country code
- US locations default to `imperial`
- All other locations default to `metric`

## Validation

### Application-Level

- **Consistency**: Units within a recipe typically use same system
- **Conversion Support**: App must support conversion between systems
- **Display Preference**: Users can set preferred system for UI

### Database-Level

- **PostgreSQL Enum**: Only defined values allowed
- **No Default**: Set based on location or user preference

## Conversion Examples

### Volume
- 1 gallon (imperial) ≈ 3.785 liters (metric)
- 1 quart (imperial) ≈ 0.946 liters (metric)
- 1 cup (imperial) ≈ 236.6 mL (metric)

### Weight
- 1 pound (imperial) ≈ 453.6 grams (metric)
- 1 ounce (imperial) ≈ 28.35 grams (metric)

### Temperature
- °F to °C: (°F - 32) × 5/9 = °C
- °C to °F: (°C × 9/5) + 32 = °F

## Migration History

| Date | Migration | Change |
|------|-----------|--------|
| 2026-01-30 | Initial enum creation | Part of core schema setup |

## Future Changes

- [ ] Add conversion factor tables for each unit type
- [ ] Consider adding `us_customary` separate from `imperial`
- [ ] Add recipe conversion tool to application

## Related

- **UnitType**: Complementary enum defining unit category
- **Inventory**: Items have quantities in specific units
- **Recipes**: Ingredient amounts use units from a system

## See Also

- [Prisma Schema](../../../packages/database/prisma/schema.prisma) - Line 2662
- [UnitType Documentation](./UnitType.md) - Unit categories
