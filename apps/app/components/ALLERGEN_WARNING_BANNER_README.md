# Allergen Warning Banner Component

A comprehensive React component for displaying allergen warnings, dietary restrictions, and cross-contamination alerts in the Convoy catering management system.

## Features

- **Severity-based styling**: Critical (red), Warning (yellow), Info (blue)
- **Multiple warning types**: Allergen conflicts, dietary restrictions, cross-contamination
- **Acknowledgment workflow**: Modal dialog with optional override reason input
- **State management**: Pending, acknowledged, and resolved states
- **Multiple display modes**: Full banner, compact, and inline badge variants
- **Accessible**: WCAG AA compliant with proper ARIA labels and keyboard navigation
- **Responsive**: Mobile-first design with responsive breakpoints

## Installation

The component is located at:
```
apps/app/components/allergen-warning-banner.tsx
```

## Database Schema

The component works with the `AllergenWarning` model from the database schema:

```typescript
model AllergenWarning {
  tenantId       String    @map("tenant_id")
  id             String    @default(dbgenerated("gen_random_uuid()"))
  eventId        String    @map("event_id")
  dishId         String?   @map("dish_id")
  warningType    String    @map("warning_type")
  allergens      String[]
  affectedGuests String[]  @map("affected_guests")
  severity       String    @default("warning")
  isAcknowledged Boolean   @default(false) @map("is_acknowledged")
  acknowledgedBy String?   @map("acknowledged_by")
  acknowledgedAt DateTime? @map("acknowledged_at")
  overrideReason String?   @map("override_reason")
  resolved       Boolean   @default(false)
  resolvedAt     DateTime? @map("resolved_at")
  notes          String?
  createdAt      DateTime  @default(now()) @map("created_at")
  updatedAt      DateTime  @default(now()) @updatedAt @map("updated_at")
  deletedAt      DateTime? @map("deleted_at")
}
```

## Usage

### Basic Full Banner

```tsx
import { AllergenWarningBanner } from "@/components/allergen-warning-banner";
import type { AllergenWarning } from "@repo/database";

function EventAllergenWarnings() {
  const warning: AllergenWarning & { dishName?: string } = {
    tenantId: "tenant-1",
    id: "warning-1",
    eventId: "event-1",
    dishId: "dish-1",
    warningType: "allergen_conflict",
    allergens: ["peanuts", "tree_nuts"],
    affectedGuests: ["guest-1", "guest-2"],
    severity: "critical",
    isAcknowledged: false,
    acknowledgedBy: null,
    acknowledgedAt: null,
    overrideReason: null,
    resolved: false,
    resolvedAt: null,
    notes: "Severe allergy confirmed",
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    dishName: "Pad Thai with Crushed Peanuts",
  };

  const handleAcknowledge = async (warningId: string, reason?: string) => {
    await fetch(`/api/allergen-warnings/${warningId}/acknowledge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
  };

  return (
    <AllergenWarningBanner
      warning={warning}
      onAcknowledge={handleAcknowledge}
      onViewDetails={(id) => console.log("View details:", id)}
    />
  );
}
```

### Compact Mode

```tsx
<AllergenWarningBanner
  warning={warning}
  compact
  onAcknowledge={handleAcknowledge}
/>
```

### Inline Badge (for tables)

```tsx
import { AllergenWarningInline } from "@/components/allergen-warning-banner";

{warnings.map((warning) => (
  <AllergenWarningInline
    key={warning.id}
    warning={warning}
    onViewDetails={(id) => navigate(`/warnings/${id}`)}
  />
))}
```

### Severity Badge Only

```tsx
import { AllergenSeverityBadge } from "@/components/allergen-warning-banner";

