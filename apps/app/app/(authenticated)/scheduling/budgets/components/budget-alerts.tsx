"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/design-system/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import type { AlertType, BudgetAlert, AlertFilters } from "@/app/lib/use-labor-budgets";
import {
  acknowledgeAlert,
  getBudgetAlerts,
  resolveAlert,
  getAlertTypeColor,
} from "@/app/lib/use-labor-budgets";
import {
  AlertTriangleIcon,
  CheckIcon,
  Loader2Icon,
  RefreshCwIcon,
  XIcon,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export function BudgetAlerts() {
  const [alerts, setAlerts] = useState<BudgetAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [filters, setFilters] = useState<AlertFilters>({});

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getBudgetAlerts(filters);
      setAlerts(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to fetch alerts");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const handleAcknowledge = async (alertId: string) => {
    setActionLoading(true);
    try {
      await acknowledgeAlert(alertId);
      toast.success("Alert acknowledged");
      await fetchAlerts();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to acknowledge alert");
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolve = async (alertId: string) => {
    setActionLoading(true);
    try {
      await resolveAlert(alertId);
      toast.success("Alert resolved");
      await fetchAlerts();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to resolve alert");
    } finally {
      setActionLoading(false);
    }
  };

  const unacknowledgedCount = alerts.filter((a) => !a.is_acknowledged).length;
  const resolvedCount = alerts.filter((a) => a.is_resolved).length;

  const getAlertTypeLabel = (type: AlertType): string => {
    const labels: Record<AlertType, string> = {
      threshold_80: "80% Warning",
      threshold_90: "90% Warning",
      threshold_100: "100% Critical",
      exceeded: "Budget Exceeded",
    };
    return labels[type] || type;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Budget Alerts</h2>
          <p className="text-muted-foreground">
            Monitor and manage budget threshold alerts
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchAlerts} disabled={loading}>
          {loading ? (
            <Loader2Icon className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCwIcon className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Alerts</CardTitle>
            <AlertTriangleIcon className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{alerts.length}</div>
            <p className="text-xs text-muted-foreground">Active alerts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unacknowledged</CardTitle>
            <AlertTriangleIcon className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{unacknowledgedCount}</div>
            <p className="text-xs text-muted-foreground">Require attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
            <CheckIcon className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{resolvedCount}</div>
            <p className="text-xs text-muted-foreground">Successfully resolved</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <Select
          value={filters.alertType || "all"}
          onValueChange={(value) =>
            setFilters({
              ...filters,
              alertType: value === "all" ? undefined : (value as AlertType),
            })
          }
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Alert Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="threshold_80">80% Warning</SelectItem>
            <SelectItem value="threshold_90">90% Warning</SelectItem>
            <SelectItem value="threshold_100">100% Critical</SelectItem>
            <SelectItem value="exceeded">Exceeded</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={
            filters.isAcknowledged === undefined
              ? "all"
              : filters.isAcknowledged
                ? "acknowledged"
                : "unacknowledged"
          }
          onValueChange={(value) =>
            setFilters({
              ...filters,
              isAcknowledged:
                value === "all"
                  ? undefined
                  : value === "acknowledged",
            })
          }
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Acknowledgment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="unacknowledged">Unacknowledged</SelectItem>
            <SelectItem value="acknowledged">Acknowledged</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          onClick={() => setFilters({})}
          disabled={Object.keys(filters).length === 0}
        >
          Clear Filters
        </Button>
      </div>

      {/* Alerts Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Utilization</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    <Loader2Icon className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : alerts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    {Object.keys(filters).length > 0
                      ? "No alerts match your filters"
                      : "No budget alerts. You will see alerts here when budgets approach or exceed their thresholds."}
                  </TableCell>
                </TableRow>
              ) : (
                alerts.map((alert) => (
                  <TableRow key={alert.id}>
                    <TableCell>
                      <Badge className={getAlertTypeColor(alert.alert_type)}>
                        {getAlertTypeLabel(alert.alert_type)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-md">
                        <p className="text-sm">{alert.message}</p>
                        <p className="text-xs text-muted-foreground">
                          Budget ID: {alert.budget_id.slice(0, 8)}...
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{alert.utilization.toFixed(1)}%</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {alert.is_resolved && (
                          <Badge variant="outline" className="bg-green-50 text-green-700">
                            Resolved
                          </Badge>
                        )}
                        {alert.is_acknowledged && !alert.is_resolved && (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700">
                            Acknowledged
                          </Badge>
                        )}
                        {!alert.is_acknowledged && !alert.is_resolved && (
                          <Badge variant="outline" className="bg-red-50 text-red-700">
                            New
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {new Date(alert.created_at).toLocaleDateString()}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {!alert.is_acknowledged && !alert.is_resolved && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAcknowledge(alert.id)}
                            disabled={actionLoading}
                          >
                            <CheckIcon className="mr-2 h-4 w-4" />
                            Acknowledge
                          </Button>
                        )}
                        {!alert.is_resolved && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleResolve(alert.id)}
                            disabled={actionLoading}
                          >
                            Resolve
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
