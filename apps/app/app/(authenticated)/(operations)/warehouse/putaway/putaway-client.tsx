"use client";

import { StatusPill } from "@repo/design-system/components/blocks/page-shell";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@repo/design-system/components/ui/empty";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { Loader2, MapPin, Package } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/app/lib/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PutawayStatus = "pending" | "in_progress" | "completed";

interface PutawayTask {
  category: string;
  destinationLocationId: string;
  destinationLocationName: string;
  destinationStorageType: string;
  id: string;
  itemId: string;
  itemName: string;
  itemNumber: string;
  notes: string | null;
  quantity: number;
  source: string;
  status: PutawayStatus;
  transactionDate: string;
  unitCost: number;
  unitOfMeasure: string;
}

interface StorageLocation {
  id: string;
  name: string;
  storageType: string;
}

interface PutawayMetrics {
  completedToday: number;
  locationsUsed: number;
  pendingTasks: number;
}

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

const STATUS_STYLES: Record<PutawayStatus, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  in_progress: "bg-blue-50 text-blue-700 border-blue-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const STATUS_LABELS: Record<PutawayStatus, string> = {
  pending: "Pending",
  in_progress: "In progress",
  completed: "Completed",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface PutawayClientProps {
  initialMetrics: PutawayMetrics;
}

export function PutawayClient({ initialMetrics }: PutawayClientProps) {
  const [tasks, setTasks] = useState<PutawayTask[]>([]);
  const [locations, setLocations] = useState<StorageLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");

  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const params = new URLSearchParams({
        status: statusFilter,
        ...(locationFilter !== "all" && { locationId: locationFilter }),
      });
      const res = await apiFetch(`/api/warehouse/putaway?${params}`);
      if (!res.ok) {
        throw new Error("Failed to fetch putaway tasks");
      }
      const data = await res.json();
      setTasks(data.tasks ?? []);
      setLocations(data.locations ?? []);
    } catch {
      // Surface the failure — an error must not render as "no tasks".
      setLoadError("Could not load putaway tasks. Try again.");
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, locationFilter]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const formatDate = (d: string) =>
    new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(d));

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select onValueChange={setStatusFilter} value={statusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>

        <Select onValueChange={setLocationFilter} value={locationFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Location" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All locations</SelectItem>
            {locations.map((loc) => (
              <SelectItem key={loc.id} value={loc.id}>
                {loc.name} ({loc.storageType})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center gap-3 py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading putaway tasks...</span>
        </div>
      ) : loadError ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Package />
            </EmptyMedia>
            <EmptyTitle>Failed to load putaway tasks</EmptyTitle>
            <EmptyDescription>{loadError}</EmptyDescription>
          </EmptyHeader>
          <button
            className="mx-auto mt-2 rounded-md border border-hairline px-3 py-1.5 text-sm hover:bg-soft-stone"
            onClick={fetchTasks}
            type="button"
          >
            Retry
          </button>
        </Empty>
      ) : tasks.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Package />
            </EmptyMedia>
            <EmptyTitle>No putaway tasks found</EmptyTitle>
            <EmptyDescription>
              Receive stock to generate putaway tasks automatically.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-hairline">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-hairline border-b bg-soft-stone">
                <th className="px-4 py-3 text-left font-medium text-ink/70">
                  Item
                </th>
                <th className="px-4 py-3 text-left font-medium text-ink/70">
                  Source
                </th>
                <th className="px-4 py-3 text-left font-medium text-ink/70">
                  Destination
                </th>
                <th className="px-4 py-3 text-right font-medium text-ink/70">
                  Qty
                </th>
                <th className="px-4 py-3 text-left font-medium text-ink/70">
                  Status
                </th>
                <th className="px-4 py-3 text-left font-medium text-ink/70">
                  Date
                </th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr
                  className="border-hairline border-b transition-colors last:border-0 hover:bg-soft-stone/50"
                  key={task.id}
                >
                  <td className="px-4 py-3">
                    <div>
                      <span className="font-medium text-ink">
                        {task.itemName}
                      </span>
                      {task.itemNumber && (
                        <span className="ml-2 text-ink/50 text-xs">
                          {task.itemNumber}
                        </span>
                      )}
                    </div>
                    <div className="text-ink/50 text-xs">{task.category}</div>
                  </td>
                  <td className="px-4 py-3 text-ink/70">{task.source}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="size-3.5 text-ink/40" />
                      <span className="text-ink">
                        {task.destinationLocationName}
                      </span>
                    </div>
                    {task.destinationStorageType && (
                      <div className="ml-5 text-ink/50 text-xs">
                        {task.destinationStorageType}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-ink">
                    {task.quantity} {task.unitOfMeasure}
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill className={STATUS_STYLES[task.status]}>
                      {STATUS_LABELS[task.status]}
                    </StatusPill>
                  </td>
                  <td className="px-4 py-3 text-ink/50 text-xs">
                    {formatDate(task.transactionDate)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary footer */}
      {!isLoading && tasks.length > 0 && (
        <div className="flex items-center justify-between text-ink/50 text-xs">
          <span>
            {tasks.length} task{tasks.length === 1 ? "" : "s"} shown
          </span>
          <span>
            {initialMetrics.pendingTasks} pending /{" "}
            {initialMetrics.completedToday} completed today
          </span>
        </div>
      )}
    </div>
  );
}
