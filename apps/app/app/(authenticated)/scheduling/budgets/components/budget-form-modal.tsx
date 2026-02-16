"use client";

import { Button } from "@repo/design-system/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Switch } from "@repo/design-system/components/ui/switch";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import { Loader2Icon } from "lucide-react";
import { useState } from "react";
import type {
  BudgetStatus,
  BudgetType,
  BudgetUnit,
  CreateBudgetInput,
  LaborBudget,
  UpdateBudgetInput,
} from "@/app/lib/use-labor-budgets";

interface BudgetFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: CreateBudgetInput | UpdateBudgetInput) => Promise<void>;
  budget?: LaborBudget;
  loading?: boolean;
}

export function BudgetFormModal({
  open,
  onClose,
  onSave,
  budget,
  loading = false,
}: BudgetFormModalProps) {
  const isEditing = !!budget;
  const [formData, setFormData] = useState({
    name: budget?.name || "",
    description: budget?.description || "",
    budgetType: (budget?.budget_type || "event") as BudgetType,
    budgetTarget: budget?.budget_target || 0,
    budgetUnit: (budget?.budget_unit || "hours") as BudgetUnit,
    locationId: budget?.location_id || "",
    eventId: budget?.event_id || "",
    periodStart: budget?.period_start
      ? new Date(budget.period_start).toISOString().split("T")[0]
      : "",
    periodEnd: budget?.period_end
      ? new Date(budget.period_end).toISOString().split("T")[0]
      : "",
    status: (budget?.status || "active") as BudgetStatus,
    overrideReason: budget?.override_reason || "",
    threshold80Pct: budget?.threshold_80_pct ?? true,
    threshold90Pct: budget?.threshold_90_pct ?? true,
    threshold100Pct: budget?.threshold_100_pct ?? true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }
    if (formData.budgetTarget <= 0) {
      newErrors.budgetTarget = "Target must be greater than 0";
    }
    if (formData.budgetType === "event" && !formData.eventId) {
      newErrors.eventId = "Event ID is required for event budgets";
    }
    if (
      (formData.budgetType === "week" || formData.budgetType === "month") &&
      !(formData.periodStart && formData.periodEnd)
    ) {
      newErrors.period = "Start and end dates are required for period budgets";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    const data: CreateBudgetInput | UpdateBudgetInput = isEditing
      ? ({
          name: formData.name,
          description: formData.description || undefined,
          budgetTarget: formData.budgetTarget,
          status: formData.status,
          overrideReason: formData.overrideReason || undefined,
          threshold80Pct: formData.threshold80Pct,
          threshold90Pct: formData.threshold90Pct,
          threshold100Pct: formData.threshold100Pct,
        } as UpdateBudgetInput)
      : ({
          name: formData.name,
          description: formData.description || undefined,
          budgetType: formData.budgetType,
          budgetTarget: formData.budgetTarget,
          budgetUnit: formData.budgetUnit,
          locationId: formData.locationId || undefined,
          eventId: formData.eventId || undefined,
          periodStart: formData.periodStart || undefined,
          periodEnd: formData.periodEnd || undefined,
          threshold80Pct: formData.threshold80Pct,
          threshold90Pct: formData.threshold90Pct,
          threshold100Pct: formData.threshold100Pct,
        } as CreateBudgetInput);

    await onSave(data);
  };

  const showPeriodDates =
    formData.budgetType === "week" || formData.budgetType === "month";

  const showEventField = formData.budgetType === "event";

  return (
    <Dialog onOpenChange={onClose} open={open}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Budget" : "Create New Budget"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the budget settings and thresholds."
              : "Create a new labor budget to track scheduled hours or costs."}
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-6" onSubmit={handleSubmit}>
          {/* Basic Info */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                Budget Name <span className="text-red-500">*</span>
              </Label>
              <Input
                disabled={loading}
                id="name"
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., Weekly Kitchen Staff Budget"
                value={formData.name}
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                disabled={loading}
                id="description"
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Optional description of this budget..."
                rows={2}
                value={formData.description}
              />
            </div>
          </div>

          {/* Budget Type & Unit (create only) */}
          {!isEditing && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="budgetType">
                  Budget Type <span className="text-red-500">*</span>
                </Label>
                <Select
                  disabled={loading}
                  onValueChange={(value: BudgetType) =>
                    setFormData({ ...formData, budgetType: value })
                  }
                  value={formData.budgetType}
                >
                  <SelectTrigger id="budgetType">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="event">Event</SelectItem>
                    <SelectItem value="week">Weekly</SelectItem>
                    <SelectItem value="month">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="budgetUnit">
                  Budget Unit <span className="text-red-500">*</span>
                </Label>
                <Select
                  disabled={loading}
                  onValueChange={(value: BudgetUnit) =>
                    setFormData({ ...formData, budgetUnit: value })
                  }
                  value={formData.budgetUnit}
                >
                  <SelectTrigger id="budgetUnit">
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hours">Hours</SelectItem>
                    <SelectItem value="cost">Cost ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Budget Target */}
          <div className="space-y-2">
            <Label htmlFor="budgetTarget">
              Budget Target{" "}
              <span className="text-gray-500">
                ({formData.budgetUnit === "cost" ? "$" : "hrs"})
              </span>{" "}
              <span className="text-red-500">*</span>
            </Label>
            <Input
              disabled={loading}
              id="budgetTarget"
              min="0"
              onChange={(e) =>
                setFormData({
                  ...formData,
                  budgetTarget: Number.parseFloat(e.target.value) || 0,
                })
              }
              placeholder={
                formData.budgetUnit === "cost" ? "5000.00" : "160.00"
              }
              step="0.01"
              type="number"
              value={formData.budgetTarget}
            />
            {errors.budgetTarget && (
              <p className="text-sm text-red-500">{errors.budgetTarget}</p>
            )}
          </div>

          {/* Event ID (for event budgets) */}
          {showEventField && !isEditing && (
            <div className="space-y-2">
              <Label htmlFor="eventId">
                Event ID <span className="text-red-500">*</span>
              </Label>
              <Input
                disabled={loading}
                id="eventId"
                onChange={(e) =>
                  setFormData({ ...formData, eventId: e.target.value })
                }
                placeholder="Enter event ID..."
                value={formData.eventId}
              />
              {errors.eventId && (
                <p className="text-sm text-red-500">{errors.eventId}</p>
              )}
              <p className="text-xs text-gray-500">
                This budget will apply only to the specified event.
              </p>
            </div>
          )}

          {/* Location ID (optional) */}
          {!isEditing && (
            <div className="space-y-2">
              <Label htmlFor="locationId">Location ID (Optional)</Label>
              <Input
                disabled={loading}
                id="locationId"
                onChange={(e) =>
                  setFormData({ ...formData, locationId: e.target.value })
                }
                placeholder="Leave blank for tenant-wide budget"
                value={formData.locationId}
              />
              <p className="text-xs text-gray-500">
                If specified, this budget applies only to this location.
              </p>
            </div>
          )}

          {/* Period Dates (for week/month budgets) */}
          {showPeriodDates && !isEditing && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="periodStart">
                  Period Start <span className="text-red-500">*</span>
                </Label>
                <Input
                  disabled={loading}
                  id="periodStart"
                  onChange={(e) =>
                    setFormData({ ...formData, periodStart: e.target.value })
                  }
                  type="date"
                  value={formData.periodStart}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="periodEnd">
                  Period End <span className="text-red-500">*</span>
                </Label>
                <Input
                  disabled={loading}
                  id="periodEnd"
                  onChange={(e) =>
                    setFormData({ ...formData, periodEnd: e.target.value })
                  }
                  type="date"
                  value={formData.periodEnd}
                />
              </div>
              {errors.period && (
                <p className="col-span-2 text-sm text-red-500">
                  {errors.period}
                </p>
              )}
            </div>
          )}

          {/* Status (edit only) */}
          {isEditing && (
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                disabled={loading}
                onValueChange={(value: BudgetStatus) =>
                  setFormData({ ...formData, status: value })
                }
                value={formData.status}
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Override Reason */}
          {isEditing && formData.status !== "active" && (
            <div className="space-y-2">
              <Label htmlFor="overrideReason">Override Reason</Label>
              <Textarea
                disabled={loading}
                id="overrideReason"
                onChange={(e) =>
                  setFormData({ ...formData, overrideReason: e.target.value })
                }
                placeholder="Explain why this budget is being overridden..."
                rows={2}
                value={formData.overrideReason}
              />
            </div>
          )}

          {/* Alert Thresholds */}
          <div className="space-y-4 border-t pt-4">
            <Label>Alert Thresholds</Label>
            <p className="text-sm text-gray-500">
              Configure when you want to be notified about budget utilization.
            </p>

            <div className="flex items-center justify-between">
              <div>
                <Label className="cursor-pointer" htmlFor="threshold80Pct">
                  80% Alert
                </Label>
                <p className="text-xs text-gray-500">
                  Notify when budget reaches 80%
                </p>
              </div>
              <Switch
                checked={formData.threshold80Pct}
                disabled={loading}
                id="threshold80Pct"
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, threshold80Pct: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="cursor-pointer" htmlFor="threshold90Pct">
                  90% Warning
                </Label>
                <p className="text-xs text-gray-500">
                  Warn when budget reaches 90%
                </p>
              </div>
              <Switch
                checked={formData.threshold90Pct}
                disabled={loading}
                id="threshold90Pct"
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, threshold90Pct: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="cursor-pointer" htmlFor="threshold100Pct">
                  100% Critical
                </Label>
                <p className="text-xs text-gray-500">
                  Critical alert when budget is exceeded
                </p>
              </div>
              <Switch
                checked={formData.threshold100Pct}
                disabled={loading}
                id="threshold100Pct"
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, threshold100Pct: checked })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              disabled={loading}
              onClick={onClose}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button disabled={loading} type="submit">
              {loading && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "Save Changes" : "Create Budget"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
