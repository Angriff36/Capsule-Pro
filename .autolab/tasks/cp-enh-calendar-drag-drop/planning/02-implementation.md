# Implementation: Calendar Drag-and-Drop

## Changes to unified-calendar.tsx

### 1. Imports to Add
```typescript
import { DndContext, DragOverlay, useDraggable, useDroppable, PointerSensor, useSensor, useSensors, DragEndEvent, DragStartEvent } from "@dnd-kit/core";
```

### 2. State Additions
```typescript
const [activeEvent, setActiveEvent] = useState<CalendarEvent | null>(null);
const [rescheduleDialog, setRescheduleDialog] = useState<{open: boolean, event: CalendarEvent | null, newDate: Date | null}>({open: false, event: null, newDate: null});
```

### 3. DnD Sensors
```typescript
const sensors = useSensors(
  useSensor(PointerSensor, {
    activationConstraint: {
      distance: 8, // Require 8px movement before drag starts
    },
  })
);
```

### 4. DraggableEvent Component
- Wraps event pill with useDraggable
- Adds "Drag to reschedule" cursor and title
- Only for event types that can be rescheduled (event, shift)

### 5. DroppableDayCell Component  
- Wraps day cell div with useDroppable
- Highlights with ring-2 ring-blue-400 when active event is over it

### 6. DragOverlay
- Shows dragged event as semi-transparent overlay

### 7. handleDragEnd
```typescript
function handleDragEnd(event: DragEndEvent) {
  const { active, over } = event;
  setActiveEvent(null);
  
  if (!over || !active) return;
  
  const draggedEvent = active.data.current?.event as CalendarEvent;
  const targetDate = over.data.current?.date as Date;
  
  if (!draggedEvent || !targetDate || isSameDay(draggedEvent.start, targetDate)) return;
  
  // Show confirmation dialog
  setRescheduleDialog({ open: true, event: draggedEvent, newDate: targetDate });
}
```

### 8. Confirm Reschedule
- Calls POST /api/events/event/commands/update-date
- Updates local state on success
- Shows toast on error

### 9. Confirmation Dialog (shadcn Dialog)
- Shows event title, old date, new date
- Confirm/Cancel buttons
