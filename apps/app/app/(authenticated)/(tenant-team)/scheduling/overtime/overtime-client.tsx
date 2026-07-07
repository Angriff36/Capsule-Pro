"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import { formatCurrency } from "@repo/design-system/lib/format-currency";
import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/app/lib/api";
import { staffOvertimeAlerts } from "@/app/lib/routes";

type Risk = "warning" | "critical";

interface OvertimeAlert {
  employeeId: string;
  employeeName: string;
  overtimeHours: number;
  projectedOvertimeCost: number;
  riskLevel: Risk;
  scheduledHours: number;
  suggestedActions: string[];
  thresholdHours: number;
  weekStart: string;
}

interface ScanData {
  alerts: OvertimeAlert[];
  summary: {
    criticalCount: number;
    warningCount: number;
    employeesAtRisk: number;
    totalOvertimeHours: number;
  };
}

export function OvertimeClient() {
  const today = new Date();
  const twoWeeks = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);
  const [startDate, setStartDate] = useState(today.toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(twoWeeks.toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ScanData | null>(null);

  const scan = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ startDate, endDate });
      const res = await apiFetch(staffOvertimeAlerts(params));
      if (!res.ok) {
        throw new Error("Scan failed");
      }
      const json = (await res.json()) as { data: ScanData };
      setData(json.data);
      toast.success("Overtime scan complete");
    } catch {
      toast.error("Failed to scan overtime risk");
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="font-semibold text-2xl">Overtime Prevention</h1>
        <p className="text-muted-foreground text-sm">
          Scan published shifts for weekly hour violations before they hit
          payroll.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Scan window</CardTitle>
          <CardDescription>Defaults to the next two weeks</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-4">
          <div className="grid gap-2">
            <Label htmlFor="start">Start</Label>
            <Input
              id="start"
              onChange={(e) => setStartDate(e.target.value)}
              type="date"
              value={startDate}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="end">End</Label>
            <Input
              id="end"
              onChange={(e) => setEndDate(e.target.value)}
              type="date"
              value={endDate}
            />
          </div>
          <Button disabled={loading} onClick={scan}>
            {loading ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 size-4" />
            )}
            Scan schedule
          </Button>
        </CardContent>
      </Card>

      {data && (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>At risk</CardDescription>
                <CardTitle>{data.summary.employeesAtRisk}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Warnings</CardDescription>
                <CardTitle>{data.summary.warningCount}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Critical</CardDescription>
                <CardTitle>{data.summary.criticalCount}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>OT hours</CardDescription>
                <CardTitle>
                  {data.summary.totalOvertimeHours.toFixed(1)}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              {data.alerts.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No overtime risk detected in this window.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Week</TableHead>
                      <TableHead>Hours</TableHead>
                      <TableHead>OT</TableHead>
                      <TableHead>Est. cost</TableHead>
                      <TableHead>Risk</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.alerts.map((alert) => (
                      <TableRow key={`${alert.employeeId}-${alert.weekStart}`}>
                        <TableCell>{alert.employeeName}</TableCell>
                        <TableCell>{alert.weekStart}</TableCell>
                        <TableCell>
                          {alert.scheduledHours} / {alert.thresholdHours}
                        </TableCell>
                        <TableCell>{alert.overtimeHours}h</TableCell>
                        <TableCell>
                          {formatCurrency(alert.projectedOvertimeCost)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              alert.riskLevel === "critical"
                                ? "destructive"
                                : "secondary"
                            }
                          >
                            <AlertTriangle className="mr-1 size-3" />
                            {alert.riskLevel}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
