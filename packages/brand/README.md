# Mangia Brand Package

Utilities for maintaining Mangia brand consistency across the application.

## Brand Voice Conventions

### Date Format
- **Format**: MM.dd.yy with periods (not dashes or slashes)
- **Example**: `02.12.23` instead of `2-13-23` or `02/13/23`

### Time Format
- **Format**: H AM/PM (single digit hours without leading zero, no minutes shown)
- **Example**: `5 PM`, `3 AM` (not `5:00 PM` or `5pm`)

### Ampersand Usage
- Use spelled out "and" or "+" instead of "&"
- **Examples**:
  - ✅ "peanut butter and jelly" or "peanut butter + jelly"
  - ❌ "peanut butter & jelly"

### Text Line Breaking
- No hyphens within line breaks of body text
- Ensure text reflows naturally without hyphenation

## API Reference

### Date Functions

#### `formatBrandDate(date: Date): string`
Format a date according to brand guidelines (MM.dd.yy)

```typescript
import { formatBrandDate } from "@capsule/brand";

formatBrandDate(new Date("2023-02-12")); // "02.12.23"
```

#### `normalizeBrandDate(dateStr: string): string`
Convert various date formats to brand format

```typescript
import { normalizeBrandDate } from "@capsule/brand";

normalizeBrandDate("2-13-23"); // "02.13.23"
normalizeBrandDate("02/13/2023"); // "02.13.23"
normalizeBrandDate("2023-02-13"); // "02.13.23"
```

#### `isBrandDateFormat(dateStr: string): boolean`
Validate if a string follows brand date format

```typescript
import { isBrandDateFormat } from "@capsule/brand";

isBrandDateFormat("02.12.23"); // true
isBrandDateFormat("2-12-23"); // false
```

### Time Functions

#### `formatBrandTime(date: Date): string`
Format a time according to brand guidelines (H AM/PM)

```typescript
import { formatBrandTime } from "@capsule/brand";

formatBrandTime(new Date("2023-02-12 17:30")); // "5 PM"
formatBrandTime(new Date("2023-02-12 03:00")); // "3 AM"
```

#### `isBrandTimeFormat(timeStr: string): boolean`
Validate if a string follows brand time format

```typescript
import { isBrandTimeFormat } from "@capsule/brand";

isBrandTimeFormat("5 PM"); // true
isBrandTimeFormat("5:00 PM"); // false
```

### DateTime Functions

#### `formatBrandDateTime(date: Date): string`
Format both date and time together

```typescript
import { formatBrandDateTime } from "@capsule/brand";

formatBrandDateTime(new Date("2023-02-12 17:30")); // "02.12.23 at 5 PM"
```

### Text Functions

#### `replaceBrandAmpersand(text: string, format?: "and" | "plus"): string`
Replace ampersands according to brand guidelines

```typescript
import { replaceBrandAmpersand } from "@capsule/brand";

replaceBrandAmpersand("coffee & pastries"); // "coffee and pastries"
replaceBrandAmpersand("coffee & pastries", "plus"); // "coffee + pastries"
```

## Usage Examples

### In React Components

```typescript
import {
  formatBrandDate,
  formatBrandTime,
  replaceBrandAmpersand,
} from "@capsule/brand";

export function EventCard({ event }) {
  return (
    <div>
      <h3>{replaceBrandAmpersand(event.title)}</h3>
      <p>Date: {formatBrandDate(event.date)}</p>
      <p>Time: {formatBrandTime(event.date)}</p>
    </div>
  );
}
```

### In API Responses

```typescript
import { formatBrandDate, formatBrandTime } from "@capsule/brand";

export function getEventDetails(event) {
  return {
    ...event,
    formattedDate: formatBrandDate(event.date),
    formattedTime: formatBrandTime(event.date),
  };
}
```

## Integration with Existing Code

When updating date and time displays throughout the app:

1. **Replace `Intl.DateTimeFormat` calls** with `formatBrandDate()` and `formatBrandTime()`
2. **Search for `&` characters** in user-facing text and replace with "and" or "+"
3. **Validate dates** coming from forms using `isBrandDateFormat()` after normalization
4. **Use `formatBrandDateTime()`** for combined date + time displays

## Color Palette

The Mangia brand colors are defined in the design system:

- **Charcoal**: `#1e1c1a` (primary neutral)
- **Almost White**: `#f7f4ef` (secondary neutral)
- **Leafy Green**: `#3f4a39` (primary green)
- **Avocado Mash**: `#a9b388` (secondary green)
- **Spiced Orange**: `#c66b2b` (accent orange)
- **Golden Zest**: `#e2a13b` (accent gold)

These are available as CSS variables in `@capsule/design-system`.

## References

- Brand Guidelines: `docs/brand/Mangia Brand Guideline.md`
- Design System: `packages/design-system/README.md`
