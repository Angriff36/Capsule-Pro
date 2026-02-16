"use client";

import { Skeleton } from "@repo/design-system/components/ui/skeleton";
import { useEffect, useState } from "react";
import { fetchWasteTrends, type WasteTrendsData } from "./lib/waste-analytics";

export function WasteTrendsClient() {
  const [data, setData] = useState<WasteTrendsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    const load = async () => {
      try {
        const result = await fetchWasteTrends();
        if (isActive) {
          setData(result);
        }
      } catch (err) {
        if (isActive) {
          setError(
            err instanceof Error ? err.message : "Failed to load waste trends"
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
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-sm text-destructive">
        {error ?? "Failed to load waste trends"}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        {data.summary.totalEntries} entries in the last 30 days
      </div>
      <div className="space-y-2">
        {data.topReasons.map((item) => (
          <div
            className="flex items-center justify-between text-sm"
            key={item.reason.id}
          >
            <span>{item.reason.name}</span>
            <span className="font-medium">${item.cost.toFixed(2)}</span>
          </div>
        ))}
      </div>
      {data.reductionOpportunities.length > 0 && (
        <div className="rounded-md bg-muted p-4 text-sm">
          <p className="font-medium mb-2">Reduction Opportunities:</p>
          <ul className="space-y-1 list-disc list-inside">
            {data.reductionOpportunities.map((opp, index) => (
              <li key={index}>
                {opp.description} - Save ${opp.potentialSavings.toFixed(2)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
