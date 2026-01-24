"use client";

Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateBudgetModal = CreateBudgetModal;
const button_1 = require("@repo/design-system/components/ui/button");
const input_1 = require("@repo/design-system/components/ui/input");
const label_1 = require("@repo/design-system/components/ui/label");
const select_1 = require("@repo/design-system/components/ui/select");
const textarea_1 = require("@repo/design-system/components/ui/textarea");
const lucide_react_1 = require("lucide-react");
const react_1 = require("react");
function CreateBudgetModal({ open, onClose, onSave, budget, loading }) {
  const isEditing = !!budget;
  // Form state
  const [eventId, setEventId] = (0, react_1.useState)(budget?.eventId || "");
  const [status, setStatus] = (0, react_1.useState)(budget?.status || "draft");
  const [totalBudgetAmount, setTotalBudgetAmount] = (0, react_1.useState)(
    budget?.totalBudgetAmount.toString() || ""
  );
  const [notes, setNotes] = (0, react_1.useState)(budget?.notes || "");
  // Line items state
  const [lineItems, setLineItems] = (0, react_1.useState)(
    budget?.lineItems?.map((item) => ({
      id: item.id,
      category: item.category,
      name: item.name,
      description: item.description || "",
      budgetedAmount: item.budgetedAmount.toString(),
      sortOrder: item.sortOrder,
      notes: item.notes || "",
    })) || []
  );
  // Validation errors
  const [errors, setErrors] = (0, react_1.useState)({});
  // Reset form when opening/closing
  (0, react_1.useEffect)(() => {
    if (open) {
      if (budget) {
        setEventId(budget.eventId);
        setStatus(budget.status);
        setTotalBudgetAmount(budget.totalBudgetAmount.toString());
        setNotes(budget.notes || "");
        setLineItems(
          budget.lineItems?.map((item) => ({
            id: item.id,
            category: item.category,
            name: item.name,
            description: item.description || "",
            budgetedAmount: item.budgetedAmount.toString(),
            sortOrder: item.sortOrder,
            notes: item.notes || "",
          })) || []
        );
      } else {
        setEventId("");
        setStatus("draft");
        setTotalBudgetAmount("");
        setNotes("");
        setLineItems([]);
      }
      setErrors({});
    }
  }, [open, budget]);
  // Validate form
  const validateForm = (0, react_1.useCallback)(() => {
    const newErrors = {};
    if (!eventId.trim()) {
      newErrors.eventId = "Event ID is required";
    }
    if (!totalBudgetAmount || Number.parseFloat(totalBudgetAmount) < 0) {
      newErrors.totalBudgetAmount = "Valid budget amount is required";
    }
    // Validate line items
    lineItems.forEach((item, index) => {
      if (!item.name.trim()) {
        newErrors[`lineItem_${index}_name`] = "Line item name is required";
      }
      if (!item.budgetedAmount || Number.parseFloat(item.budgetedAmount) < 0) {
        newErrors[`lineItem_${index}_amount`] = "Valid amount is required";
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [eventId, totalBudgetAmount, lineItems]);
  // Handle save
  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }
    const data = {
      ...(isEditing && { status, notes }),
      eventId,
      totalBudgetAmount: Number.parseFloat(totalBudgetAmount),
      notes: notes || undefined,
      lineItems: lineItems.map((item) => ({
        category: item.category,
        name: item.name,
        description: item.description || undefined,
        budgetedAmount: Number.parseFloat(item.budgetedAmount),
        sortOrder: item.sortOrder,
        notes: item.notes || undefined,
      })),
    };
    await onSave(data);
  };
  // Add line item
  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        id: `new_${Date.now()}`,
        category: "other",
        name: "",
        description: "",
        budgetedAmount: "",
        sortOrder: lineItems.length,
        notes: "",
      },
    ]);
  };
  // Remove line item
  const removeLineItem = (id) => {
    setLineItems(lineItems.filter((item) => item.id !== id));
  };
  // Update line item
  const updateLineItem = (id, field, value) => {
    setLineItems(
      lineItems.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };
  // Calculate total from line items
  const lineItemsTotal = lineItems.reduce(
    (sum, item) => sum + (Number.parseFloat(item.budgetedAmount) || 0),
    0
  );
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-50 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white p-6 shadow-lg dark:bg-gray-900">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">
            {isEditing ? "Edit Budget" : "Create Budget"}
          </h2>
          <button_1.Button onClick={onClose} size="sm" variant="ghost">
            <lucide_react_1.XIcon className="h-4 w-4" />
          </button_1.Button>
        </div>

        <div className="space-y-4">
          {/* Event ID */}
          <div>
            <label_1.Label htmlFor="eventId">Event ID *</label_1.Label>
            <input_1.Input
              className={errors.eventId ? "border-red-500" : ""}
              disabled={isEditing}
              id="eventId"
              onChange={(e) => setEventId(e.target.value)}
              placeholder="Enter event ID"
              value={eventId}
            />
            {errors.eventId && (
              <p className="text-sm text-red-500 mt-1">{errors.eventId}</p>
            )}
          </div>

          {/* Status (only for edit) */}
          {isEditing && (
            <div>
              <label_1.Label htmlFor="status">Status</label_1.Label>
              <select_1.Select
                onValueChange={(v) => setStatus(v)}
                value={status}
              >
                <select_1.SelectTrigger id="status">
                  <select_1.SelectValue />
                </select_1.SelectTrigger>
                <select_1.SelectContent>
                  <select_1.SelectItem value="draft">Draft</select_1.SelectItem>
                  <select_1.SelectItem value="approved">
                    Approved
                  </select_1.SelectItem>
                  <select_1.SelectItem value="active">
                    Active
                  </select_1.SelectItem>
                  <select_1.SelectItem value="completed">
                    Completed
                  </select_1.SelectItem>
                  <select_1.SelectItem value="exceeded">
                    Exceeded
                  </select_1.SelectItem>
                </select_1.SelectContent>
              </select_1.Select>
            </div>
          )}

          {/* Total Budget Amount */}
          <div>
            <label_1.Label htmlFor="totalBudgetAmount">
              Total Budget Amount *
            </label_1.Label>
            <input_1.Input
              className={errors.totalBudgetAmount ? "border-red-500" : ""}
              id="totalBudgetAmount"
              onChange={(e) => setTotalBudgetAmount(e.target.value)}
              placeholder="0.00"
              step="0.01"
              type="number"
              value={totalBudgetAmount}
            />
            {errors.totalBudgetAmount && (
              <p className="text-sm text-red-500 mt-1">
                {errors.totalBudgetAmount}
              </p>
            )}
            {!isEditing && lineItemsTotal > 0 && (
              <p className="text-sm text-muted-foreground mt-1">
                Line items total: ${lineItemsTotal.toFixed(2)}
              </p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label_1.Label htmlFor="notes">Notes</label_1.Label>
            <textarea_1.Textarea
              id="notes"
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes about this budget"
              rows={3}
              value={notes}
            />
          </div>

          {/* Line Items Section */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-2">
              <label_1.Label>Line Items</label_1.Label>
              <button_1.Button
                onClick={addLineItem}
                size="sm"
                type="button"
                variant="outline"
              >
                Add Line Item
              </button_1.Button>
            </div>

            {lineItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No line items. Add items to break down the budget.
              </p>
            ) : (
              <div className="space-y-3">
                {lineItems.map((item, index) => (
                  <div
                    className="border rounded-lg p-3 space-y-2"
                    key={item.id}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        Line Item {index + 1}
                      </span>
                      <button_1.Button
                        onClick={() => removeLineItem(item.id)}
                        size="sm"
                        type="button"
                        variant="ghost"
                      >
                        <lucide_react_1.XIcon className="h-3 w-3" />
                      </button_1.Button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label_1.Label
                          className="text-xs"
                          htmlFor={`category_${item.id}`}
                        >
                          Category
                        </label_1.Label>
                        <select_1.Select
                          onValueChange={(v) =>
                            updateLineItem(item.id, "category", v)
                          }
                          value={item.category}
                        >
                          <select_1.SelectTrigger id={`category_${item.id}`}>
                            <select_1.SelectValue />
                          </select_1.SelectTrigger>
                          <select_1.SelectContent>
                            <select_1.SelectItem value="venue">
                              Venue
                            </select_1.SelectItem>
                            <select_1.SelectItem value="catering">
                              Catering
                            </select_1.SelectItem>
                            <select_1.SelectItem value="beverages">
                              Beverages
                            </select_1.SelectItem>
                            <select_1.SelectItem value="labor">
                              Labor
                            </select_1.SelectItem>
                            <select_1.SelectItem value="equipment">
                              Equipment
                            </select_1.SelectItem>
                            <select_1.SelectItem value="other">
                              Other
                            </select_1.SelectItem>
                          </select_1.SelectContent>
                        </select_1.Select>
                      </div>

                      <div>
                        <label_1.Label
                          className="text-xs"
                          htmlFor={`amount_${item.id}`}
                        >
                          Amount
                        </label_1.Label>
                        <input_1.Input
                          className={
                            errors[`lineItem_${index}_amount`]
                              ? "border-red-500"
                              : ""
                          }
                          id={`amount_${item.id}`}
                          onChange={(e) =>
                            updateLineItem(
                              item.id,
                              "budgetedAmount",
                              e.target.value
                            )
                          }
                          placeholder="0.00"
                          step="0.01"
                          type="number"
                          value={item.budgetedAmount}
                        />
                        {errors[`lineItem_${index}_amount`] && (
                          <p className="text-xs text-red-500">
                            {errors[`lineItem_${index}_amount`]}
                          </p>
                        )}
                      </div>
                    </div>

                    <div>
                      <label_1.Label
                        className="text-xs"
                        htmlFor={`name_${item.id}`}
                      >
                        Name *
                      </label_1.Label>
                      <input_1.Input
                        className={
                          errors[`lineItem_${index}_name`]
                            ? "border-red-500"
                            : ""
                        }
                        id={`name_${item.id}`}
                        onChange={(e) =>
                          updateLineItem(item.id, "name", e.target.value)
                        }
                        placeholder="Line item name"
                        value={item.name}
                      />
                      {errors[`lineItem_${index}_name`] && (
                        <p className="text-xs text-red-500">
                          {errors[`lineItem_${index}_name`]}
                        </p>
                      )}
                    </div>

                    <div>
                      <label_1.Label
                        className="text-xs"
                        htmlFor={`desc_${item.id}`}
                      >
                        Description
                      </label_1.Label>
                      <input_1.Input
                        id={`desc_${item.id}`}
                        onChange={(e) =>
                          updateLineItem(item.id, "description", e.target.value)
                        }
                        placeholder="Optional description"
                        value={item.description}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button_1.Button
              disabled={loading}
              onClick={onClose}
              variant="outline"
            >
              Cancel
            </button_1.Button>
            <button_1.Button disabled={loading} onClick={handleSave}>
              {loading
                ? "Saving..."
                : isEditing
                  ? "Update Budget"
                  : "Create Budget"}
            </button_1.Button>
          </div>
        </div>
      </div>
    </div>
  );
}
