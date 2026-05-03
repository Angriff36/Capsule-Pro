"use client";

/**
 * @module ScoringRulesClient
 * @intent Client component for managing CRM lead scoring rules
 * @responsibility Render summary cards, rules table, and add/edit rule dialog
 * @domain CRM
 * @tags scoring, crm, lead-scoring, rules
 * @canonical true
 */

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/design-system/components/ui/dialog";
import { Input } from "@repo/design-system/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { Separator } from "@repo/design-system/components/ui/separator";
import { Switch } from "@repo/design-system/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import {
  Flame,
  PlusIcon,
  RefreshCw,
  Snowflake,
  Sun,
  Thermometer,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/app/lib/api";

// Types
export interface ScoringRule {
  id: string;
  rule_name: string;
  field: string;
  condition: string;
  value: string;
  points: number;
  is_active: boolean;
  priority: number;
  created_at: Date;
  updated_at: Date;
}

export interface ScoringDistribution {
  hot: number;
  warm: number;
  cold: number;
}

interface ScoringRulesClientProps {
  fetchRules: () => Promise<ScoringRule[]>;
  fetchDistribution: () => Promise<ScoringDistribution>;
}

// Field options for the select dropdown
const FIELD_OPTIONS = [
  { value: "source", label: "Source" },
  { value: "companyName", label: "Company Name" },
  { value: "contactName", label: "Contact Name" },
  { value: "contactEmail", label: "Contact Email" },
  { value: "contactPhone", label: "Contact Phone" },
  { value: "eventType", label: "Event Type" },
  { value: "status", label: "Status" },
  { value: "estimatedGuests", label: "Estimated Guests" },
  { value: "estimatedValue", label: "Estimated Value" },
  { value: "eventDate", label: "Event Date" },
];

// Condition options for the select dropdown
const CONDITION_OPTIONS = [
  { value: "equals", label: "Equals" },
  { value: "not_equals", label: "Not Equals" },
  { value: "gt", label: "Greater Than" },
  { value: "lt", label: "Less Than" },
  { value: "gte", label: "Greater Than or Equal" },
  { value: "lte", label: "Less Than or Equal" },
  { value: "contains", label: "Contains" },
  { value: "exists", label: "Exists (Not Empty)" },
];

// Default form state
const DEFAULT_FORM = {
  rule_name: "",
  field: "source",
  condition: "equals",
  value: "",
  points: 10,
  is_active: true,
  priority: 0,
};

