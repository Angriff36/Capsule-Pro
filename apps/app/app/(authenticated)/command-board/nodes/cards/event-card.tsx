"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { cn } from "@repo/design-system/lib/utils";
import { Calendar, MapPin, Users } from "lucide-react";
import { memo } from "react";
import type { ResolvedEvent } from "../../types/entities";
import { ENTITY_TYPE_COLORS } from "../../types/entities";

interface EventNodeCardProps {
  data: ResolvedEvent;
  stale: boolean;
}

const statusVariantMap = {
  confirmed: "default" as const,
  tentative: "secondary" as const,
  cancelled: "destructive" as const,
  completed: "secondary" as const,
  draft: "outline" as const,
};

export const EventNodeCard = memo(function EventNodeCard({
  data,
  stale,
}: EventNodeCardProps) {
  const colors = ENTITY_TYPE_COLORS.event;
  const variant =
    statusVariantMap[data.status as keyof typeof statusVariantMap] ?? "outline";

  const eventDate = data.eventDate ? new Date(data.eventDate) : null;

  return (
    <div className={cn("flex h-full flex-col", stale && "opacity-50")}>
      {/* Header */}
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Calendar className={cn("size-3.5 shrink-0", colors.icon)} />
          <span className={cn("font-medium text-xs", colors.text)}>Event</span>
        </div>
        <Badge className="text-xs" variant={variant}>
          {data.status}
        </Badge>
      </div>

      {/* Title */}
      <h3 className="mb-1.5 line-clamp-2 font-semibold text-sm leading-tight">
        {data.title}
      </h3>

      {/* Details */}
      <div className="space-y-1 text-sm">
        {eventDate && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Calendar className="size-3 shrink-0" />
            <span className="truncate text-xs">
              {eventDate.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>
        )}
        {data.guestCount != null && data.guestCount > 0 && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Users className="size-3 shrink-0" />
            <span className="text-xs">{data.guestCount} guests</span>
          </div>
        )}
        {data.clientName && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <span className="text-xs">Client: {data.clientName}</span>
          </div>
        )}
        {data.venueName && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <MapPin className="size-3 shrink-0" />
            <span className="line-clamp-1 text-xs">{data.venueName}</span>
          </div>
        )}
      </div>
    </div>
  );
});