<AllergenSeverityBadge severity="critical" />
```

## Props

### AllergenWarningBanner

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `warning` | `AllergenWarning & { dishName?: string, affectedGuestDetails?: Guest[] }` | Yes | The warning data from database |
| `onAcknowledge` | `(warningId: string, reason?: string) => void \| Promise<void>` | No | Callback when warning is acknowledged |
| `onDismiss` | `(warningId: string) => void \| Promise<void>` | No | Callback when warning is dismissed (info-level only) |
| `onViewDetails` | `(warningId: string) => void` | No | Callback when viewing full details |
| `className` | `string` | No | Additional CSS classes |
| `compact` | `boolean` | No | Enable compact mode (default: false) |

### AllergenWarningInline

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `warning` | `AllergenWarning & { dishName?: string }` | Yes | The warning data |
| `onViewDetails` | `(warningId: string) => void` | No | Callback when clicking badge |
| `className` | `string` | No | Additional CSS classes |

### AllergenSeverityBadge

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `severity` | `"critical" \| "warning" \| "info"` | Yes | The severity level |

## Warning Types

- `allergen_conflict`: Direct allergen conflicts (e.g., peanuts, shellfish)
- `dietary_restriction`: Dietary preferences and restrictions (e.g., vegan, kosher)
- `cross_contamination`: Cross-contamination risks between dishes

## Severity Levels

### Critical
- **Color**: Rose/Red
- **Use case**: Life-threatening allergen conflicts
- **Required**: Override reason must be provided
- **Icon**: OctagonX

### Warning
- **Color**: Amber/Yellow
- **Use case**: Dietary restrictions and cross-contamination risks
- **Required**: Override reason strongly recommended
- **Icon**: AlertTriangle

### Info
- **Color**: Blue
- **Use case**: Religious dietary preferences, informational alerts
- **Required**: No reason required, can be dismissed
- **Icon**: Info

## Supported Allergens

The component includes emoji indicators for common allergens:

- Dairy (🥛)
- Eggs (🥚)
- Fish (🐟)
- Shellfish (🦐)
- Tree Nuts (🌰)
- Peanuts (🥜)
- Wheat/Gluten (🌾)
- Soy (🫘)
- Sesame (🫘)
- Vegan (🌱)
- Vegetarian (🥗)
- Kosher (✡️)
- Halal (☪️)

## States

### Pending
```tsx
{
  isAcknowledged: false,
  resolved: false
}
```
Shows full action buttons (Acknowledge, View Details, Dismiss)

### Acknowledged
```tsx
{
  isAcknowledged: true,
  resolved: false,
  acknowledgedBy: "user-123",
  acknowledgedAt: new Date(),
  overrideReason: "Separate prep area confirmed"
}
```
Shows acknowledgment badge with reason, no action buttons

### Resolved
```tsx
{
  resolved: true,
  resolvedAt: new Date()
}
```
Shows resolved badge with reduced opacity

## Styling

The component uses Tailwind CSS and follows the design system:

- **Colors**: Semantic color tokens for each severity level
- **Dark mode**: Full dark mode support with `dark:` prefixes
- **Responsive**: Mobile-first with breakpoints for tablet and desktop
- **Spacing**: Consistent with design system spacing scale (4px base unit)

## Accessibility

- **ARIA labels**: Proper `role="alert"` on banner
- **Keyboard navigation**: Full keyboard support for all interactive elements
- **Screen reader**: Descriptive text for screen readers
- **Color contrast**: Meets WCAG AA standards
- **Focus indicators**: Visible focus states on all interactive elements

## Examples

See `allergen-warning-banner.examples.tsx` for comprehensive usage examples including:

- All severity levels
- All states (pending, acknowledged, resolved)
- Compact mode
- Inline badges
- Integration examples

## Integration with API

Example API endpoints you'll need:

### Acknowledge Warning
```typescript
// POST /api/allergen-warnings/[warningId]/acknowledge
{
  "reason": "Optional override reason"
}
```

### Dismiss Warning
```typescript
// POST /api/allergen-warnings/[warningId]/dismiss
```

### Resolve Warning
```typescript
// PATCH /api/allergen-warnings/[warningId]
{
  "resolved": true
}
```

## Testing

```typescript
import { render, screen } from "@testing-library/react";
import { AllergenWarningBanner } from "@/components/allergen-warning-banner";

test("displays critical allergen warning", () => {
  const warning = {
    // ... warning data
    severity: "critical",
    allergens: ["peanuts"],
  };

  render(<AllergenWarningBanner warning={warning} />);

  expect(screen.getByText(/critical/i)).toBeInTheDocument();
  expect(screen.getByText(/peanuts/i)).toBeInTheDocument();
});
```

## Future Enhancements

Potential improvements to consider:

- [ ] Bulk acknowledgment for multiple warnings
- [ ] Export warnings to PDF for event briefings
- [ ] Warning history timeline
- [ ] Automatic resolution tracking
- [ ] Integration with recipe substitution suggestions
- [ ] Real-time updates when warnings are acknowledged
- [ ] Mobile-specific warning summary view

## Related Components

- `TaskCard` - Kitchen task display with similar priority system
- `EventSummaryDisplay` - Event overview with warnings
- `Badge` - Base badge component from shadcn/ui
- `Alert` - Base alert component from shadcn/ui

## Support

For issues or questions:
1. Check the examples file for usage patterns
2. Review the database schema for field definitions
3. Consult the design system docs for styling guidelines
