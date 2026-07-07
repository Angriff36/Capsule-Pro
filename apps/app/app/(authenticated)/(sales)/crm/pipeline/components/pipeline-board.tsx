"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { formatCurrency } from "@repo/design-system/lib/format-currency";
import { format } from "date-fns";
import { Calendar, DollarSign, GripVertical, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  dealUpdateStage,
  listDeals,
} from "@/app/lib/manifest-client.generated";

const fmtCurrency = (v: string | number | null) =>
  formatCurrency(v, { fractionDigits: 0, nullDisplay: "\u2014" });

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Deal {
  client: {
    id: string;
    companyName: string | null;
    firstName: string | null;
    lastName: string | null;
  } | null;
  clientId: string | null;
  createdAt: string;
  eventDate: string | null;
  guestCount: number | null;
  id: string;
  lead: {
    id: string;
    companyName: string | null;
    contactName: string | null;
  } | null;
  leadId: string | null;
  proposalNumber: string;
  proposalStatus: string;
  stage: string;
  title: string;
  total: string | number | null;
}

interface StageColumn {
  color: string;
  description: string;
  id: string;
  title: string;
}

// ---------------------------------------------------------------------------
// Stage configuration
// ---------------------------------------------------------------------------

const STAGES: StageColumn[] = [
  {
    id: "lead",
    title: "Lead",
    description: "New unqualified opportunities",
    color: "bg-muted/20 dark:bg-muted/20",
  },
  {
    id: "qualified",
    title: "Qualified",
    description: "Proposal sent to client",
    color: "bg-muted/20 dark:bg-muted/20",
  },
  {
    id: "proposal",
    title: "Proposal",
    description: "Client has viewed the proposal",
    color: "bg-muted/20 dark:bg-muted/20",
  },
  {
    id: "negotiation",
    title: "Negotiation",
    description: "Accepted, finalizing terms",
    color: "bg-muted/20 dark:bg-muted/20",
  },
  {
    id: "won",
    title: "Won",
    description: "Fully closed and confirmed",
    color: "bg-muted/20 dark:bg-muted/20",
  },
  {
    id: "lost",
    title: "Lost",
    description: "Proposal rejected or lost",
    color: "bg-muted/20 dark:bg-muted/20",
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getClientName(deal: Deal): string {
  if (deal.client?.companyName) {
    return deal.client.companyName;
  }
  if (deal.client) {
    return (
      [deal.client.firstName, deal.client.lastName].filter(Boolean).join(" ") ||
      "No name"
    );
  }
  if (deal.lead?.companyName) {
    return deal.lead.companyName;
  }
  if (deal.lead?.contactName) {
    return deal.lead.contactName;
  }
  return "No client";
}

const stageVariants: Record<
  string,
  "default" | "secondary" | "outline" | "destructive"
> = {
  lead: "secondary",
  qualified: "secondary",
  proposal: "outline",
  negotiation: "default",
  won: "default",
  lost: "destructive",
};

// ---------------------------------------------------------------------------
// Deal Card Component
// ---------------------------------------------------------------------------

function DealCard({
  deal,
  onDragStart,
}: {
  deal: Deal;
  onDragStart: (e: React.DragEvent, deal: Deal) => void;
}) {
  return (
    <div
      className="group cursor-grab rounded-md border border-border/60 bg-card p-3 transition-colors hover:border-border active:cursor-grabbing"
      draggable
      onDragStart={(e) => onDragStart(e, deal)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-sm leading-tight">
            {deal.title}
          </p>
          <p className="mt-0.5 truncate text-muted-foreground text-xs">
            {getClientName(deal)}
          </p>
        </div>
        <GripVertical className="size-4 shrink-0 translate-y-0.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        {deal.total !== null && (
          <span className="flex items-center gap-1 font-medium text-green-700 text-xs dark:text-green-400">
            <DollarSign className="size-3" />
            {fmtCurrency(deal.total)}
          </span>
        )}
        {deal.eventDate && (
          <span className="flex items-center gap-1 text-muted-foreground text-xs">
            <Calendar className="size-3" />
            {format(new Date(deal.eventDate), "MMM d")}
          </span>
        )}
        {deal.guestCount !== null && (
          <span className="flex items-center gap-1 text-muted-foreground text-xs">
            <Users className="size-3" />
            {deal.guestCount.toLocaleString()}
          </span>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between">
        <span className="truncate font-mono text-[10px] text-muted-foreground">
          {deal.proposalNumber}
        </span>
        <Badge
          className="px-1.5 py-0 text-[10px]"
          variant={stageVariants[deal.stage] ?? "secondary"}
        >
          {deal.stage}
        </Badge>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pipeline Board
// ---------------------------------------------------------------------------

interface PipelineBoardProps {
  initialDeals?: Deal[];
}

export function PipelineBoard({ initialDeals }: PipelineBoardProps) {
  const [deals, setDeals] = useState<Deal[]>(initialDeals ?? []);
  const [isLoading, setIsLoading] = useState(!initialDeals);
  const [draggingDeal, setDraggingDeal] = useState<Deal | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchDeals = useCallback(async () => {
    try {
      const result = await listDeals();
      setDeals(result.data as unknown as Deal[]);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load pipeline");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialDeals) {
      fetchDeals();
    }
  }, [fetchDeals, initialDeals]);

  // ---------------------------------------------------------------------------
  // Drag-and-drop handlers (native HTML5)
  // ---------------------------------------------------------------------------

  const handleDragStart = useCallback((e: React.DragEvent, deal: Deal) => {
    setDraggingDeal(deal);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", deal.id);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverStage(stageId);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverStage(null);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent, targetStage: string) => {
      e.preventDefault();
      setDragOverStage(null);

      if (!draggingDeal) {
        return;
      }
      if (draggingDeal.stage === targetStage) {
        setDraggingDeal(null);
        return;
      }

      setIsUpdating(true);
      try {
        await dealUpdateStage({ id: draggingDeal.id, stage: targetStage });

        // Optimistically update local state
        setDeals((prev) =>
          prev.map((d) =>
            d.id === draggingDeal.id
              ? { ...d, stage: targetStage, proposalStatus: targetStage }
              : d
          )
        );

        toast.success(`Moved "${draggingDeal.title}" to ${targetStage}`);
      } catch (err) {
        console.error(err);
        toast.error("Failed to update stage");
      } finally {
        setDraggingDeal(null);
        setIsUpdating(false);
      }
    },
    [draggingDeal]
  );

  const handleDragEnd = useCallback(() => {
    setDraggingDeal(null);
    setDragOverStage(null);
  }, []);

  // ---------------------------------------------------------------------------
  // Compute column data
  // ---------------------------------------------------------------------------

  const dealsByStage = STAGES.reduce<Record<string, Deal[]>>((acc, stage) => {
    acc[stage.id] = deals.filter((d) => d.stage === stage.id);
    return acc;
  }, {});

  const totalsByStage = STAGES.reduce<
    Record<string, { count: number; value: number }>
  >((acc, stage) => {
    const stageDeals = dealsByStage[stage.id] ?? [];
    const value = stageDeals.reduce(
      (sum, d) =>
        sum +
        (typeof d.total === "string"
          ? Number.parseFloat(d.total) || 0
          : (d.total ?? 0)),
      0
    );
    acc[stage.id] = { count: stageDeals.length, value };
    return acc;
  }, {});

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-4">
      {/* Header summary */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-medium text-muted-foreground text-sm">
            {deals.length} deal{deals.length === 1 ? "" : "s"} total
          </h2>
        </div>
        {isUpdating && (
          <span className="animate-pulse text-muted-foreground text-xs">
            Updating…
          </span>
        )}
      </div>

      {/* Kanban columns */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {STAGES.map((stage) => {
          const stageDeals = dealsByStage[stage.id] ?? [];
          const { count, value } = totalsByStage[stage.id] ?? {
            count: 0,
            value: 0,
          };
          const isDragOver = dragOverStage === stage.id;

          return (
            <Card
              className={`flex h-full flex-col transition-colors ${
                isDragOver ? "ring-2 ring-primary" : ""
              }`}
              key={stage.id}
              onDragLeave={handleDragLeave}
              onDragOver={(e) => handleDragOver(e, stage.id)}
              onDrop={(e) => handleDrop(e, stage.id)}
            >
              {/* Column header */}
              <CardHeader className={`rounded-t-lg ${stage.color} pb-3`}>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{stage.title}</CardTitle>
                  <Badge className="text-xs" variant="secondary">
                    {count}
                  </Badge>
                </div>
                <CardDescription className="text-xs">
                  {stage.description}
                </CardDescription>
                <div className="mt-1 font-semibold text-green-700 text-sm dark:text-green-400">
                  {fmtCurrency(value)}
                </div>
              </CardHeader>

              {/* Cards list */}
              <CardContent className="flex-1 space-y-2 overflow-hidden">
                {isLoading ? (
                  <div className="py-4 text-center text-muted-foreground text-sm">
                    Loading…
                  </div>
                ) : stageDeals.length === 0 ? (
                  <div className="rounded-md border border-border/60 border-dashed p-3 text-center text-muted-foreground text-xs">
                    No deals
                  </div>
                ) : (
                  stageDeals.map((deal) => (
                    <DealCard
                      deal={deal}
                      key={deal.id}
                      onDragStart={handleDragStart}
                    />
                  ))
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Hidden drag end handler on the board */}
      <div
        aria-hidden
        className="fixed inset-0 z-0"
        onDragEnd={handleDragEnd}
        style={{ display: "none" }}
      />
    </div>
  );
}