export function ScoringRulesClient({
  fetchRules,
  fetchDistribution,
}: ScoringRulesClientProps) {
  const [rules, setRules] = useState<ScoringRule[]>([]);
  const [distribution, setDistribution] = useState<ScoringDistribution>({
    hot: 0,
    warm: 0,
    cold: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [form, setForm] = useState(DEFAULT_FORM);

  // Load rules and distribution
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [rulesData, distData] = await Promise.all([
        fetchRules(),
        fetchDistribution(),
      ]);
      setRules(rulesData);
      setDistribution(distData);
    } catch (error) {
      console.error("Failed to load scoring data:", error);
      toast.error("Failed to load scoring data");
    } finally {
      setIsLoading(false);
    }
  }, [fetchRules, fetchDistribution]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Create a new rule
  const handleCreateRule = async () => {
    if (!form.rule_name.trim()) {
      toast.error("Rule name is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiFetch("/api/crm/scoring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to create rule");
      }

      toast.success("Rule created successfully");
      setIsDialogOpen(false);
      setForm(DEFAULT_FORM);
      loadData();
    } catch (error) {
      console.error("Failed to create rule:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create rule"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle rule active status
  const handleToggleActive = async (rule: ScoringRule) => {
    try {
      // For now, we'll delete and recreate since there's no PATCH endpoint
      // This is a workaround - ideally we'd add a PATCH endpoint
      const res = await apiFetch("/api/crm/scoring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...rule,
          is_active: !rule.is_active,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to update rule");
      }

      // Update local state optimistically
      setRules((prev) =>
        prev.map((r) =>
          r.id === rule.id ? { ...r, is_active: !r.is_active } : r
        )
      );

      toast.success(`Rule ${rule.is_active ? "deactivated" : "activated"}`);
      loadData(); // Reload to get fresh data
    } catch (error) {
      console.error("Failed to toggle rule:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update rule"
      );
    }
  };

  // Recalculate all lead scores
  const handleCalculateScores = async () => {
    setIsCalculating(true);
    try {
      const res = await apiFetch("/api/crm/scoring/calculate", {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to calculate scores");
      }

      const result = await res.json();
      toast.success(`Scores calculated for ${result.data?.updated ?? 0} leads`);
      loadData(); // Reload distribution
    } catch (error) {
      console.error("Failed to calculate scores:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to calculate scores"
      );
    } finally {
      setIsCalculating(false);
    }
  };

  // Calculate summary stats
  const totalRules = rules.length;
  const activeRules = rules.filter((r) => r.is_active).length;
  const totalLeads = distribution.hot + distribution.warm + distribution.cold;

  return (
    <>
      <div className="flex flex-1 flex-col gap-8 p-4 pt-0">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Lead Scoring</h1>
          <p className="text-muted-foreground">
            Configure scoring rules to automatically prioritize leads based on
            custom criteria.
          </p>
        </div>

        <Separator />

        {/* Summary Cards */}
        <section>
          <h2 className="text-sm font-medium text-muted-foreground mb-4">
            Overview
          </h2>
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Rules</CardDescription>
                <CardTitle className="text-2xl">{totalRules}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Active Rules</CardDescription>
                <CardTitle className="text-2xl text-green-600">
                  {activeRules}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Leads</CardDescription>
                <CardTitle className="text-2xl">{totalLeads}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Lead Distribution</CardDescription>
                <div className="flex gap-2 mt-1">
                  <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                    <Flame className="size-3 mr-1" />
                    {distribution.hot} Hot
                  </Badge>
                  <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                    <Thermometer className="size-3 mr-1" />
                    {distribution.warm} Warm
                  </Badge>
                  <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                    <Snowflake className="size-3 mr-1" />
                    {distribution.cold} Cold
                  </Badge>
                </div>
              </CardHeader>
            </Card>
          </div>
        </section>

        {/* Actions Bar */}
        <section>
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2">
              <Sun className="size-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Scoring rules automatically evaluate leads and assign points
                based on field values.
              </span>
            </div>
            <div className="flex gap-2">
              <Button
                disabled={isCalculating || activeRules === 0}
                onClick={handleCalculateScores}
                variant="outline"
              >
                {isCalculating ? (
                  <RefreshCw className="mr-2 size-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 size-4" />
                )}
                Calculate Scores
              </Button>
              <Button onClick={() => setIsDialogOpen(true)}>
                <PlusIcon className="mr-2 size-4" />
                Add Rule
              </Button>
            </div>
          </div>
        </section>

        {/* Rules Table */}
        <section>
          <h2 className="text-sm font-medium text-muted-foreground mb-4">
            Scoring Rules ({rules.length})
          </h2>

          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          )}

          {!isLoading && rules.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-12 text-center">
              <div className="mb-4 rounded-full bg-muted p-4">
                <Thermometer className="size-8 text-muted-foreground" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">
                No scoring rules yet
              </h3>
              <p className="mb-4 text-muted-foreground text-sm">
                Create your first rule to start prioritizing leads
                automatically.
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <PlusIcon className="mr-2 size-4" />
                Create Rule
              </Button>
            </div>
          )}

          {!isLoading && rules.length > 0 && (
            <div className="rounded-xl border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rule Name</TableHead>
                    <TableHead>Field</TableHead>
                    <TableHead>Condition</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead className="text-center">Points</TableHead>
                    <TableHead className="text-center">Priority</TableHead>
                    <TableHead className="text-center">Active</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rules.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell className="font-medium">
                        {rule.rule_name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {FIELD_OPTIONS.find((f) => f.value === rule.field)
                            ?.label ?? rule.field}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {CONDITION_OPTIONS.find(
                          (c) => c.value === rule.condition
                        )?.label ?? rule.condition}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {rule.condition === "exists" ? "—" : rule.value}
                      </TableCell>
                      <TableCell className="text-center">
                        <span
                          className={`font-mono font-semibold ${
                            rule.points > 0
                              ? "text-green-600"
                              : rule.points < 0
                                ? "text-red-600"
                                : "text-gray-600"
                          }`}
                        >
                          {rule.points > 0 ? "+" : ""}
                          {rule.points}
                        </span>
                      </TableCell>
                      <TableCell className="text-center font-mono">
                        {rule.priority}
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={rule.is_active}
                          onCheckedChange={() => handleToggleActive(rule)}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          className="text-muted-foreground"
                          onClick={async () => {
                            if (
                              !confirm(
                                `Delete rule "${rule.rule_name}"? This cannot be undone.`
                              )
                            ) {
                              return;
                            }
                            try {
                              const res = await apiFetch(
                                `/api/crm/scoring/${rule.id}`,
                                { method: "DELETE" }
                              );
                              if (!res.ok) {
                                throw new Error("Failed to delete rule");
                              }
                              toast.success("Scoring rule deleted");
                              loadData();
                            } catch {
                              toast.error("Failed to delete scoring rule");
                            }
                          }}
                          size="sm"
                          variant="ghost"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </section>

        {/* Help Text */}
        <section className="text-sm text-muted-foreground">
          <p>
            <strong>How scoring works:</strong> Each lead is evaluated against
            all active rules. Points are added when conditions match. Leads with
            scores ≥80 are "Hot", ≥50 are "Warm", and below 50 are "Cold". Click
            "Calculate Scores" to re-evaluate all leads after changing rules.
          </p>
        </section>
      </div>

      {/* Add Rule Dialog */}
      <Dialog onOpenChange={setIsDialogOpen} open={isDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create Scoring Rule</DialogTitle>
            <DialogDescription>
              Define a condition that assigns points to leads when matched.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Rule Name */}
            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="rule_name">
                Rule Name
              </label>
              <Input
                id="rule_name"
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, rule_name: e.target.value }))
                }
                placeholder="e.g., High-value company"
                value={form.rule_name}
              />
            </div>

            {/* Field Selection */}
            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="field">
                Field
              </label>
              <Select
                onValueChange={(value) =>
                  setForm((prev) => ({ ...prev, field: value }))
                }
                value={form.field}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select field" />
                </SelectTrigger>
                <SelectContent>
                  {FIELD_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Condition Selection */}
            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="condition">
                Condition
              </label>
              <Select
                onValueChange={(value) =>
                  setForm((prev) => ({ ...prev, condition: value }))
                }
                value={form.condition}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select condition" />
                </SelectTrigger>
                <SelectContent>
                  {CONDITION_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Value Input */}
            {form.condition !== "exists" && (
              <div className="grid gap-2">
                <label className="text-sm font-medium" htmlFor="value">
                  Value
                </label>
                <Input
                  id="value"
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, value: e.target.value }))
                  }
                  placeholder="e.g., referral, 10000, 2024-06-15"
                  value={form.value}
                />
              </div>
            )}

            {/* Points Input */}
            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="points">
                Points (-100 to 100)
              </label>
              <Input
                id="points"
                max={100}
                min={-100}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    points: Number.parseInt(e.target.value) || 0,
                  }))
                }
                type="number"
                value={form.points}
              />
            </div>

            {/* Priority Input */}
            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="priority">
                Priority (lower = evaluated first)
              </label>
              <Input
                id="priority"
                min={0}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    priority: Number.parseInt(e.target.value) || 0,
                  }))
                }
                type="number"
                value={form.priority}
              />
            </div>

            {/* Active Toggle */}
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium" htmlFor="is_active">
                Active
              </label>
              <Switch
                checked={form.is_active}
                id="is_active"
                onCheckedChange={(checked) =>
                  setForm((prev) => ({ ...prev, is_active: checked }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => {
                setIsDialogOpen(false);
                setForm(DEFAULT_FORM);
              }}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={isSubmitting || !form.rule_name.trim()}
              onClick={handleCreateRule}
            >
              {isSubmitting ? "Creating..." : "Create Rule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
