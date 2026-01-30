"use client";

import { Skeleton } from "@repo/design-system/components/ui/skeleton";
import { useEffect, useState } from "react";
import { fetchWasteReports, type WasteReportData } from "./lib/waste-analytics";

export function WasteReportsClient() {
  const [data, setData] = useState<WasteReportData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    const load = async () => {
      try {
        const result = await fetchWasteReports();
        if (isActive) {
          setData(result);
        }
      } catch (err) {
        if (isActive) {
          setError(
            err instanceof Error ? err.message : "Failed to load waste reports"
          );
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      isActive = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-56 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-sm text-destructive">
        {error ?? "Failed to load waste reports"}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <div>
          <p className="text-sm text-muted-foreground">Total Cost</p>
          <p className="text-2xl font-bold">
            ${data.summary.totalCost.toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Total Quantity</p>
          <p className="text-2xl font-bold">
            {data.summary.totalQuantity.toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Entries</p>
          <p className="text-2xl font-bold">{data.summary.entryCount}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Avg Cost/Entry</p>
          <p className="text-2xl font-bold">
            ${data.summary.avgCostPerEntry.toFixed(2)}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold">Waste by Reason</h3>
        <div className="space-y-2">
          {data.reports.map((item) => (
            <div
              className="flex items-center justify-between rounded-lg border p-4"
              key={item.key}
            >
              <div>
                <p className="font-medium">{item.label}</p>
                <p className="text-sm text-muted-foreground">
                  {item.count} entries - {item.avgQuantityPerEntry.toFixed(2)}{" "}
                  avg qty
                </p>
              </div>
              <div className="text-right">
                <p className="font-medium">${item.totalCost.toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">
                  ${item.avgCostPerEntry.toFixed(2)}/entry
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
