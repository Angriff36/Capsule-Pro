"use client";

import { CheckCircle2Icon, CircleIcon, ClockIcon } from "lucide-react";
import { cn } from "@repo/design-system/lib/utils";

export type EventStage =
  | "created"
  | "client-set"
  | "venue-set"
  | "menu-set"
  | "staff-assigned"
  | "prep-complete"
  | "event-day"
  | "follow-ups-sent";

interface StageConfig {
  id: EventStage;
  label: string;
  description: string;
}

const STAGES: StageConfig[] = [
  { id: "created", label: "Created", description: "Event created in system" },
  { id: "client-set", label: "Client Set", description: "Client information added" },
  { id: "venue-set", label: "Venue Set", description: "Venue details confirmed" },
  { id: "menu-set", label: "Menu Set", description: "Menu and dishes finalized" },
  { id: "staff-assigned", label: "Staff Assigned", description: "Team members assigned" },
  { id: "prep-complete", label: "Prep Complete", description: "All prep tasks done" },
  { id: "event-day", label: "Event Day", description: "Event has occurred" },
  { id: "follow-ups-sent", label: "Follow-ups", description: "Post-event follow-ups sent" },
];

interface EventTimelineProps {
  currentStage: EventStage;
  className?: string;
  onStageClick?: (stage: EventStage) => void;
}

export function EventTimeline({
  currentStage,
  className,
  onStageClick,
}: EventTimelineProps) {
  const currentIndex = STAGES.findIndex((s) => s.id === currentStage);

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Event Timeline</h3>
        <span className="text-xs text-muted-foreground">
          {currentIndex + 1} of {STAGES.length} stages complete
        </span>
      </div>

      <div className="relative">
        {/* Progress line */}
        <div className="absolute left-4 top-0 h-full w-0.5 bg-border" />
        <div
          className="absolute left-4 top-0 h-full bg-primary transition-all duration-500"
          style={{
            height: `${Math.min(100, (currentIndex / (STAGES.length - 1)) * 100)}%`,
          }}
        />

        <div className="space-y-1">
          {STAGES.map((stage, index) => {
            const isComplete = index <= currentIndex;
            const isCurrent = stage.id === currentStage;
            const isClickable = Boolean(onStageClick);

            return (
              <button
                key={stage.id}
                className={cn(
                  "relative flex w-full items-start gap-3 rounded-lg p-2 text-left transition-colors",
                  isClickable && "hover:bg-muted",
                  isCurrent && "bg-muted"
                )}
                onClick={() => isClickable && onStageClick(stage.id)}
                disabled={!isClickable}
              >
                <div className="relative z-10 flex-shrink-0">
                  {isComplete ? (
                    <CheckCircle2Icon className="h-5 w-5 text-primary" />
                  ) : (
                    <CircleIcon className="h-5 w-5 text-muted-foreground/50" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "block text-sm font-medium",
                      isComplete ? "text-foreground" : "text-muted-foreground",
                      isCurrent && "text-primary"
                    )}
                  >
                    {stage.label}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {stage.description}
                  </span>
                </div>
                {isCurrent && (
                  <span className="flex-shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    Current
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Compact version for cards
interface EventTimelineCompactProps {
  currentStage: EventStage;
  className?: string;
}

export function EventTimelineCompact({
  currentStage,
  className,
}: EventTimelineCompactProps) {
  const currentIndex = STAGES.findIndex((s) => s.id === currentStage);
  const progress = Math.round((currentIndex / (STAGES.length - 1)) * 100);

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{STAGES[currentIndex]?.label || "Created"}</span>
        <span className="text-muted-foreground">{progress}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

// Helper to determine stage from event data
export function determineEventStage(event: {
  createdAt?: Date;
  clientId?: string;
  venueName?: string;
  eventDishes?: Array<unknown>;
  prepTasks?: Array<{ status?: string }>;
  status?: string;
  eventDate?: Date;
}): EventStage {
  // If event is in the past and follow-ups sent, mark as complete
  if (
    event.eventDate &&
    new Date(event.eventDate) < new Date() &&
    event.status === "completed"
  ) {
    return "follow-ups-sent";
  }

  // If event date is today or past
  if (event.eventDate && new Date(event.eventDate) <= new Date()) {
    return "event-day";
  }

  // If prep tasks are complete
  if (event.prepTasks && event.prepTasks.length > 0) {
    const allComplete = event.prepTasks.every(
      (t) => t.status === "completed" || t.status === "done"
    );
    if (allComplete) {
      return "prep-complete";
    }
  }

  // If staff assigned (prep tasks exist with assignments)
  if (event.prepTasks && event.prepTasks.length > 0) {
    return "staff-assigned";
  }

  // If menu is set
  if (event.eventDishes && event.eventDishes.length > 0) {
    return "menu-set";
  }

  // If venue is set
  if (event.venueName) {
    return "venue-set";
  }

  // If client is set
  if (event.clientId) {
    return "client-set";
  }

  // Default to created
  return "created";
}
