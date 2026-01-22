"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/design-system/components/ui/dropdown-menu";
import { format } from "date-fns";
import {
  Calendar,
  DollarSign,
  MapPin,
  MoreVertical,
  Users,
} from "lucide-react";
import { memo } from "react";
import type { CommandBoardCard } from "../../types";

type EventCardProps = {
  card: CommandBoardCard;
};

const statusConfig = {
  confirmed: {
    label: "Confirmed",
    color: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  tentative: {
    label: "Tentative",
    color: "bg-amber-100 text-amber-700 border-amber-200",
  },
  cancelled: {
    label: "Cancelled",
    color: "bg-red-100 text-red-700 border-red-200",
  },
  completed: {
    label: "Completed",
    color: "bg-slate-100 text-slate-700 border-slate-200",
  },
};

export const EventCard = memo(function EventCard({ card }: EventCardProps) {
  const metadata = card.metadata as {
    status?: string;
    eventDate?: string | Date;
    guestCount?: number;
    budget?: number;
    venueName?: string;
    eventType?: string;
  };
  const status = metadata.status || "confirmed";
  const config =
    statusConfig[status as keyof typeof statusConfig] || statusConfig.confirmed;
  const eventDate = metadata.eventDate ? new Date(metadata.eventDate) : null;
  const guestCount = metadata.guestCount || 0;
  const budget = metadata.budget;
  const venueName = metadata.venueName;
  const eventType = metadata.eventType || "Event";

  return (
    <div className="flex h-full flex-col">
      <div className="mb-2 flex items-start justify-between gap-2">
        <Badge className={config.color} variant="outline">
          {config.label}
        </Badge>
        <Badge className="text-xs" variant="secondary">
          {eventType}
        </Badge>
      </div>

      <h3 className="mb-3 line-clamp-2 font-semibold text-sm">{card.title}</h3>

      <div className="mb-3 space-y-1.5">
        {eventDate && (
          <div className="flex items-center gap-2 text-muted-foreground text-xs">
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            <span>{format(eventDate, "MMM d, yyyy")}</span>
          </div>
        )}
        {guestCount > 0 && (
          <div className="flex items-center gap-2 text-muted-foreground text-xs">
            <Users className="h-3.5 w-3.5 shrink-0" />
            <span>{guestCount} guests</span>
          </div>
        )}
        {budget && (
          <div className="flex items-center gap-2 text-muted-foreground text-xs">
            <DollarSign className="h-3.5 w-3.5 shrink-0" />
            <span>{budget.toLocaleString()}</span>
          </div>
        )}
        {venueName && (
          <div className="flex items-center gap-2 text-muted-foreground text-xs">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="line-clamp-1">{venueName}</span>
          </div>
        )}
      </div>

      {card.content && (
        <p className="mb-3 line-clamp-2 text-muted-foreground text-xs">
          {card.content}
        </p>
      )}

      <div className="mt-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              className="w-full justify-start gap-2"
              size="sm"
              variant="ghost"
            >
              <MoreVertical className="h-4 w-4" />
              Quick Actions
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>View Event</DropdownMenuItem>
            <DropdownMenuItem>Edit Details</DropdownMenuItem>
            <DropdownMenuItem>Open Battle Board</DropdownMenuItem>
            <DropdownMenuItem>View Proposal</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
});
