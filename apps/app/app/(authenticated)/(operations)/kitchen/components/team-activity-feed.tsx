"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@repo/design-system/components/ui/avatar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Grab,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface TeamActivityItem {
  action: string;
  createdAt: string;
  detail: string | null;
  employeeAvatarUrl: string | null;
  employeeId: string;
  employeeName: string | null;
  id: string;
  kind: "claim" | "release" | "progress";
  newStatus: string | null;
  oldStatus: string | null;
  taskId: string;
  taskTitle: string | null;
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
  if (!name) {
    return "?";
  }
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
      if (!res.ok) {
        return;
      }
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
          <div className="py-4 text-center text-muted-foreground text-sm">
            {loading ? "Loading activity..." : "No recent activity"}
          </div>
        ) : (
          items.map((item) => (
            <div
              className="flex items-start gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-soft-stone/50"
              key={item.id}
            >
              <Avatar className="mt-0.5 h-6 w-6">
                {item.employeeAvatarUrl && (
                  <AvatarImage
                    alt={item.employeeName ?? ""}
                    src={item.employeeAvatarUrl}
                  />
                )}
                <AvatarFallback className="text-[10px]">
                  {initials(item.employeeName)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  {kindIcon(item.kind)}
                  <span className="truncate font-medium text-xs">
                    {item.employeeName ?? "Unknown"}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-muted-foreground text-xs">
                  {item.action}
                  {item.taskTitle ? ` — ${item.taskTitle}` : ""}
                </p>
                {item.oldStatus && item.newStatus && (
                  <div className="mt-0.5 flex items-center gap-1">
                    <span className="text-[10px] text-muted-foreground">
                      {item.oldStatus}
                    </span>
                    <ArrowRight className="h-2.5 w-2.5 text-muted-foreground" />
                    <span className="font-medium text-[10px]">
                      {item.newStatus}
                    </span>
                  </div>
                )}
              </div>
              <span className="mt-1 whitespace-nowrap text-[10px] text-muted-foreground">
                {formatDistanceToNow(new Date(item.createdAt), {
                  addSuffix: true,
                })}
              </span>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
