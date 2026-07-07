"use client";

import { StatusPill } from "@repo/design-system/components/blocks/page-shell";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { BoxSelect, Clock, PackageCheck, ShoppingCart } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/app/lib/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PickPriority = "high" | "medium" | "low";
type PickStatus = "pending" | "in_progress" | "picked" | "packed" | "shipped";

interface PickQueueItem {
  id: string;
  itemName: string;
  itemNumber: string;
  locationName: string;
  orderRef: string;
  priority: PickPriority;
  quantity: number;
  status: PickStatus;
  storageType: string;
  strategy: "FIFO" | "FEFO";
  transactionDate: string;
}

interface PickPackMetrics {
  openPicks: number;
  packComplete: number;
  picksToday: number;
}

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

const PRIORITY_STYLES: Record<PickPriority, string> = {
  high: "bg-red-50 text-red-700 border-red-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  low: "bg-slate-50 text-slate-600 border-slate-200",
};

const PICK_STATUS_STYLES: Record<PickStatus, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  in_progress: "bg-blue-50 text-blue-700 border-blue-200",
  picked: "bg-indigo-50 text-indigo-700 border-indigo-200",
  packed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  shipped: "bg-slate-50 text-slate-600 border-slate-200",
};

const PICK_STATUS_LABELS: Record<PickStatus, string> = {
  pending: "Pending",
  in_progress: "Picking",
  picked: "Picked",
  packed: "Packed",
  shipped: "Shipped",
};

const STRATEGY_STYLES: Record<string, string> = {
  FIFO: "bg-cyan-50 text-cyan-700 border-cyan-200",
  FEFO: "bg-purple-50 text-purple-700 border-purple-200",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface PickPackClientProps {
  initialMetrics: PickPackMetrics;
}

export function PickPackClient({ initialMetrics }: PickPackClientProps) {
  const [pickQueue, setPickQueue] = useState<PickQueueItem[]>([]);
  const [packingItems, setPackingItems] = useState<PickQueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const params = new URLSearchParams({ status: statusFilter });
      const res = await apiFetch(`/api/warehouse/pick-pack?${params}`);
      if (!res.ok) {
        throw new Error("Failed to fetch pick/pack data");
      }
      const data = await res.json();
      setPickQueue(data.pickQueue ?? []);
      setPackingItems(data.packingItems ?? []);
    } catch {
      // Surface the failure — an error must not render as "no picks".
      setLoadError("Could not load pick & pack data. Try again.");
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatDate = (d: string) =>
    new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(d));

  return (
    <div className="space-y-6">
      {/* Filter */}
      <div className="flex items-center gap-3">
        <Select onValueChange={setStatusFilter} value={statusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">Picking</SelectItem>
            <SelectItem value="picked">Picked</SelectItem>
            <SelectItem value="packed">Packed</SelectItem>
            <SelectItem value="shipped">Shipped</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-ink/50">
          Loading pick & pack data...
        </div>
      ) : loadError ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-ink/60">
          <p className="text-sm">{loadError}</p>
          <button
            className="rounded-md border border-hairline px-3 py-1.5 text-sm hover:bg-soft-stone"
            onClick={fetchData}
            type="button"
          >
            Retry
          </button>
        </div>
      ) : (
        <>
          {/* ---- Pick Queue Section ---- */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 font-medium text-ink text-sm">
              <ShoppingCart className="size-4" />
              <span>Pick Queue</span>
              <span className="font-normal text-ink/50">
                ({pickQueue.length} order{pickQueue.length === 1 ? "" : "s"})
              </span>
            </div>

            {pickQueue.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-10 text-ink/50">
                <BoxSelect className="size-8 opacity-30" />
                <p className="text-sm">No picks in queue</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-hairline">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-hairline border-b bg-soft-stone">
                      <th className="px-4 py-3 text-left font-medium text-ink/70">
                        Order
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-ink/70">
                        Item
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-ink/70">
                        Location
                      </th>
                      <th className="px-4 py-3 text-right font-medium text-ink/70">
                        Qty
                      </th>
                      <th className="px-4 py-3 text-center font-medium text-ink/70">
                        Priority
                      </th>
                      <th className="px-4 py-3 text-center font-medium text-ink/70">
                        Strategy
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
                    {pickQueue.map((item) => (
                      <tr
                        className="border-hairline border-b transition-colors last:border-0 hover:bg-soft-stone/50"
                        key={item.id}
                      >
                        <td className="px-4 py-3 font-mono text-ink/70 text-xs">
                          {item.orderRef}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-medium text-ink">
                            {item.itemName}
                          </span>
                          {item.itemNumber && (
                            <span className="ml-1.5 text-ink/50 text-xs">
                              {item.itemNumber}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-ink/70">
                          {item.locationName}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-ink">
                          {item.quantity}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <StatusPill
                            className={PRIORITY_STYLES[item.priority]}
                          >
                            {item.priority}
                          </StatusPill>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <StatusPill
                            className={STRATEGY_STYLES[item.strategy]}
                          >
                            {item.strategy}
                          </StatusPill>
                        </td>
                        <td className="px-4 py-3">
                          <StatusPill
                            className={PICK_STATUS_STYLES[item.status]}
                          >
                            {PICK_STATUS_LABELS[item.status]}
                          </StatusPill>
                        </td>
                        <td className="px-4 py-3 text-ink/50 text-xs">
                          {formatDate(item.transactionDate)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ---- Packing Station Section ---- */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 font-medium text-ink text-sm">
              <PackageCheck className="size-4" />
              <span>Packing Station</span>
              <span className="font-normal text-ink/50">
                ({packingItems.length} item
                {packingItems.length === 1 ? "" : "s"})
              </span>
            </div>

            {packingItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-10 text-ink/50">
                <Clock className="size-8 opacity-30" />
                <p className="text-sm">No items awaiting packing</p>
                <p className="text-ink/40 text-xs">
                  Picked items will appear here for verification
                </p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {packingItems.map((item) => (
                  <div
                    className="space-y-2 rounded-lg border border-hairline bg-canvas p-4"
                    key={item.id}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-ink text-sm">
                        {item.itemName}
                      </span>
                      <StatusPill className={PICK_STATUS_STYLES[item.status]}>
                        {PICK_STATUS_LABELS[item.status]}
                      </StatusPill>
                    </div>
                    <div className="space-y-1 text-ink/60 text-xs">
                      <div className="flex justify-between">
                        <span>Order</span>
                        <span className="font-mono">{item.orderRef}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Quantity</span>
                        <span className="font-mono">{item.quantity}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Location</span>
                        <span>{item.locationName}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Strategy</span>
                        <StatusPill
                          className={`${STRATEGY_STYLES[item.strategy]} px-1.5 py-0 text-[10px]`}
                        >
                          {item.strategy}
                        </StatusPill>
                      </div>
                    </div>
                    <div className="border-hairline border-t pt-2 text-ink/40 text-xs">
                      Verification pending
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Summary footer */}
          <div className="flex items-center justify-between pt-2 text-ink/50 text-xs">
            <span>
              {pickQueue.length} pick{pickQueue.length === 1 ? "" : "s"} in
              queue
              {packingItems.length > 0 && ` / ${packingItems.length} packing`}
            </span>
            <span>
              {initialMetrics.openPicks} open / {initialMetrics.packComplete}{" "}
              completed today
            </span>
          </div>
        </>
      )}
    </div>
  );
}
