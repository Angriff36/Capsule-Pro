"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/design-system/components/ui/dropdown-menu";
import { Separator } from "@repo/design-system/components/ui/separator";
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

const statusVariantMap = {
  confirmed: "default" as const,
  tentative: "secondary" as const,
  cancelled: "destructive" as const,
  completed: "secondary" as const,
  draft: "outline" as const,
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
  const variant =
    statusVariantMap[status as keyof typeof statusVariantMap] ?? "outline";
  const eventDate = metadata.eventDate ? new Date(metadata.eventDate) : null;
  const guestCount = metadata.guestCount || 0;
  const budget = metadata.budget;
  const venueName = metadata.venueName;
  const eventType = metadata.eventType || "Event";

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 space-y-1.5">
            <div className="flex items-center gap-2 text-xs">
              <CardDescription className="capitalize text-muted-foreground">
                {eventType}
              </CardDescription>
            </div>
            <CardTitle className="line-clamp-2 leading-tight">
              {card.title}
            </CardTitle>
          </div>
          <CardAction>
            <Badge className="capitalize" variant={variant}>
              {status}
            </Badge>
          </CardAction>
        </div>
      </CardHeader>

      <Separator />

      <CardContent className="space-y-3 py-4">
        <div className="space-y-1.5 text-sm">
          {eventDate && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="size-3.5 shrink-0" />
              <span className="truncate">
                {eventDate.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>
          )}
          {guestCount > 0 && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="size-3.5 shrink-0" />
              <span className="truncate">{guestCount} guests</span>
            </div>
          )}
          {budget && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <DollarSign className="size-3.5 shrink-0" />
              <span className="truncate">{budget.toLocaleString()}</span>
            </div>
          )}
          {venueName && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="size-3.5 shrink-0" />
              <span className="line-clamp-1">{venueName}</span>
            </div>
          )}
        </div>

        {card.content && (
          <p className="line-clamp-2 text-muted-foreground text-xs">
            {card.content}
          </p>
        )}
      </CardContent>

      <CardAction>
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
      </CardAction>
    </Card>
  );
});
