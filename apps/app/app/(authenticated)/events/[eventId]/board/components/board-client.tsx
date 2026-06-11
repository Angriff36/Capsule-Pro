"use client";

import type { EventBoardData, PaletteStaff } from "../actions";
import { resolveTemplate } from "../templates";

interface BoardClientProps {
  eventId: string;
  boardId: string;
  initialData: EventBoardData;
  palette: PaletteStaff[];
}

export function BoardClient({
  eventId: _eventId,
  boardId: _boardId,
  initialData,
  palette,
}: BoardClientProps) {
  const { event, committedCounts, draftCards } = initialData;
  const template = resolveTemplate(event.eventType);

  return (
    <div className="rounded-lg border border-border bg-background p-6 space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{event.title}</h2>
        <p className="text-sm text-muted-foreground">
          {event.guestCount} guests · {template.label} template
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-sm">
        <Stat label="Committed staff" value={committedCounts.staff} />
        <Stat label="Menu items" value={committedCounts.menu} />
        <Stat label="Draft cards" value={draftCards.length} />
        <Stat label="Staff palette" value={palette.length} />
      </div>
      <p className="text-xs text-muted-foreground">
        Command Board UI — full tree canvas coming in Tasks 9–10.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
