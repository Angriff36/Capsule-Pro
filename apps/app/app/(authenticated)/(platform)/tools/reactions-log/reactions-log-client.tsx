/**
 * Reaction Execution Log — client component.
 *
 * Fetches the initial page of reaction-log rows from
 * `/api/reactions-log/list` and then streams new rows live via the tenant's
 * SSE channel (`tenant:{tenantId}:reactions`), prepending them as commands
 * fire. Read-only: this surface never mutates governed state.
 */

"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { Card, CardContent } from "@repo/design-system/components/ui/card";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/app/lib/api";
import {
  type RealtimeEventMessage,
  useRealtimeChannel,
} from "@/app/lib/use-realtime-channel";

interface ReactionLogItem {
  actorId: string | null;
  causationId: string | null;
  command: string;
  correlationId: string | null;
  createdAt: string;
  durationMs: number | null;
  emittedEvents: string[];
  entity: string | null;
  errorMessage: string | null;
  /** Present on persisted rows; synthesized for live-streamed rows. */
  id?: string;
  payloadKeys: string[];
  reactions: string[];
  retryCount?: number;
  source: string | null;
  status: string;
  tenantId: string;
  /** Client-only key for live-streamed rows (which carry no DB id). */
  _streamKey?: string;
}

interface ReactionLogResponse {
  hasMore: boolean;
  logs: ReactionLogItem[];
  totalCount: number;
}

type StatusFilter = "all" | "success" | "failed";

const LIMIT = 50;

const REACTION_EVENT = "reaction.logged";

export function ReactionsLogClient({ tenantId }: { tenantId: string }) {
  const [logs, setLogs] = useState<ReactionLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [live, setLive] = useState(true);
  const streamCounter = useRef(0);

  const fetchLogs = useCallback(
    async (currentOffset = 0, currentStatus: StatusFilter = "all") => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          limit: LIMIT.toString(),
          offset: currentOffset.toString(),
        });
        if (currentStatus !== "all") {
          params.set("status", currentStatus);
        }

        const response = await apiFetch(`/api/reactions-log/list?${params}`);
        if (!response.ok) {
          throw new Error("Failed to fetch reaction log");
        }
        const data: ReactionLogResponse = await response.json();

        setLogs((prev) =>
          currentOffset === 0 ? data.logs : [...prev, ...data.logs]
        );
        setHasMore(data.hasMore);
        setOffset(currentOffset);
      } catch (error) {
        console.error("Error fetching reaction log:", error);
        toast.error("Failed to load reaction log");
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchLogs(0, statusFilter);
  }, [fetchLogs, statusFilter]);

  // Live stream: prepend new rows as commands fire.
  const handleRealtime = useCallback(
    (message: RealtimeEventMessage<ReactionLogItem>) => {
      if (message.name !== REACTION_EVENT) {
        return;
      }
      const incoming = message.data;
      streamCounter.current += 1;
      const row: ReactionLogItem = {
        ...incoming,
        _streamKey: `stream-${streamCounter.current}`,
      };
      setLogs((prev) => {
        if (statusFilter !== "all" && row.status !== statusFilter) {
          return prev;
        }
        return [row, ...prev].slice(0, 500);
      });
    },
    [statusFilter]
  );

  useRealtimeChannel<ReactionLogItem>(tenantId, handleRealtime, {
    channels: [`tenant:${tenantId}:reactions`],
    enabled: live,
  });

  const failedCount = logs.filter((l) => l.status === "failed").length;

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-md border p-1">
          {(["all", "success", "failed"] as const).map((value) => (
            <Button
              key={value}
              onClick={() => setStatusFilter(value)}
              size="sm"
              variant={statusFilter === value ? "default" : "ghost"}
            >
              {value === "all"
                ? "All"
                : value === "success"
                  ? "Success"
                  : "Failed"}
            </Button>
          ))}
        </div>
        <Button
          onClick={() => setLive((v) => !v)}
          size="sm"
          variant={live ? "default" : "outline"}
        >
          {live ? "● Live" : "Paused"}
        </Button>
        <Button
          onClick={() => fetchLogs(0, statusFilter)}
          size="sm"
          variant="ghost"
        >
          Refresh
        </Button>
        <span className="ml-auto text-muted-foreground text-sm">
          {logs.length} shown
          {failedCount > 0 ? ` · ${failedCount} failed` : ""}
        </span>
      </div>

      {/* List */}
      {isLoading && logs.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground text-sm">
            Loading reaction log…
          </CardContent>
        </Card>
      ) : logs.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground text-sm">
            No reaction executions recorded yet. Trigger a governed command to
            see entries appear here live.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {logs.map((logRow) => (
            <ReactionLogCard
              key={logRow.id ?? logRow._streamKey ?? `${logRow.createdAt}`}
              row={logRow}
            />
          ))}
        </div>
      )}

      {hasMore && !isLoading && (
        <div className="flex justify-center">
          <Button
            onClick={() => fetchLogs(offset + LIMIT, statusFilter)}
            variant="outline"
          >
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}

function ReactionLogCard({ row }: { row: ReactionLogItem }) {
  const failed = row.status === "failed";
  return (
    <Card className={failed ? "border-red-500/30" : undefined}>
      <CardContent className="flex flex-col gap-2 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 font-medium text-xs ${
              failed
                ? "border-red-500/20 bg-red-500/10 text-red-500"
                : "border-green-500/20 bg-green-500/10 text-green-600"
            }`}
          >
            {failed ? "failed" : "success"}
          </span>
          <span className="font-mono font-medium text-sm">
            {row.entity ? `${row.entity}.${row.command}` : row.command}
          </span>
          {typeof row.durationMs === "number" && (
            <span className="text-muted-foreground text-xs">
              {row.durationMs}ms
            </span>
          )}
          <span className="ml-auto text-muted-foreground text-xs">
            {new Date(row.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </span>
        </div>

        {row.reactions.length > 0 && (
          <div className="text-xs">
            <span className="text-muted-foreground">Reactions fired: </span>
            {row.reactions.map((reaction) => (
              <span
                className="mr-1 inline-flex items-center rounded border border-blue-500/20 bg-blue-500/10 px-1.5 py-0.5 font-mono text-blue-600"
                key={reaction}
              >
                {reaction}
              </span>
            ))}
          </div>
        )}

        {row.emittedEvents.length > 0 && (
          <div className="text-muted-foreground text-xs">
            Emitted: {row.emittedEvents.join(", ")}
          </div>
        )}

        {row.payloadKeys.length > 0 && (
          <div className="text-muted-foreground text-xs">
            Payload: {row.payloadKeys.join(", ")}
          </div>
        )}

        {failed && row.errorMessage && (
          <div className="rounded bg-red-500/5 p-2 font-mono text-red-600 text-xs">
            {row.errorMessage}
          </div>
        )}

        {row.correlationId && (
          <div className="text-muted-foreground text-xs">
            correlation: <span className="font-mono">{row.correlationId}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
