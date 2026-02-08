"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
} from "@repo/design-system/components/ui/card";
import { PartyPopperIcon } from "lucide-react";
import Link from "next/link";
import { GuestManagement } from "../../components/guest-management";

interface GuestManagementSectionProps {
  eventId: string;
  eventTitle: string;
  isSoldOut: boolean;
  onQuickRsvp: () => void;
}

export function GuestManagementSection({
  eventId,
  eventTitle,
  isSoldOut,
  onQuickRsvp,
}: GuestManagementSectionProps) {
  return (
    <section className="space-y-4" id="guests">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
            Guests & RSVPs
          </p>
          <h2 className="text-2xl font-semibold">Guest management</h2>
          <p className="text-sm text-muted-foreground">
            Manage RSVPs, dietary restrictions, and seating preferences.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            className="bg-success text-success-foreground hover:bg-success/90"
            onClick={onQuickRsvp}
          >
            <PartyPopperIcon className="mr-2 size-4" />
            Quick RSVP
          </Button>
          <Button asChild variant="outline">
            <Link href="/events">View all events</Link>
          </Button>
        </div>
      </div>
      <Card className="border-border/60 bg-card/70 text-foreground">
        <CardContent className="pt-6">
          <GuestManagement eventId={eventId} />
        </CardContent>
      </Card>
    </section>
  );
}
