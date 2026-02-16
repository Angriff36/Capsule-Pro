# Allergen Warning Banner - Quick Reference

## Import Statements

```typescript
// Main component
import { AllergenWarningBanner } from "@/components/allergen-warning-banner";

// Additional exports
import {
  AllergenWarningBanner,
  AllergenWarningInline,
  AllergenSeverityBadge
} from "@/components/allergen-warning-banner";

// Type import
import type { AllergenWarning } from "@repo/database";
```

## Quick Usage Patterns

### 1. Basic Full Banner
```tsx
<AllergenWarningBanner
  warning={warning}
  onAcknowledge={(id, reason) => console.log(id, reason)}
  onViewDetails={(id) => console.log(id)}
/>
```

### 2. Compact Mode
```tsx
<AllergenWarningBanner
  warning={warning}
  compact
  onAcknowledge={handleAcknowledge}
/>
```

### 3. Inline Badge (for tables)
```tsx
<AllergenWarningInline
  warning={warning}
  onViewDetails={(id) => navigate(`/warnings/${id}`)}
/>
```

### 4. Severity Badge Only
```tsx
<AllergenSeverityBadge severity="critical" />
```

## Severity Levels

| Level | Color | Icon | When to Use |
|-------|-------|------|-------------|
| `critical` | Red | OctagonX | Life-threatening allergens |
| `warning` | Yellow | AlertTriangle | Dietary restrictions |
| `info` | Blue | Info | Religious preferences |

## Warning Types

- `allergen_conflict` - Direct allergen conflicts
- `dietary_restriction` - Dietary preferences/restrictions
- `cross_contamination` - Cross-contamination risks

## Allergen Emojis

🥛 Dairy | 🥚 Eggs | 🐟 Fish | 🦐 Shellfish
🌰 Tree Nuts | 🥜 Peanuts | 🌾 Wheat/Gluten | 🫘 Soy
🌱 Vegan | 🥗 Vegetarian | ✡️ Kosher | ☪️ Halal

## Data Structure

```typescript
const warning: AllergenWarning & {
  dishName?: string;
  affectedGuestDetails?: Array<{
    id: string;
    name: string;
    email?: string | null;
  }>;
} = {
  tenantId: "string",
  id: "string",
  eventId: "string",
  dishId: "string" | null,
  warningType: "allergen_conflict" | "dietary_restriction" | "cross_contamination",
  allergens: ["peanuts", "tree_nuts"],
  affectedGuests: ["guest-1", "guest-2"],
  severity: "critical" | "warning" | "info",
  isAcknowledged: false,
  acknowledgedBy: "string" | null,
  acknowledgedAt: Date | null,
  overrideReason: "string" | null,
  resolved: false,
  resolvedAt: Date | null,
  notes: "string" | null,
  createdAt: Date,
  updatedAt: Date,
  deletedAt: Date | null,
  // Optional extended fields
  dishName: "Pad Thai with Peanuts",
  affectedGuestDetails: [
    { id: "guest-1", name: "Sarah Johnson", email: "sarah@example.com" }
  ]
};
```

## Callback Signatures

### onAcknowledge
```typescript
(warningId: string, reason?: string) => void | Promise<void>
```

### onDismiss
```typescript
(warningId: string) => void | Promise<void>
```

### onViewDetails
```typescript
(warningId: string) => void
```

## State Display

### Pending (not acknowledged)
- Shows "Acknowledge" button
- Shows "View Details" button (if callback provided)
- Shows "Dismiss" button for info-level (if callback provided)

### Acknowledged
- Shows "Acknowledged" badge
- Displays acknowledgment timestamp
- Shows override reason (if provided)
- No action buttons

### Resolved
- Shows "Resolved" badge
- Displays resolution timestamp
- Reduced opacity
- No action buttons

## File Locations

- **Component**: `apps/app/components/allergen-warning-banner.tsx`
- **Examples**: `apps/app/components/allergen-warning-banner.examples.tsx`
- **Docs**: `apps/app/components/ALLERGEN_WARNING_BANNER_README.md`
- **Test Page**: `apps/app/app/(authenticated)/kitchen/allergen-warning-test/page.tsx`

## Visual Test

Visit `/kitchen/allergen-warning-test` to see all variants in action.

## Common Patterns

### Fetch and Display Warnings
```typescript
const { data: warnings } = useQuery({
  queryKey: ["allergen-warnings", eventId],
  queryFn: () => fetch(`/api/events/${eventId}/warnings`).then(r => r.json())
});

return (
  <div className="space-y-4">
    {warnings?.map(warning => (
      <AllergenWarningBanner
        key={warning.id}
        warning={warning}
        onAcknowledge={handleAcknowledge}
      />
    ))}
  </div>
);
```

### Table with Inline Badges
```typescript
<table>
  <tbody>
    {events.map(event => (
      <tr key={event.id}>
        <td>{event.name}</td>
        <td>
          {event.warnings.map(warning => (
            <AllergenWarningInline
              key={warning.id}
              warning={warning}
              onViewDetails={(id) => setSelectedWarning(id)}
            />
          ))}
        </td>
      </tr>
    ))}
  </tbody>
</table>
```

## Styling Classes

The component uses Tailwind CSS classes. Customize with the `className` prop:

```tsx
<AllergenWarningBanner
  warning={warning}
  className="rounded-xl shadow-lg"
/>
```

## Dark Mode

Full dark mode support is automatic. Component uses `dark:` prefixes throughout.

## Accessibility

- All interactive elements are keyboard accessible
- Proper ARIA labels included
- Color contrast meets WCAG AA
- Screen reader friendly

## Troubleshooting

### Issue: Warnings not displaying
**Check**: Database query includes `deletedAt: null` filter

### Issue: Acknowledge button not working
**Check**: `onAcknowledge` callback is provided and returns Promise

### Issue: Styling looks wrong
**Check**: Tailwind CSS is properly configured and `@repo/design-system` is imported

### Issue: Types not matching
**Check**: Extended type with `dishName` and `affectedGuestDetails` if needed

## Need Help?

1. Check the full README: `ALLERGEN_WARNING_BANNER_README.md`
2. Review examples: `allergen-warning-banner.examples.tsx`
3. Visit test page: `/kitchen/allergen-warning-test`
4. Check database schema: `packages/database/prisma/schema.prisma`
