"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@repo/design-system/components/ui/alert-dialog";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { DatePicker } from "@repo/design-system/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/design-system/components/ui/dialog";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import { formatCurrency } from "@repo/design-system/lib/format-currency";
import {
  AlertTriangle,
  DollarSign,
  Loader2,
  PieChart,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  budgetCreate,
  budgetRefresh,
  budgetRemove,
  getProcurementBudget,
  listProcurementBudgets,
} from "@/app/lib/manifest-client.generated";
import {
  type Budget,
  type BudgetAlert,
  type BudgetSpend,
  getStatusColor,
  type MonthlyBreakdown,
  PERIOD_TYPE_OPTIONS,
  UtilizationBar,
} from "../components/budget-shared";

function poFormatDate(d: string | null) {
  return d
    ? new Date(d).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";
}

export default function BudgetPage() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Budget | null>(null);

  // Detail view
  const [selectedBudget, setSelectedBudget] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<{
    spend: BudgetSpend;
    alerts: BudgetAlert[];
    monthlyBreakdown: MonthlyBreakdown[];
  } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Form
  const currentYear = new Date().getFullYear();
  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "",
    fiscalYear: String(currentYear),
    periodType: "annual",
    periodStart: `${currentYear}-01-01`,
    periodEnd: `${currentYear}-12-31`,
    budgetAmount: "",
    thresholdWarningPct: "80",
    thresholdCriticalPct: "100",
    notes: "",
  });

  useEffect(() => {
    loadBudgets();
  }, []);

  const loadBudgets = async () => {
    setLoading(true);
    try {
      const result = await listProcurementBudgets({ status: "active" });
      setBudgets(result.data as unknown as Budget[]);
    } catch (error) {
      console.error("Failed to load budgets:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await budgetRefresh({});
      await loadBudgets();
      // Also refresh detail if open
      if (selectedBudget) {
        loadDetail(selectedBudget);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to refresh");
    } finally {
      setRefreshing(false);
    }
  };

  const handleCreate = async () => {
    if (!(form.name.trim() && form.budgetAmount)) {
      return;
    }
    setSaving(true);
    try {
      await budgetCreate({
        ...form,
        fiscalYear: Number.parseInt(form.fiscalYear, 10),
      });
      setDialogOpen(false);
      setForm({
        name: "",
        description: "",
        category: "",
        fiscalYear: String(currentYear),
        periodType: "annual",
        periodStart: `${currentYear}-01-01`,
        periodEnd: `${currentYear}-12-31`,
        budgetAmount: "",
        thresholdWarningPct: "80",
        thresholdCriticalPct: "100",
        notes: "",
      });
      loadBudgets();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create budget"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (budget: Budget, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteTarget(budget);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) {
      return;
    }
    try {
      await budgetRemove({ id: deleteTarget.id });
      if (selectedBudget === deleteTarget.id) {
        setSelectedBudget(null);
        setDetailData(null);
      }
      loadBudgets();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete budget"
      );
    } finally {
      setDeleteTarget(null);
    }
  };

  const loadDetail = async (budgetId: string) => {
    setDetailLoading(true);
    setSelectedBudget(budgetId);
    try {
      const data = await getProcurementBudget(budgetId);
      if (data) {
        const raw = data as unknown as Record<string, unknown>;
        setDetailData({
          spend: (raw.spend ??
            (raw.data as Record<string, unknown>)?.spend) as BudgetSpend,
          alerts:
            ((raw.alerts ??
              (raw.data as Record<string, unknown>)
                ?.alerts) as BudgetAlert[]) || [],
          monthlyBreakdown:
            ((raw.monthlyBreakdown ??
              (raw.data as Record<string, unknown>)
                ?.monthlyBreakdown) as MonthlyBreakdown[]) || [],
        });
      }
    } catch (error) {
      console.error("Failed to load budget detail:", error);
    } finally {
      setDetailLoading(false);
    }
  };

  const filtered = useMemo(() => {
    if (!searchQuery) {
      return budgets;
    }
    const q = searchQuery.toLowerCase();
    return budgets.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.category?.toLowerCase().includes(q) ||
        String(b.fiscal_year).includes(q)
    );
  }, [budgets, searchQuery]);

  const totalBudget = budgets.reduce(
    (sum, b) => sum + Number(b.budget_amount),
    0
  );
  const totalSpent = budgets.reduce(
    (sum, b) => sum + Number(b.spent_amount),
    0
  );
  const totalAlerts = budgets.reduce(
    (sum, b) => sum + (b.unacknowledged_alert_count || 0),
    0
  );
  const overBudgetCount = budgets.filter(
    (b) =>
      Number(b.budget_amount) > 0 &&
      Number(b.spent_amount) / Number(b.budget_amount) >=
        Number(b.threshold_critical_pct) / 100
  ).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const selectedBudgetObj = budgets.find((b) => b.id === selectedBudget);

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <h1 className="font-semibold text-2xl tracking-tight">
            Budget Tracking
          </h1>
          <p className="text-muted-foreground">
            Track procurement spend against budget allocations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            disabled={refreshing}
            onClick={handleRefresh}
            variant="outline"
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh Spend
          </Button>
          <Dialog onOpenChange={setDialogOpen} open={dialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Budget
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create Budget</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Budget Name *</Label>
                    <Input
                      onChange={(e) =>
                        setForm({ ...form, name: e.target.value })
                      }
                      placeholder="e.g., Produce FY2026"
                      value={form.name}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Input
                      onChange={(e) =>
                        setForm({ ...form, category: e.target.value })
                      }
                      placeholder="e.g., Produce, Dairy, Dry Goods"
                      value={form.category}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Fiscal Year *</Label>
                    <Input
                      onChange={(e) =>
                        setForm({ ...form, fiscalYear: e.target.value })
                      }
                      type="number"
                      value={form.fiscalYear}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Budget Amount *</Label>
                    <Input
                      onChange={(e) =>
                        setForm({ ...form, budgetAmount: e.target.value })
                      }
                      placeholder="50000.00"
                      step="0.01"
                      type="number"
                      value={form.budgetAmount}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Period Type</Label>
                    <Select
                      onValueChange={(v) => setForm({ ...form, periodType: v })}
                      value={form.periodType}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PERIOD_TYPE_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input
                      onChange={(e) =>
                        setForm({ ...form, description: e.target.value })
                      }
                      placeholder="Optional description"
                      value={form.description}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Period Start</Label>
                    <DatePicker
                      onChange={(e) =>
                        setForm({ ...form, periodStart: e.target.value })
                      }
                      value={form.periodStart}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Period End</Label>
                    <DatePicker
                      onChange={(e) =>
                        setForm({ ...form, periodEnd: e.target.value })
                      }
                      value={form.periodEnd}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Warning Threshold (%)</Label>
                    <Input
                      onChange={(e) =>
                        setForm({
                          ...form,
                          thresholdWarningPct: e.target.value,
                        })
                      }
                      type="number"
                      value={form.thresholdWarningPct}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Critical Threshold (%)</Label>
                    <Input
                      onChange={(e) =>
                        setForm({
                          ...form,
                          thresholdCriticalPct: e.target.value,
                        })
                      }
                      type="number"
                      value={form.thresholdCriticalPct}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    onChange={(e) =>
                      setForm({ ...form, notes: e.target.value })
                    }
                    placeholder="Internal notes..."
                    rows={2}
                    value={form.notes}
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <Button
                    onClick={() => setDialogOpen(false)}
                    variant="outline"
                  >
                    Cancel
                  </Button>
                  <Button
                    disabled={
                      !(form.name.trim() && form.budgetAmount) || saving
                    }
                    onClick={handleCreate}
                  >
                    {saving && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Create Budget
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card tone="soft-stone">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Total Budget</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {formatCurrency(totalBudget)}
            </div>
            <p className="text-muted-foreground text-xs">
              {budgets.length} active budget{budgets.length === 1 ? "" : "s"}
            </p>
          </CardContent>
        </Card>
        <Card tone="soft-stone">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Total Spent</CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {formatCurrency(totalSpent)}
            </div>
            <p className="text-muted-foreground text-xs">
              {totalBudget > 0
                ? `${Math.round((totalSpent / totalBudget) * 100)}% of total budget`
                : "—"}
            </p>
          </CardContent>
        </Card>
        <Card tone="soft-stone">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Remaining</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className={`font-bold text-2xl ${totalBudget - totalSpent < 0 ? "text-red-600" : ""}`}
            >
              {formatCurrency(totalBudget - totalSpent)}
            </div>
          </CardContent>
        </Card>
        <Card tone="soft-stone">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {totalAlerts > 0 ? (
                <span className="text-red-600">{totalAlerts}</span>
              ) : (
                <span className="text-green-600">0</span>
              )}
            </div>
            <p className="text-muted-foreground text-xs">
              {overBudgetCount > 0
                ? `${overBudgetCount} over budget`
                : "All within limits"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-10"
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name, category, or year..."
          value={searchQuery}
        />
      </div>

      {/* Budget List & Detail */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Budget List */}
        <div
          className={`space-y-3 ${selectedBudget ? "md:col-span-1" : "md:col-span-3"}`}
        >
          {filtered.length === 0 ? (
            <Card tone="canvas">
              <CardContent className="py-12 text-center text-muted-foreground">
                <DollarSign className="mx-auto mb-4 h-12 w-12 opacity-50" />
                <p>
                  {budgets.length === 0
                    ? "No budgets yet. Create your first budget to start tracking spend."
                    : "No budgets match your search."}
                </p>
              </CardContent>
            </Card>
          ) : (
            filtered.map((budget) => {
              const spent = Number(budget.spent_amount);
              const total = Number(budget.budget_amount);
              const pct =
                total > 0 ? Math.round((spent / total) * 10_000) / 100 : 0;
              const isSelected = selectedBudget === budget.id;

              return (
                <Card
                  className={`cursor-pointer transition-all ${isSelected ? "border-primary ring-2 ring-blue-500" : "hover:border-primary/40"}`}
                  key={budget.id}
                  onClick={() => loadDetail(budget.id)}
                  tone="canvas"
                >
                  <CardContent className="p-4">
                    <div className="mb-2 flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{budget.name}</span>
                          <Badge className={getStatusColor(budget.status)}>
                            {budget.status}
                          </Badge>
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-muted-foreground text-sm">
                          {budget.category && (
                            <Badge className="text-xs" variant="outline">
                              {budget.category}
                            </Badge>
                          )}
                          <span>FY{budget.fiscal_year}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {budget.unacknowledged_alert_count > 0 && (
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-100 font-medium text-red-700 text-xs">
                            {budget.unacknowledged_alert_count}
                          </span>
                        )}
                        <Button
                          className="h-7 w-7 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                          onClick={(e) => handleDelete(budget, e)}
                          size="sm"
                          variant="ghost"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    <div className="mt-3">
                      <UtilizationBar
                        compact
                        criticalPct={Number(budget.threshold_critical_pct)}
                        pct={pct}
                        warningPct={Number(budget.threshold_warning_pct)}
                      />
                      <div className="mt-1 flex justify-between text-muted-foreground text-xs">
                        <span>{formatCurrency(spent)} spent</span>
                        <span>{formatCurrency(total)} budget</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Detail Panel */}
        {selectedBudget && selectedBudgetObj && (
          <div className="space-y-4 md:col-span-2">
            {detailLoading ? (
              <Card tone="canvas">
                <CardContent className="py-12 text-center">
                  <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
                </CardContent>
              </Card>
            ) : detailData ? (
              <>
                {/* Detail Header */}
                <Card tone="canvas">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>{selectedBudgetObj.name}</CardTitle>
                        <p className="text-muted-foreground text-sm">
                          {selectedBudgetObj.category
                            ? `${selectedBudgetObj.category} · `
                            : ""}
                          FY{selectedBudgetObj.fiscal_year} ·{" "}
                          {formatCurrency(
                            Number(selectedBudgetObj.budget_amount)
                          )}
                        </p>
                      </div>
                      <Button
                        onClick={() => {
                          setSelectedBudget(null);
                          setDetailData(null);
                        }}
                        size="sm"
                        variant="ghost"
                      >
                        Close
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <UtilizationBar
                      criticalPct={Number(
                        selectedBudgetObj.threshold_critical_pct
                      )}
                      label="Utilization"
                      pct={detailData.spend.utilizationPct}
                      warningPct={Number(
                        selectedBudgetObj.threshold_warning_pct
                      )}
                    />
                    <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
                      <div>
                        <p className="text-muted-foreground text-xs">Budget</p>
                        <p className="font-semibold text-lg">
                          {formatCurrency(
                            Number(selectedBudgetObj.budget_amount)
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Spent</p>
                        <p
                          className={`font-semibold text-lg ${detailData.spend.utilizationPct >= 100 ? "text-red-600" : ""}`}
                        >
                          {formatCurrency(detailData.spend.totalSpent)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">
                          Committed
                        </p>
                        <p className="font-semibold text-lg">
                          {formatCurrency(detailData.spend.committed)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">
                          Remaining
                        </p>
                        <p
                          className={`font-semibold text-lg ${detailData.spend.remaining < 0 ? "text-red-600" : ""}`}
                        >
                          {formatCurrency(detailData.spend.remaining)}
                        </p>
                      </div>
                    </div>
                    <p className="mt-2 text-muted-foreground text-xs">
                      Based on {detailData.spend.poCount} purchase order
                      {detailData.spend.poCount === 1 ? "" : "s"}
                      {selectedBudgetObj.category
                        ? ` in "${selectedBudgetObj.category}" category`
                        : ""}
                    </p>
                  </CardContent>
                </Card>

                {/* Visual Budget vs Actual */}
                <Card tone="canvas">
                  <CardHeader>
                    <CardTitle className="text-base">
                      Budget vs Actual
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {detailData.monthlyBreakdown.length > 0 ? (
                      <div className="space-y-2">
                        {detailData.monthlyBreakdown.map((m) => {
                          const monthPct =
                            Number(selectedBudgetObj.budget_amount) > 0
                              ? Math.round(
                                  (Number(m.amount) /
                                    Number(selectedBudgetObj.budget_amount)) *
                                    10_000
                                ) / 100
                              : 0;
                          const monthLabel = new Date(
                            `${m.month}-01`
                          ).toLocaleDateString("en-US", {
                            month: "short",
                            year: "numeric",
                          });
                          return (
                            <div
                              className="flex items-center gap-3"
                              key={m.month}
                            >
                              <span className="w-24 shrink-0 text-muted-foreground text-sm">
                                {monthLabel}
                              </span>
                              <div className="relative h-6 flex-1 overflow-hidden rounded bg-muted/50">
                                <div
                                  className={`h-full rounded ${monthPct >= 15 ? "bg-blue-500" : "bg-blue-400"}`}
                                  style={{
                                    width: `${Math.min(monthPct * 5, 100)}%`,
                                  }}
                                />
                                <span className="absolute top-1/2 left-2 -translate-y-1/2 font-medium text-xs">
                                  {formatCurrency(Number(m.amount))}
                                </span>
                              </div>
                              <span className="w-20 text-right text-muted-foreground text-xs">
                                {m.po_count} PO{m.po_count === 1 ? "" : "s"}
                              </span>
                            </div>
                          );
                        })}
                        <div className="flex items-center gap-3 border-t pt-2">
                          <span className="w-24 shrink-0 font-medium text-sm">
                            Total
                          </span>
                          <div className="relative h-6 flex-1 overflow-hidden rounded bg-muted/50">
                            <div
                              className={`h-full rounded ${
                                detailData.spend.utilizationPct >= 100
                                  ? "bg-red-500"
                                  : detailData.spend.utilizationPct >= 80
                                    ? "bg-amber-500"
                                    : "bg-blue-500"
                              }`}
                              style={{
                                width: `${Math.min(detailData.spend.utilizationPct, 100)}%`,
                              }}
                            />
                            <span className="absolute top-1/2 left-2 -translate-y-1/2 font-medium text-xs">
                              {formatCurrency(detailData.spend.totalSpent)}
                            </span>
                          </div>
                          <span className="w-20 text-right font-medium text-xs">
                            {Math.round(detailData.spend.utilizationPct)}%
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="py-6 text-center text-muted-foreground text-sm">
                        No spend data yet for this budget period.
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Alerts */}
                {detailData.alerts.length > 0 && (
                  <Card tone="canvas">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                        Alerts ({detailData.alerts.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {detailData.alerts.map((alert) => (
                        <div
                          className={`flex items-start gap-3 rounded-lg p-3 ${
                            alert.alert_type === "critical"
                              ? "border border-red-200 bg-red-50"
                              : "border border-amber-200 bg-amber-50"
                          }`}
                          key={alert.id}
                        >
                          <AlertTriangle
                            className={`mt-0.5 h-4 w-4 shrink-0 ${
                              alert.alert_type === "critical"
                                ? "text-red-500"
                                : "text-amber-500"
                            }`}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm">{alert.message}</p>
                            <p className="mt-1 text-muted-foreground text-xs">
                              {poFormatDate(alert.created_at)} ·{" "}
                              {Number(alert.utilization_pct).toFixed(1)}%
                              utilized
                            </p>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Description & Notes */}
                {(selectedBudgetObj.description || selectedBudgetObj.notes) && (
                  <Card tone="canvas">
                    <CardContent className="space-y-2 p-4">
                      {selectedBudgetObj.description && (
                        <div>
                          <p className="text-muted-foreground text-xs">
                            Description
                          </p>
                          <p className="text-sm">
                            {selectedBudgetObj.description}
                          </p>
                        </div>
                      )}
                      {selectedBudgetObj.notes && (
                        <div>
                          <p className="text-muted-foreground text-xs">Notes</p>
                          <p className="text-sm">{selectedBudgetObj.notes}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </>
            ) : null}
          </div>
        )}
      </div>

      {/* Delete Confirmation */}
      <AlertDialog
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
          }
        }}
        open={!!deleteTarget}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Budget</AlertDialogTitle>
            <AlertDialogDescription>
              Delete budget &quot;{deleteTarget?.name}&quot;? This cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
