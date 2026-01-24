"use client";

Object.defineProperty(exports, "__esModule", { value: true });
exports.BudgetAlerts = BudgetAlerts;
const badge_1 = require("@repo/design-system/components/ui/badge");
const button_1 = require("@repo/design-system/components/ui/button");
const card_1 = require("@repo/design-system/components/ui/card");
const select_1 = require("@repo/design-system/components/ui/select");
const table_1 = require("@repo/design-system/components/ui/table");
const use_labor_budgets_1 = require("@/app/lib/use-labor-budgets");
const lucide_react_1 = require("lucide-react");
const react_1 = require("react");
const sonner_1 = require("sonner");
function BudgetAlerts() {
  const [alerts, setAlerts] = (0, react_1.useState)([]);
  const [loading, setLoading] = (0, react_1.useState)(true);
  const [actionLoading, setActionLoading] = (0, react_1.useState)(false);
  const [filters, setFilters] = (0, react_1.useState)({});
  const fetchAlerts = (0, react_1.useCallback)(async () => {
    setLoading(true);
    try {
      const data = await (0, use_labor_budgets_1.getBudgetAlerts)(filters);
      setAlerts(data);
    } catch (error) {
      sonner_1.toast.error(
        error instanceof Error ? error.message : "Failed to fetch alerts"
      );
    } finally {
      setLoading(false);
    }
  }, [filters]);
  (0, react_1.useEffect)(() => {
    fetchAlerts();
  }, [fetchAlerts]);
  const handleAcknowledge = async (alertId) => {
    setActionLoading(true);
    try {
      await (0, use_labor_budgets_1.acknowledgeAlert)(alertId);
      sonner_1.toast.success("Alert acknowledged");
      await fetchAlerts();
    } catch (error) {
      sonner_1.toast.error(
        error instanceof Error ? error.message : "Failed to acknowledge alert"
      );
    } finally {
      setActionLoading(false);
    }
  };
  const handleResolve = async (alertId) => {
    setActionLoading(true);
    try {
      await (0, use_labor_budgets_1.resolveAlert)(alertId);
      sonner_1.toast.success("Alert resolved");
      await fetchAlerts();
    } catch (error) {
      sonner_1.toast.error(
        error instanceof Error ? error.message : "Failed to resolve alert"
      );
    } finally {
      setActionLoading(false);
    }
  };
  const unacknowledgedCount = alerts.filter((a) => !a.is_acknowledged).length;
  const resolvedCount = alerts.filter((a) => a.is_resolved).length;
  const getAlertTypeLabel = (type) => {
    const labels = {
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
        <button_1.Button
          disabled={loading}
          onClick={fetchAlerts}
          size="sm"
          variant="outline"
        >
          {loading ? (
            <lucide_react_1.Loader2Icon className="h-4 w-4 animate-spin" />
          ) : (
            <lucide_react_1.RefreshCwIcon className="h-4 w-4" />
          )}
        </button_1.Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <card_1.Card>
          <card_1.CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <card_1.CardTitle className="text-sm font-medium">
              Total Alerts
            </card_1.CardTitle>
            <lucide_react_1.AlertTriangleIcon className="h-4 w-4 text-orange-600" />
          </card_1.CardHeader>
          <card_1.CardContent>
            <div className="text-2xl font-bold">{alerts.length}</div>
            <p className="text-xs text-muted-foreground">Active alerts</p>
          </card_1.CardContent>
        </card_1.Card>

        <card_1.Card>
          <card_1.CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <card_1.CardTitle className="text-sm font-medium">
              Unacknowledged
            </card_1.CardTitle>
            <lucide_react_1.AlertTriangleIcon className="h-4 w-4 text-red-600" />
          </card_1.CardHeader>
          <card_1.CardContent>
            <div className="text-2xl font-bold">{unacknowledgedCount}</div>
            <p className="text-xs text-muted-foreground">Require attention</p>
          </card_1.CardContent>
        </card_1.Card>

        <card_1.Card>
          <card_1.CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <card_1.CardTitle className="text-sm font-medium">
              Resolved
            </card_1.CardTitle>
            <lucide_react_1.CheckIcon className="h-4 w-4 text-green-600" />
          </card_1.CardHeader>
          <card_1.CardContent>
            <div className="text-2xl font-bold">{resolvedCount}</div>
            <p className="text-xs text-muted-foreground">
              Successfully resolved
            </p>
          </card_1.CardContent>
        </card_1.Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <select_1.Select
          onValueChange={(value) =>
            setFilters({
              ...filters,
              alertType: value === "all" ? undefined : value,
            })
          }
          value={filters.alertType || "all"}
        >
          <select_1.SelectTrigger className="w-48">
            <select_1.SelectValue placeholder="Alert Type" />
          </select_1.SelectTrigger>
          <select_1.SelectContent>
            <select_1.SelectItem value="all">All Types</select_1.SelectItem>
            <select_1.SelectItem value="threshold_80">
              80% Warning
            </select_1.SelectItem>
            <select_1.SelectItem value="threshold_90">
              90% Warning
            </select_1.SelectItem>
            <select_1.SelectItem value="threshold_100">
              100% Critical
            </select_1.SelectItem>
            <select_1.SelectItem value="exceeded">Exceeded</select_1.SelectItem>
          </select_1.SelectContent>
        </select_1.Select>

        <select_1.Select
          onValueChange={(value) =>
            setFilters({
              ...filters,
              isAcknowledged:
                value === "all" ? undefined : value === "acknowledged",
            })
          }
          value={
            filters.isAcknowledged === undefined
              ? "all"
              : filters.isAcknowledged
                ? "acknowledged"
                : "unacknowledged"
          }
        >
          <select_1.SelectTrigger className="w-48">
            <select_1.SelectValue placeholder="Acknowledgment" />
          </select_1.SelectTrigger>
          <select_1.SelectContent>
            <select_1.SelectItem value="all">All</select_1.SelectItem>
            <select_1.SelectItem value="unacknowledged">
              Unacknowledged
            </select_1.SelectItem>
            <select_1.SelectItem value="acknowledged">
              Acknowledged
            </select_1.SelectItem>
          </select_1.SelectContent>
        </select_1.Select>

        <button_1.Button
          disabled={Object.keys(filters).length === 0}
          onClick={() => setFilters({})}
          variant="outline"
        >
          Clear Filters
        </button_1.Button>
      </div>

      {/* Alerts Table */}
      <card_1.Card>
        <card_1.CardContent className="p-0">
          <table_1.Table>
            <table_1.TableHeader>
              <table_1.TableRow>
                <table_1.TableHead>Type</table_1.TableHead>
                <table_1.TableHead>Message</table_1.TableHead>
                <table_1.TableHead>Utilization</table_1.TableHead>
                <table_1.TableHead>Status</table_1.TableHead>
                <table_1.TableHead>Created</table_1.TableHead>
                <table_1.TableHead className="text-right">
                  Actions
                </table_1.TableHead>
              </table_1.TableRow>
            </table_1.TableHeader>
            <table_1.TableBody>
              {loading ? (
                <table_1.TableRow>
                  <table_1.TableCell className="h-24 text-center" colSpan={6}>
                    <lucide_react_1.Loader2Icon className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                  </table_1.TableCell>
                </table_1.TableRow>
              ) : alerts.length === 0 ? (
                <table_1.TableRow>
                  <table_1.TableCell
                    className="h-24 text-center text-muted-foreground"
                    colSpan={6}
                  >
                    {Object.keys(filters).length > 0
                      ? "No alerts match your filters"
                      : "No budget alerts. You will see alerts here when budgets approach or exceed their thresholds."}
                  </table_1.TableCell>
                </table_1.TableRow>
              ) : (
                alerts.map((alert) => (
                  <table_1.TableRow key={alert.id}>
                    <table_1.TableCell>
                      <badge_1.Badge
                        className={(0, use_labor_budgets_1.getAlertTypeColor)(
                          alert.alert_type
                        )}
                      >
                        {getAlertTypeLabel(alert.alert_type)}
                      </badge_1.Badge>
                    </table_1.TableCell>
                    <table_1.TableCell>
                      <div className="max-w-md">
                        <p className="text-sm">{alert.message}</p>
                        <p className="text-xs text-muted-foreground">
                          Budget ID: {alert.budget_id.slice(0, 8)}...
                        </p>
                      </div>
                    </table_1.TableCell>
                    <table_1.TableCell>
                      <span className="font-medium">
                        {alert.utilization.toFixed(1)}%
                      </span>
                    </table_1.TableCell>
                    <table_1.TableCell>
                      <div className="flex gap-1">
                        {alert.is_resolved && (
                          <badge_1.Badge
                            className="bg-green-50 text-green-700"
                            variant="outline"
                          >
                            Resolved
                          </badge_1.Badge>
                        )}
                        {alert.is_acknowledged && !alert.is_resolved && (
                          <badge_1.Badge
                            className="bg-blue-50 text-blue-700"
                            variant="outline"
                          >
                            Acknowledged
                          </badge_1.Badge>
                        )}
                        {!(alert.is_acknowledged || alert.is_resolved) && (
                          <badge_1.Badge
                            className="bg-red-50 text-red-700"
                            variant="outline"
                          >
                            New
                          </badge_1.Badge>
                        )}
                      </div>
                    </table_1.TableCell>
                    <table_1.TableCell>
                      <span className="text-sm text-muted-foreground">
                        {new Date(alert.created_at).toLocaleDateString()}
                      </span>
                    </table_1.TableCell>
                    <table_1.TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {!(alert.is_acknowledged || alert.is_resolved) && (
                          <button_1.Button
                            disabled={actionLoading}
                            onClick={() => handleAcknowledge(alert.id)}
                            size="sm"
                            variant="outline"
                          >
                            <lucide_react_1.CheckIcon className="mr-2 h-4 w-4" />
                            Acknowledge
                          </button_1.Button>
                        )}
                        {!alert.is_resolved && (
                          <button_1.Button
                            disabled={actionLoading}
                            onClick={() => handleResolve(alert.id)}
                            size="sm"
                            variant="outline"
                          >
                            Resolve
                          </button_1.Button>
                        )}
                      </div>
                    </table_1.TableCell>
                  </table_1.TableRow>
                ))
              )}
            </table_1.TableBody>
          </table_1.Table>
        </card_1.CardContent>
      </card_1.Card>
    </div>
  );
}
