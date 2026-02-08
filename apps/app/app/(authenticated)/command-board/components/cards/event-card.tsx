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
import Link from "next/link";
import { useRouter } from "next/navigation";
import { memo, useEffect, useState } from "react";
import type { EventEntityData } from "../../actions/entity-data";
import { getEntityData } from "../../actions/entity-data";
import type { CommandBoardCard } from "../../types";

interface EventCardProps {
  card: CommandBoardCard;
}

const statusVariantMap = {
  confirmed: "default" as const,
  tentative: "secondary" as const,
  cancelled: "destructive" as const,
  completed: "secondary" as const,
  draft: "outline" as const,
};

export const EventCard = memo(function EventCard({ card }: EventCardProps) {
  const router = useRouter();
  const [entityData, setEntityData] = useState<EventEntityData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch live entity data if card is linked to an entity
  useEffect(() => {
    if (card.entityType === "event" && card.entityId) {
      setIsLoading(true);
      getEntityData("event", card.entityId)
        .then((data) => {
          if (data && data.entityType === "event") {
            setEntityData(data);
          }
        })
        .finally(() => setIsLoading(false));
    }
  }, [card.entityId, card.entityType]);

  // Use live data if available, otherwise fall back to metadata (for backwards compatibility)
  const status = entityData?.status ?? "confirmed";
  const variant =
    statusVariantMap[status as keyof typeof statusVariantMap] ?? "outline";
  const eventDate = entityData?.eventDate
    ? new Date(entityData.eventDate)
    : null;
  const guestCount = entityData?.guestCount ?? 0;
  const budget = entityData?.budget;
  const venueName = entityData?.venueName;
  const eventType = entityData?.eventType ?? "Event";
  const eventId = entityData?.eventId ?? card.entityId;

  const isLinked = !!card.entityId && card.entityType === "event";

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 space-y-1.5">
            <div className="flex items-center gap-2 text-xs">
              <CardDescription className="capitalize text-muted-foreground">
                {eventType}
                {isLinked && (
                  <span className="ml-1.5 inline-flex items-center rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                    Live
                  </span>
                )}
              </CardDescription>
            </div>
            {isLinked ? (
              <Link
                className="block hover:underline"
                href={`/events/${eventId}`}
                onClick={(e) => e.stopPropagation()}
              >
                <CardTitle className="line-clamp-2 leading-tight">
                  {card.title}
                </CardTitle>
              </Link>
            ) : (
              <CardTitle className="line-clamp-2 leading-tight">
                {card.title}
              </CardTitle>
            )}
          </div>
          <CardAction>
            <Badge className="capitalize" variant={variant}>
              {isLoading ? "..." : status}
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
            {isLinked ? (
              <>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/events/${eventId}`);
                  }}
                >
                  View Event
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/events/${eventId}/edit`);
                  }}
                >
                  Edit Details
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/events/${eventId}/battle-board`);
                  }}
                >
                  Open Battle Board
                </DropdownMenuItem>
              </>
            ) : (
              <>
                <DropdownMenuItem disabled>View Event</DropdownMenuItem>
                <DropdownMenuItem disabled>Edit Details</DropdownMenuItem>
              </>
            )}
            <DropdownMenuItem disabled>View Proposal</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardAction>
    </Card>
  );
});
