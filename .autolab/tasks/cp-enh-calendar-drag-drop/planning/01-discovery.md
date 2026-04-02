# Discovery: Calendar Drag-and-Drop

## Files Analyzed
- `/apps/app/app/(authenticated)/calendar/page.tsx` - Server component, fetches events from DB
- `/apps/app/app/(authenticated)/calendar/components/unified-calendar.tsx` - Client component with month/week/day views

## Event Data Structure
```typescript
interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end?: Date;
  type: "event" | "shift" | "timeoff" | "deadline" | "reminder";
  status?: string;
  color?: string;
  details?: string;
  location?: string;
  assignedTo?: string;
  guestCount?: number;
}
```

## Key Findings
1. Events are fetched via `/api/calendar` (GET with date range)
2. Calendar uses direct database access in page.tsx server component
3. UnifiedCalendar client component handles view switching, filtering, search
4. Event types: event (blue), shift (emerald), timeoff (amber), deadline (red), reminder (purple)
5. Day cells render events as colored pills with time + title

## API for Event Updates
- Existing route: `/api/events/event/commands/update-date` (POST)
- Takes: `{ id: string, newEventDate: number }` (timestamp in ms)
- Uses manifest runtime with guards (can't update cancelled/archived/completed events)

## Implementation Plan
1. Wrap calendar grid with DndContext from @dnd-kit/core
2. Add useDraggable to event cards (id, data: {event})
3. Add useDroppable to day cells (id: day.toISOString(), data: {date: day})
4. On dragEnd: detect if dropped on different day, show confirmation Dialog
5. On confirm: call /api/events/event/commands/update-date
6. Add DragOverlay for visual feedback during drag
7. Add "Drag to reschedule" title/tooltip on events
8. Highlight drop target day cell with ring-2 ring-blue-400
