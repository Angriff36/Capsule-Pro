/**
 * Command Performance — client component.
 *
 * Fetches per-command latency percentiles from `/api/command-perf/list` and
 * renders them as a ranked table (slowest P95 first) with a slow-command alert
 * banner. Read-only: this surface never mutates governed state.
 */

"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { Card, CardContent } from "@repo/design-system/components/ui/card";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/app/lib/api";

interface CommandPerfRow {
  avg: number;
  breachesThreshold: boolean;
  command: string;
  count: number;
  entity: string | null;
  failures: number;
  max: number;
  p50: number;
  p95: number;
  p99: number;
}

interface CommandPerfResponse {
  breachCount: number;
  commands: CommandPerfRow[];
  generatedAt: string;
  thresholdMs: number;
  windowHours: number;
}

const WINDOW_OPTIONS = [
  { label: "1h", value: 1 },
  { label: "24h", value: 24 },
  { label: "7d", value: 168 },
  { label: "30d", value: 720 },
] as const;

export function CommandPerfClient() {
  const [data, setData] = useState<CommandPerfResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [windowHours, setWindowHours] = useState(24);

  const fetchPerf = useCallback(async (hours: number) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ windowHours: hours.toString() });
      const response = await apiFetch(`/api/command-perf/list?${params}`);
      if (!response.ok) {
        throw new Error("Failed to fetch command performance");
      }
      const json: CommandPerfResponse = await response.json();
      setData(json);
    } catch (error) {
      console.error("Error fetching command performance:", error);
      toast.error("Failed to load command performance");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPerf(windowHours);
  }, [fetchPerf, windowHours]);

  const commands = data?.commands ?? [];

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-md border p-1">
          {WINDOW_OPTIONS.map((option) => (
            <Button
              key={option.value}
              onClick={() => setWindowHours(option.value)}
              size="sm"
              variant={windowHours === option.value ? "default" : "ghost"}
            >
              {option.label}
            </Button>
          ))}
        </div>
        <Button
          onClick={() => fetchPerf(windowHours)}
          size="sm"
          variant="ghost"
        >
          Refresh
        </Button>
        {data && (
          <span className="ml-auto text-muted-foreground text-sm">
            {commands.length} command{commands.length === 1 ? "" : "s"} · P95
            threshold {data.thresholdMs}ms
          </span>
        )}
      </div>

      {/* Alert banner — fires when any command's P95 exceeds the threshold. */}
      {data && data.breachCount > 0 && (
        <Card className="border-red-500/40 bg-red-500/5">
          <CardContent className="p-4 text-sm">
            <span className="font-medium text-red-600">
              ⚠ {data.breachCount} command
              {data.breachCount === 1 ? "" : "s"} exceeding the{" "}
              {data.thresholdMs}ms P95 threshold
            </span>
            <span className="text-muted-foreground">
              {" "}
              over the last {data.windowHours}h — see the highlighted rows
              below.
            </span>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      {isLoading && !data ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground text-sm">
            Loading command performance…
          </CardContent>
        </Card>
      ) : commands.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground text-sm">
            No command executions recorded in this window. Trigger a governed
            command to see latency percentiles appear here.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground text-xs">
                    <th className="px-4 py-3 font-medium">Command</th>
                    <th className="px-4 py-3 text-right font-medium">Count</th>
                    <th className="px-4 py-3 text-right font-medium">P50</th>
                    <th className="px-4 py-3 text-right font-medium">P95</th>
                    <th className="px-4 py-3 text-right font-medium">P99</th>
                    <th className="px-4 py-3 text-right font-medium">Max</th>
                    <th className="px-4 py-3 text-right font-medium">Avg</th>
                  </tr>
                </thead>
                <tbody>
                  {commands.map((row) => (
                    <tr
                      className={`border-b last:border-0 ${
                        row.breachesThreshold ? "bg-red-500/5" : ""
                      }`}
                      key={`${row.entity ?? "_"}.${row.command}`}
                    >
                      <td className="px-4 py-2.5">
                        <span className="font-medium font-mono">
                          {row.entity
                            ? `${row.entity}.${row.command}`
                            : row.command}
                        </span>
                        {row.breachesThreshold && (
                          <span className="ml-2 inline-flex items-center rounded-full border border-red-500/20 bg-red-500/10 px-1.5 py-0.5 font-medium text-red-600 text-xs">
                            slow
                          </span>
                        )}
                        {row.failures > 0 && (
                          <span className="ml-2 text-muted-foreground text-xs">
                            {row.failures} failed
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right text-muted-foreground tabular-nums">
                        {row.count}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        {row.p50}ms
                      </td>
                      <td
                        className={`px-4 py-2.5 text-right font-medium tabular-nums ${
                          row.breachesThreshold ? "text-red-600" : ""
                        }`}
                      >
                        {row.p95}ms
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        {row.p99}ms
                      </td>
                      <td className="px-4 py-2.5 text-right text-muted-foreground tabular-nums">
                        {row.max}ms
                      </td>
                      <td className="px-4 py-2.5 text-right text-muted-foreground tabular-nums">
                        {row.avg}ms
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
