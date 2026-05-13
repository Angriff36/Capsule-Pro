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
import { DatePicker } from "@repo/design-system/components/ui/date-picker";
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
import { formatCurrency } from "@repo/design-system/lib/format-currency";
import { apiFetch } from "@/app/lib/api";
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
      const res = await apiFetch("/api/procurement/budget/list?status=active");
      const data = await res.json();
      if (data.success) setBudgets(data.data.budgets || []);
    } catch (error) {
      console.error("Failed to load budgets:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await apiFetch("/api/manifest/Budget/commands/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      await loadBudgets();
      // Also refresh detail if open
      if (selectedBudget) loadDetail(selectedBudget);
    } catch (error) {
      console.error("Failed to refresh:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleCreate = async () => {
    if (!(form.name.trim() && form.budgetAmount)) return;
    setSaving(true);
    try {
      const res = await apiFetch("/api/manifest/Budget/commands/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          fiscalYear: Number.parseInt(form.fiscalYear),
          budgetAmount: Number.parseFloat(form.budgetAmount),
          thresholdWarningPct: Number.parseInt(form.thresholdWarningPct),
          thresholdCriticalPct: Number.parseInt(form.thresholdCriticalPct),
        }),
      });
      const data = await res.json();
      if (data.success) {
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
      } else {
        toast.error(data.error || "Failed to create budget");
      }
    } catch (error) {
      console.error("Failed to create budget:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (budget: Budget, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteTarget(budget);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await apiFetch("/api/manifest/Budget/commands/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ budgetId: deleteTarget.id }),
      });
      const data = await res.json();
      if (data.success) {
        if (selectedBudget === deleteTarget.id) {
          setSelectedBudget(null);
          setDetailData(null);
        }
        loadBudgets();
      } else {
        toast.error(data.error || "Failed to delete budget");
      }
    } catch (error) {
      console.error("Failed to delete budget:", error);
    } finally {
      setDeleteTarget(null);
    }
  };

  const loadDetail = async (budgetId: string) => {
    setDetailLoading(true);
    setSelectedBudget(budgetId);
    try {
      const res = await apiFetch(`/api/procurement/budget/${budgetId}`);
      const data = await res.json();
      if (data.success) {
        setDetailData({
          spend: data.data.spend,
          alerts: data.data.alerts || [],
          monthlyBreakdown: data.data.monthlyBreakdown || [],
        });
      }
    } catch (error) {
      console.error("Failed to load budget detail:", error);
    } finally {
      setDetailLoading(false);
    }
  };

  const filtered = useMemo(() => {
    if (!searchQuery) return budgets;
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
          <h1 className="text-2xl font-semibold tracking-tight">
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
              className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh Spend
          </Button>
          <Dialog onOpenChange={setDialogOpen} open={dialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
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
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
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
            <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalBudget)}
            </div>
            <p className="text-xs text-muted-foreground">
              {budgets.length} active budget{budgets.length !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>
        <Card tone="soft-stone">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalSpent)}
            </div>
            <p className="text-xs text-muted-foreground">
              {totalBudget > 0
                ? `${Math.round((totalSpent / totalBudget) * 100)}% of total budget`
                : "—"}
            </p>
          </CardContent>
        </Card>
        <Card tone="soft-stone">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Remaining</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${totalBudget - totalSpent < 0 ? "text-red-600" : ""}`}
            >
              {formatCurrency(totalBudget - totalSpent)}
            </div>
          </CardContent>
        </Card>
        <Card tone="soft-stone">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalAlerts > 0 ? (
                <span className="text-red-600">{totalAlerts}</span>
              ) : (
                <span className="text-green-600">0</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {overBudgetCount > 0
                ? `${overBudgetCount} over budget`
                : "All within limits"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
                <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
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
                  className={`cursor-pointer transition-all ${isSelected ? "ring-2 ring-blue-500 border-primary" : "hover:border-primary/40"}`}
                  key={budget.id}
                  onClick={() => loadDetail(budget.id)}
                  tone="canvas"
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{budget.name}</span>
                          <Badge className={getStatusColor(budget.status)}>
                            {budget.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
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
                          <span className="flex items-center justify-center h-5 w-5 rounded-full bg-red-100 text-red-700 text-xs font-medium">
                            {budget.unacknowledged_alert_count}
                          </span>
                        )}
                        <Button
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 h-7 w-7 p-0"
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
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
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
          <div className="md:col-span-2 space-y-4">
            {detailLoading ? (
              <Card tone="canvas">
                <CardContent className="py-12 text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto" />
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
                        <p className="text-sm text-muted-foreground">
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
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Budget</p>
                        <p className="text-lg font-semibold">
                          {formatCurrency(
                            Number(selectedBudgetObj.budget_amount)
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Spent</p>
                        <p
                          className={`text-lg font-semibold ${detailData.spend.utilizationPct >= 100 ? "text-red-600" : ""}`}
                        >
                          {formatCurrency(detailData.spend.totalSpent)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Committed
                        </p>
                        <p className="text-lg font-semibold">
                          {formatCurrency(detailData.spend.committed)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Remaining
                        </p>
                        <p
                          className={`text-lg font-semibold ${detailData.spend.remaining < 0 ? "text-red-600" : ""}`}
                        >
                          {formatCurrency(detailData.spend.remaining)}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Based on {detailData.spend.poCount} purchase order
                      {detailData.spend.poCount !== 1 ? "s" : ""}
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
                            m.month + "-01"
                          ).toLocaleDateString("en-US", {
                            month: "short",
                            year: "numeric",
                          });
                          return (
                            <div
                              className="flex items-center gap-3"
                              key={m.month}
                            >
                              <span className="text-sm text-muted-foreground w-24 shrink-0">
                                {monthLabel}
                              </span>
                              <div className="flex-1 h-6 bg-muted/50 rounded relative overflow-hidden">
                                <div
                                  className={`h-full rounded ${monthPct >= 15 ? "bg-blue-500" : "bg-blue-400"}`}
                                  style={{
                                    width: `${Math.min(monthPct * 5, 100)}%`,
                                  }}
                                />
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-medium">
                                  {formatCurrency(Number(m.amount))}
                                </span>
                              </div>
                              <span className="text-xs text-muted-foreground w-20 text-right">
                                {m.po_count} PO{m.po_count !== 1 ? "s" : ""}
                              </span>
                            </div>
                          );
                        })}
                        <div className="flex items-center gap-3 pt-2 border-t">
                          <span className="text-sm font-medium w-24 shrink-0">
                            Total
                          </span>
                          <div className="flex-1 h-6 bg-muted/50 rounded relative overflow-hidden">
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
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-medium">
                              {formatCurrency(detailData.spend.totalSpent)}
                            </span>
                          </div>
                          <span className="text-xs font-medium w-20 text-right">
                            {Math.round(detailData.spend.utilizationPct)}%
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-6">
                        No spend data yet for this budget period.
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Alerts */}
                {detailData.alerts.length > 0 && (
                  <Card tone="canvas">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                        Alerts ({detailData.alerts.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {detailData.alerts.map((alert) => (
                        <div
                          className={`flex items-start gap-3 p-3 rounded-lg ${
                            alert.alert_type === "critical"
                              ? "bg-red-50 border border-red-200"
                              : "bg-amber-50 border border-amber-200"
                          }`}
                          key={alert.id}
                        >
                          <AlertTriangle
                            className={`h-4 w-4 mt-0.5 shrink-0 ${
                              alert.alert_type === "critical"
                                ? "text-red-500"
                                : "text-amber-500"
                            }`}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm">{alert.message}</p>
                            <p className="text-xs text-muted-foreground mt-1">
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
                    <CardContent className="p-4 space-y-2">
                      {selectedBudgetObj.description && (
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Description
                          </p>
                          <p className="text-sm">
                            {selectedBudgetObj.description}
                          </p>
                        </div>
                      )}
                      {selectedBudgetObj.notes && (
                        <div>
                          <p className="text-xs text-muted-foreground">Notes</p>
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
          if (!open) setDeleteTarget(null);
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
