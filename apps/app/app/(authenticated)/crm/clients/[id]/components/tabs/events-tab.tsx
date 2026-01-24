"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import { Card, CardContent } from "@repo/design-system/components/ui/card";
import { CalendarIcon, ChevronRightIcon, DollarSignIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getClientEventHistory } from "../../../actions";

interface EventsTabProps {
  clientId: string;
}

export function EventsTab({ clientId }: EventsTabProps) {
  const [events, setEvents] = useState<
    Array<{
      id: string;
      createdAt: Date;
      orderNumber: string;
      order_status: string;
      totalAmount: { toString: () => string };
    }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    offset: 0,
    limit: 20,
    total: 0,
  });

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const data = await getClientEventHistory(
        clientId,
        pagination.limit,
        pagination.offset
      );
      setEvents(data.data);
      setPagination((prev) => ({ ...prev, total: data.pagination.total }));
    } catch (error) {
      toast.error("Failed to load events");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [clientId, pagination.offset]);

  const loadMore = () => {
    setPagination((prev) => ({
      ...prev,
      offset: prev.offset + prev.limit,
    }));
  };

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-xl font-semibold">
        Event History ({pagination.total})
      </h2>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">
          Loading events...
        </div>
      ) : events.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <CalendarIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No events yet</h3>
            <p className="text-muted-foreground">
              This client hasn't been associated with any events yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <Card key={event.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                    <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="font-medium">
                      Order #{event.orderNumber}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <Badge className="text-xs" variant="outline">
                        {event.order_status}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-sm">
                      <DollarSignIcon className="h-3 w-3 text-muted-foreground" />
                      <span className="font-medium">
                        {Number(event.totalAmount.toString()).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(event.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </div>
                  </div>
                  <Button asChild size="sm" variant="ghost">
                    <a href={`/crm/clients/${clientId}`}>
                      <ChevronRightIcon className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {pagination.offset + pagination.limit < pagination.total && (
            <div className="text-center">
              <Button onClick={loadMore} variant="outline">
                Load More
                <ChevronRightIcon className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
