"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@repo/design-system/components/ui/avatar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import { AlertCircle, ArrowRight, CheckCircle2, Clock, Grab, User } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface TeamActivityItem {
  id: string;
  kind: "claim" | "release" | "progress";
  taskId: string;
  taskTitle: string | null;
  employeeId: string;
  employeeName: string | null;
  employeeAvatarUrl: string | null;
  action: string;
  detail: string | null;
  oldStatus: string | null;
  newStatus: string | null;
  createdAt: string;
}

function kindIcon(kind: TeamActivityItem["kind"]) {
  switch (kind) {
    case "claim":
      return <Grab className="h-3.5 w-3.5 text-emerald-600" />;
    case "release":
      return <AlertCircle className="h-3.5 w-3.5 text-amber-600" />;
    case "progress":
      return <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />;
  }
}

function initials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function TeamActivityFeed() {
  const [items, setItems] = useState<TeamActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActivity = useCallback(async () => {
    try {
      const res = await fetch("/api/kitchen/team-activity?limit=10");
      if (!res.ok) return;
      const data = await res.json();
      setItems(data.data?.items ?? data.items ?? []);
    } catch {
      // Silently fail — activity feed is non-critical
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActivity();
    const interval = setInterval(fetchActivity, 30_000);
    return () => clearInterval(interval);
  }, [fetchActivity]);

  return (
    <Card className="border-hairline" tone="canvas">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="font-semibold text-sm">Team Activity</CardTitle>
          {loading && items.length === 0 && (
            <Clock className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground text-sm">
            {loading ? "Loading activity..." : "No recent activity"}
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-2 rounded-md px-2 py-1.5 hover:bg-soft-stone/50 transition-colors"
            >
              <Avatar className="h-6 w-6 mt-0.5">
                {item.employeeAvatarUrl && (
                  <AvatarImage src={item.employeeAvatarUrl} alt={item.employeeName ?? ""} />
                )}
                <AvatarFallback className="text-[10px]">
                  {initials(item.employeeName)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  {kindIcon(item.kind)}
                  <span className="text-xs font-medium truncate">
                    {item.employeeName ?? "Unknown"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {item.action}
                  {item.taskTitle ? ` — ${item.taskTitle}` : ""}
                </p>
                {item.oldStatus && item.newStatus && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-[10px] text-muted-foreground">{item.oldStatus}</span>
                    <ArrowRight className="h-2.5 w-2.5 text-muted-foreground" />
                    <span className="text-[10px] font-medium">{item.newStatus}</span>
                  </div>
                )}
              </div>
              <span className="text-[10px] text-muted-foreground whitespace-nowrap mt-1">
                {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
              </span>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
