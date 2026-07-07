"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { DatePicker } from "@repo/design-system/components/ui/date-picker";
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
import { Textarea } from "@repo/design-system/components/ui/textarea";
import { Loader2Icon } from "lucide-react";
import { useState } from "react";
import type {
  BudgetType,
  CreateBudgetInput,
  LaborBudget,
  UpdateBudgetInput,
} from "@/app/lib/labor-budgets";

// Fields mirror what the Manifest LaborBudget create/update commands accept.
// Status changes go through dedicated approve/close actions on the list, not
// this form. (Earlier versions offered unit/threshold/status fields that no
// command persisted.)

interface BudgetFormModalProps {
  budget?: LaborBudget;
  loading?: boolean;
  onClose: () => void;
  onSave: (data: CreateBudgetInput | UpdateBudgetInput) => Promise<void>;
  open: boolean;
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
    budgetType: (budget?.budgetType || "weekly") as BudgetType,
    budgetTarget: Number(budget?.budgetTarget ?? 0),
    locationId: budget?.locationId || "",
    eventId: budget?.eventId || "",
    periodStart: budget?.periodStart
      ? new Date(budget.periodStart).toISOString().split("T")[0]
      : "",
    periodEnd: budget?.periodEnd
      ? new Date(budget.periodEnd).toISOString().split("T")[0]
      : "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!(isEditing || formData.name.trim())) {
      newErrors.name = "Name is required";
    }
    if (formData.budgetTarget <= 0) {
      newErrors.budgetTarget = "Target must be greater than 0";
    }
    if (formData.budgetType === "event" && !(isEditing || formData.eventId)) {
      newErrors.eventId = "Event ID is required for event budgets";
    }
    if (
      (formData.budgetType === "weekly" ||
        formData.budgetType === "monthly") &&
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
          budgetTarget: formData.budgetTarget,
          budgetType: formData.budgetType,
          description: formData.description || undefined,
          locationId: formData.locationId || undefined,
          periodStart: formData.periodStart || undefined,
          periodEnd: formData.periodEnd || undefined,
        } as UpdateBudgetInput)
      : ({
          name: formData.name,
          description: formData.description || undefined,
          budgetType: formData.budgetType,
          budgetTarget: formData.budgetTarget,
          locationId: formData.locationId || undefined,
          eventId: formData.eventId || undefined,
          periodStart: formData.periodStart || undefined,
          periodEnd: formData.periodEnd || undefined,
        } as CreateBudgetInput);

    await onSave(data);
  };

  const showPeriodDates =
    formData.budgetType === "weekly" || formData.budgetType === "monthly";

  const showEventField = formData.budgetType === "event";

  return (
    <Dialog onOpenChange={onClose} open={open}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Budget" : "Create New Budget"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the budget target, type, period, and description. Approve or close budgets from the list actions."
              : "Create a new labor budget to track labor spend. New budgets start in draft."}
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-6" onSubmit={handleSubmit}>
          {/* Basic Info */}
          <div className="space-y-4">
            {!isEditing && (
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
                  <p className="text-red-500 text-sm">{errors.name}</p>
                )}
              </div>
            )}

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

          {/* Budget Type */}
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
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Budget Target */}
          <div className="space-y-2">
            <Label htmlFor="budgetTarget">
              Budget Target <span className="text-gray-500">($)</span>{" "}
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
              placeholder="5000.00"
              step="0.01"
              type="number"
              value={formData.budgetTarget}
            />
            {errors.budgetTarget && (
              <p className="text-red-500 text-sm">{errors.budgetTarget}</p>
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
                <p className="text-red-500 text-sm">{errors.eventId}</p>
              )}
              <p className="text-gray-500 text-xs">
                This budget will apply only to the specified event.
              </p>
            </div>
          )}

          {/* Location ID (optional) */}
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
            <p className="text-gray-500 text-xs">
              If specified, this budget applies only to this location.
            </p>
          </div>

          {/* Period Dates (for weekly/monthly budgets) */}
          {showPeriodDates && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="periodStart">
                  Period Start <span className="text-red-500">*</span>
                </Label>
                <DatePicker
                  disabled={loading}
                  id="periodStart"
                  onChange={(e) =>
                    setFormData({ ...formData, periodStart: e.target.value })
                  }
                  value={formData.periodStart}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="periodEnd">
                  Period End <span className="text-red-500">*</span>
                </Label>
                <DatePicker
                  disabled={loading}
                  id="periodEnd"
                  onChange={(e) =>
                    setFormData({ ...formData, periodEnd: e.target.value })
                  }
                  value={formData.periodEnd}
                />
              </div>
              {errors.period && (
                <p className="col-span-2 text-red-500 text-sm">
                  {errors.period}
                </p>
              )}
            </div>
          )}

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
