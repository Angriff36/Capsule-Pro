"use client";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { UnifiedRequest } from "./page";

const STATUS_COLOR: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  PENDING: "secondary",
  APPROVED: "default",
  REJECTED: "destructive",
  CANCELLED: "outline",
};

const TYPE_LABEL: Record<string, string> = {
  time_off: "🕐 Time-off",
  timecard_edit: "📝 Timecard",
};

export function RequestsClient({ requests }: { requests: UnifiedRequest[] }) {
  if (requests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
        <p className="text-sm text-muted-foreground">No pending requests</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Employee</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Detail</TableHead>
            <TableHead>Submitted</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map((r) => (
            <TableRow key={`${r.type}:${r.id}`}>
              <TableCell>
                <div className="font-medium">{r.employee}</div>
                <div className="text-xs text-muted-foreground">
                  {r.employeeRole}
                </div>
              </TableCell>
              <TableCell>
                <span className="text-sm">
                  {TYPE_LABEL[r.type] ?? r.type}
                </span>
              </TableCell>
              <TableCell>
                <div className="text-sm">{r.detail}</div>
                {r.reason && (
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {r.reason}
                  </div>
                )}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {r.submitted}
              </TableCell>
              <TableCell>
                <Badge variant={STATUS_COLOR[r.status] ?? "secondary"}>
                  {r.status}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
