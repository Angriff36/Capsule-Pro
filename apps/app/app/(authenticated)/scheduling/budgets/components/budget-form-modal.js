"use client";

Object.defineProperty(exports, "__esModule", { value: true });
exports.BudgetFormModal = BudgetFormModal;
const button_1 = require("@repo/design-system/components/ui/button");
const dialog_1 = require("@repo/design-system/components/ui/dialog");
const input_1 = require("@repo/design-system/components/ui/input");
const label_1 = require("@repo/design-system/components/ui/label");
const select_1 = require("@repo/design-system/components/ui/select");
const switch_1 = require("@repo/design-system/components/ui/switch");
const textarea_1 = require("@repo/design-system/components/ui/textarea");
const lucide_react_1 = require("lucide-react");
const react_1 = require("react");
function BudgetFormModal({ open, onClose, onSave, budget, loading = false }) {
  const isEditing = !!budget;
  const [formData, setFormData] = (0, react_1.useState)({
    name: budget?.name || "",
    description: budget?.description || "",
    budgetType: budget?.budget_type || "event",
    budgetTarget: budget?.budget_target || 0,
    budgetUnit: budget?.budget_unit || "hours",
    locationId: budget?.location_id || "",
    eventId: budget?.event_id || "",
    periodStart: budget?.period_start
      ? new Date(budget.period_start).toISOString().split("T")[0]
      : "",
    periodEnd: budget?.period_end
      ? new Date(budget.period_end).toISOString().split("T")[0]
      : "",
    status: budget?.status || "active",
    overrideReason: budget?.override_reason || "",
    threshold80Pct: budget?.threshold_80_pct ?? true,
    threshold90Pct: budget?.threshold_90_pct ?? true,
    threshold100Pct: budget?.threshold_100_pct ?? true,
  });
  const [errors, setErrors] = (0, react_1.useState)({});
  const validate = () => {
    const newErrors = {};
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
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    const data = isEditing
      ? {
          name: formData.name,
          description: formData.description || undefined,
          budgetTarget: formData.budgetTarget,
          status: formData.status,
          overrideReason: formData.overrideReason || undefined,
          threshold80Pct: formData.threshold80Pct,
          threshold90Pct: formData.threshold90Pct,
          threshold100Pct: formData.threshold100Pct,
        }
      : {
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
        };
    await onSave(data);
  };
  const showPeriodDates =
    formData.budgetType === "week" || formData.budgetType === "month";
  const showEventField = formData.budgetType === "event";
  return (
    <dialog_1.Dialog onOpenChange={onClose} open={open}>
      <dialog_1.DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <dialog_1.DialogHeader>
          <dialog_1.DialogTitle>
            {isEditing ? "Edit Budget" : "Create New Budget"}
          </dialog_1.DialogTitle>
          <dialog_1.DialogDescription>
            {isEditing
              ? "Update the budget settings and thresholds."
              : "Create a new labor budget to track scheduled hours or costs."}
          </dialog_1.DialogDescription>
        </dialog_1.DialogHeader>

        <form className="space-y-6" onSubmit={handleSubmit}>
          {/* Basic Info */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label_1.Label htmlFor="name">
                Budget Name <span className="text-red-500">*</span>
              </label_1.Label>
              <input_1.Input
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
              <label_1.Label htmlFor="description">Description</label_1.Label>
              <textarea_1.Textarea
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
                <label_1.Label htmlFor="budgetType">
                  Budget Type <span className="text-red-500">*</span>
                </label_1.Label>
                <select_1.Select
                  disabled={loading}
                  onValueChange={(value) =>
                    setFormData({ ...formData, budgetType: value })
                  }
                  value={formData.budgetType}
                >
                  <select_1.SelectTrigger id="budgetType">
                    <select_1.SelectValue placeholder="Select type" />
                  </select_1.SelectTrigger>
                  <select_1.SelectContent>
                    <select_1.SelectItem value="event">
                      Event
                    </select_1.SelectItem>
                    <select_1.SelectItem value="week">
                      Weekly
                    </select_1.SelectItem>
                    <select_1.SelectItem value="month">
                      Monthly
                    </select_1.SelectItem>
                  </select_1.SelectContent>
                </select_1.Select>
              </div>

              <div className="space-y-2">
                <label_1.Label htmlFor="budgetUnit">
                  Budget Unit <span className="text-red-500">*</span>
                </label_1.Label>
                <select_1.Select
                  disabled={loading}
                  onValueChange={(value) =>
                    setFormData({ ...formData, budgetUnit: value })
                  }
                  value={formData.budgetUnit}
                >
                  <select_1.SelectTrigger id="budgetUnit">
                    <select_1.SelectValue placeholder="Select unit" />
                  </select_1.SelectTrigger>
                  <select_1.SelectContent>
                    <select_1.SelectItem value="hours">
                      Hours
                    </select_1.SelectItem>
                    <select_1.SelectItem value="cost">
                      Cost ($)
                    </select_1.SelectItem>
                  </select_1.SelectContent>
                </select_1.Select>
              </div>
            </div>
          )}

          {/* Budget Target */}
          <div className="space-y-2">
            <label_1.Label htmlFor="budgetTarget">
              Budget Target{" "}
              <span className="text-gray-500">
                ({formData.budgetUnit === "cost" ? "$" : "hrs"})
              </span>{" "}
              <span className="text-red-500">*</span>
            </label_1.Label>
            <input_1.Input
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
              <label_1.Label htmlFor="eventId">
                Event ID <span className="text-red-500">*</span>
              </label_1.Label>
              <input_1.Input
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
              <label_1.Label htmlFor="locationId">
                Location ID (Optional)
              </label_1.Label>
              <input_1.Input
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
                <label_1.Label htmlFor="periodStart">
                  Period Start <span className="text-red-500">*</span>
                </label_1.Label>
                <input_1.Input
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
                <label_1.Label htmlFor="periodEnd">
                  Period End <span className="text-red-500">*</span>
                </label_1.Label>
                <input_1.Input
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
              <label_1.Label htmlFor="status">Status</label_1.Label>
              <select_1.Select
                disabled={loading}
                onValueChange={(value) =>
                  setFormData({ ...formData, status: value })
                }
                value={formData.status}
              >
                <select_1.SelectTrigger id="status">
                  <select_1.SelectValue />
                </select_1.SelectTrigger>
                <select_1.SelectContent>
                  <select_1.SelectItem value="active">
                    Active
                  </select_1.SelectItem>
                  <select_1.SelectItem value="paused">
                    Paused
                  </select_1.SelectItem>
                  <select_1.SelectItem value="archived">
                    Archived
                  </select_1.SelectItem>
                </select_1.SelectContent>
              </select_1.Select>
            </div>
          )}

          {/* Override Reason */}
          {isEditing && formData.status !== "active" && (
            <div className="space-y-2">
              <label_1.Label htmlFor="overrideReason">
                Override Reason
              </label_1.Label>
              <textarea_1.Textarea
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
            <label_1.Label>Alert Thresholds</label_1.Label>
            <p className="text-sm text-gray-500">
              Configure when you want to be notified about budget utilization.
            </p>

            <div className="flex items-center justify-between">
              <div>
                <label_1.Label
                  className="cursor-pointer"
                  htmlFor="threshold80Pct"
                >
                  80% Alert
                </label_1.Label>
                <p className="text-xs text-gray-500">
                  Notify when budget reaches 80%
                </p>
              </div>
              <switch_1.Switch
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
                <label_1.Label
                  className="cursor-pointer"
                  htmlFor="threshold90Pct"
                >
                  90% Warning
                </label_1.Label>
                <p className="text-xs text-gray-500">
                  Warn when budget reaches 90%
                </p>
              </div>
              <switch_1.Switch
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
                <label_1.Label
                  className="cursor-pointer"
                  htmlFor="threshold100Pct"
                >
                  100% Critical
                </label_1.Label>
                <p className="text-xs text-gray-500">
                  Critical alert when budget is exceeded
                </p>
              </div>
              <switch_1.Switch
                checked={formData.threshold100Pct}
                disabled={loading}
                id="threshold100Pct"
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, threshold100Pct: checked })
                }
              />
            </div>
          </div>

          <dialog_1.DialogFooter>
            <button_1.Button
              disabled={loading}
              onClick={onClose}
              type="button"
              variant="outline"
            >
              Cancel
            </button_1.Button>
            <button_1.Button disabled={loading} type="submit">
              {loading && (
                <lucide_react_1.Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
              )}
              {isEditing ? "Save Changes" : "Create Budget"}
            </button_1.Button>
          </dialog_1.DialogFooter>
        </form>
      </dialog_1.DialogContent>
    </dialog_1.Dialog>
  );
}
