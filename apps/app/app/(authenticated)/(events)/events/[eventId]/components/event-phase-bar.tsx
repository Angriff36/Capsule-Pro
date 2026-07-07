import { Badge } from "@repo/design-system/components/ui/badge";
import { cn } from "@repo/design-system/lib/utils";
import {
  AlertTriangleIcon,
  ChefHatIcon,
  ClipboardCheckIcon,
  TruckIcon,
  UsersIcon,
} from "lucide-react";
import Link from "next/link";

// ponytail: staffing ratio is a heuristic until a real `requiredStaff` field is
// modeled on Event — swap this constant for that field when it lands.
const GUESTS_PER_STAFF = 25;

interface PrepSummary {
  done: number;
  overdue: number;
  total: number;
}

interface EventPhaseBarProps {
  battleBoardHref: string;
  dishCount: number;
  eventDateMs: number;
  eventId: string;
  guestCount: number | null;
  prep: PrepSummary;
  rsvpCount: number;
  staffCount: number;
}

type PhaseId = "load-in" | "prep" | "service" | "breakdown";

interface PhaseSegment {
  conflict: boolean;
  detail: string;
  href: string;
  icon: typeof UsersIcon;
  id: PhaseId;
  label: string;
}

function isSameDay(aMs: number, bMs: number): boolean {
  const a = new Date(aMs);
  const b = new Date(bMs);
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function resolveCurrentPhase(
  isPast: boolean,
  isToday: boolean,
  prepStarted: boolean
): PhaseId {
  if (isPast) {
    return "breakdown";
  }
  if (isToday) {
    return "service";
  }
  return prepStarted ? "prep" : "load-in";
}

/**
 * Compact horizontal event-health bar shown at the top of every Event detail
 * page. Four operational phases (load-in → prep → service → breakdown) each
 * surface an at-a-glance readiness indicator and deep-link to the relevant
 * sub-module. Red markers flag where a readiness conflict exists.
 *
 * Read-only projection — derives entirely from data the page already fetches.
 */
export function EventPhaseBar({
  battleBoardHref,
  dishCount,
  eventDateMs,
  eventId,
  guestCount,
  prep,
  rsvpCount,
  staffCount,
}: EventPhaseBarProps) {
  const nowMs = Date.now();
  const isPast = eventDateMs < nowMs && !isSameDay(eventDateMs, nowMs);
  const isToday = isSameDay(eventDateMs, nowMs);

  const requiredStaff =
    guestCount && guestCount > 0
      ? Math.max(2, Math.ceil(guestCount / GUESTS_PER_STAFF))
      : 0;
  const staffConflict = requiredStaff > 0 && staffCount < requiredStaff;

  const prepPct =
    prep.total > 0 ? Math.round((prep.done / prep.total) * 100) : null;
  const prepConflict = prep.overdue > 0;

  const overCapacity =
    guestCount !== null && guestCount > 0 && rsvpCount > guestCount;
  const serviceConflict = dishCount === 0 || overCapacity;

  const breakdownConflict = isPast; // past event still on this page = unwrapped

  const currentPhase = resolveCurrentPhase(isPast, isToday, prep.total > 0);

  const segments: PhaseSegment[] = [
    {
      id: "load-in",
      label: "Load-in",
      icon: UsersIcon,
      href: `/events/${eventId}?tab=operations`,
      detail: requiredStaff
        ? `${staffCount}/${requiredStaff} staff`
        : `${staffCount} staff`,
      conflict: staffConflict,
    },
    {
      id: "prep",
      label: "Prep",
      icon: ChefHatIcon,
      href: `/events/${eventId}?tab=menu`,
      detail: prepPct === null ? "No tasks" : `${prepPct}% done`,
      conflict: prepConflict,
    },
    {
      id: "service",
      label: "Service",
      icon: TruckIcon,
      href: battleBoardHref,
      detail:
        guestCount && guestCount > 0
          ? `${rsvpCount}/${guestCount} RSVP`
          : `${rsvpCount} RSVP`,
      conflict: serviceConflict,
    },
    {
      id: "breakdown",
      label: "Breakdown",
      icon: ClipboardCheckIcon,
      href: `/events/${eventId}?tab=followups`,
      detail: isPast ? "Needs wrap-up" : "Scheduled",
      conflict: breakdownConflict,
    },
  ];

  const conflictCount = segments.filter((s) => s.conflict).length;

  return (
    <nav
      aria-label="Event phase timeline"
      className="flex w-full items-stretch gap-1 rounded-lg border border-border bg-card p-1"
    >
      {segments.map((segment) => {
        const Icon = segment.icon;
        const isCurrent = segment.id === currentPhase;
        let iconColor = "text-muted-foreground";
        if (segment.conflict) {
          iconColor = "text-destructive";
        } else if (isCurrent) {
          iconColor = "text-primary";
        }
        return (
          <Link
            aria-current={isCurrent ? "step" : undefined}
            className={cn(
              "group relative flex min-w-0 flex-1 items-center gap-2 rounded-md px-3 py-2 transition-colors",
              "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isCurrent && "bg-muted"
            )}
            href={segment.href}
            key={segment.id}
            title={`${segment.label} — ${segment.detail}${segment.conflict ? " (needs attention)" : ""}`}
          >
            <Icon className={cn("h-4 w-4 flex-shrink-0", iconColor)} />
            <span className="flex min-w-0 flex-col leading-tight">
              <span
                className={cn(
                  "truncate font-medium text-xs",
                  isCurrent ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {segment.label}
              </span>
              <span className="truncate text-[11px] text-muted-foreground">
                {segment.detail}
              </span>
            </span>
            {segment.conflict && (
              <AlertTriangleIcon
                aria-label="Conflict detected"
                className="ml-auto h-3.5 w-3.5 flex-shrink-0 text-destructive"
              />
            )}
          </Link>
        );
      })}
      {conflictCount > 0 && (
        <Badge className="my-auto mr-1 flex-shrink-0" variant="destructive">
          {conflictCount} {conflictCount === 1 ? "issue" : "issues"}
        </Badge>
      )}
    </nav>
  );
}
