"use client";

import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Checkbox } from "@repo/design-system/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import { Loader2, Sparkles } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/app/lib/api";
import { crmProposalAutomation } from "@/app/lib/routes";

interface EligibleEvent {
  eventDate: string | null;
  guestCount: number | null;
  hasClient: boolean;
  id: string;
  status: string;
  title: string;
}

export function ProposalAutomationClient() {
  const [events, setEvents] = useState<EligibleEvent[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(crmProposalAutomation());
      if (!res.ok) {
        throw new Error("load failed");
      }
      const json = (await res.json()) as { eligible: EligibleEvent[] };
      setEvents(json.eligible);
      setSelected(new Set());
    } catch {
      toast.error("Failed to load eligible events");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = (id: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const generate = async () => {
    if (selected.size === 0) {
      toast.error("Select at least one event");
      return;
    }
    setGenerating(true);
    try {
      const res = await apiFetch(crmProposalAutomation(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventIds: [...selected] }),
      });
      const json = (await res.json()) as {
        generated: number;
        failed: number;
      };
      if (!res.ok) {
        throw new Error("generate failed");
      }
      toast.success(`Generated ${json.generated} proposal(s)`);
      if (json.failed > 0) {
        toast.warning(`${json.failed} failed`);
      }
      await load();
    } catch {
      toast.error("Proposal generation failed");
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-semibold text-2xl">Proposal Automation</h1>
          <p className="text-muted-foreground text-sm">
            Bulk-generate CRM proposals for events that do not have one yet.
          </p>
        </div>
        <Button disabled={generating} onClick={generate}>
          {generating ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Sparkles className="mr-2 size-4" />
          )}
          Generate selected
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Eligible events</CardTitle>
          <CardDescription>{events.length} without proposals</CardDescription>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              All recent events already have proposals.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead />
                  <TableHead>Event</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Guests</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell>
                      <Checkbox
                        checked={selected.has(event.id)}
                        onCheckedChange={(v) => toggle(event.id, v === true)}
                      />
                    </TableCell>
                    <TableCell>{event.title}</TableCell>
                    <TableCell>
                      {event.eventDate
                        ? new Date(event.eventDate).toLocaleDateString()
                        : "—"}
                    </TableCell>
                    <TableCell>{event.guestCount ?? "—"}</TableCell>
                    <TableCell>{event.status}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
