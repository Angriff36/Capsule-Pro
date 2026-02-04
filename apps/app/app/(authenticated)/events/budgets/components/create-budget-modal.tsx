"use client";

import { Button } from "@repo/design-system/components/ui/button";
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
import { XIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type {
  BudgetLineItem,
  BudgetLineItemCategory,
  CreateEventBudgetInput,
  EventBudget,
  EventBudgetStatus,
  UpdateEventBudgetInput,
} from "@/app/lib/use-event-budgets";

interface CreateBudgetModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (
    data: CreateEventBudgetInput | UpdateEventBudgetInput
  ) => Promise<void>;
  budget?: EventBudget;
  loading: boolean;
}

export function CreateBudgetModal({
  open,
  onClose,
  onSave,
  budget,
  loading,
}: CreateBudgetModalProps) {
  const isEditing = !!budget;

  // Form state
  const [eventId, setEventId] = useState(budget?.eventId || "");
  const [status, setStatus] = useState<EventBudgetStatus>(
    budget?.status || "draft"
  );
  const [totalBudgetAmount, setTotalBudgetAmount] = useState(
    budget?.totalBudgetAmount.toString() || ""
  );
  const [notes, setNotes] = useState(budget?.notes || "");

  // Line items state
  const [lineItems, setLineItems] = useState<
    Array<{
      id: string;
      category: BudgetLineItemCategory;
      name: string;
      description: string;
      budgetedAmount: string;
      sortOrder: number;
      notes: string;
    }>
  >(
    budget?.lineItems?.map((item: BudgetLineItem) => ({
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
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when opening/closing
  useEffect(() => {
    if (open) {
      if (budget) {
        setEventId(budget.eventId);
        setStatus(budget.status);
        setTotalBudgetAmount(budget.totalBudgetAmount.toString());
        setNotes(budget.notes || "");
        setLineItems(
          budget.lineItems?.map((item: BudgetLineItem) => ({
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
  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {};

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

    const data: CreateEventBudgetInput | UpdateEventBudgetInput = {
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
  const removeLineItem = (id: string) => {
    setLineItems(lineItems.filter((item) => item.id !== id));
  };

  // Update line item
  const updateLineItem = (
    id: string,
    field: string,
    value: string | BudgetLineItemCategory
  ) => {
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

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-50 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white p-6 shadow-lg dark:bg-gray-900">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">
            {isEditing ? "Edit Budget" : "Create Budget"}
          </h2>
          <Button onClick={onClose} size="sm" variant="ghost">
            <XIcon className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-4">
          {/* Event ID */}
          <div>
            <Label htmlFor="eventId">Event ID *</Label>
            <Input
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
              <Label htmlFor="status">Status</Label>
              <Select
                onValueChange={(v) => setStatus(v as EventBudgetStatus)}
                value={status}
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="exceeded">Exceeded</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Total Budget Amount */}
          <div>
            <Label htmlFor="totalBudgetAmount">Total Budget Amount *</Label>
            <Input
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
            <Label htmlFor="notes">Notes</Label>
            <Textarea
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
              <Label>Line Items</Label>
              <Button
                onClick={addLineItem}
                size="sm"
                type="button"
                variant="outline"
              >
                Add Line Item
              </Button>
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
                      <Button
                        onClick={() => removeLineItem(item.id)}
                        size="sm"
                        type="button"
                        variant="ghost"
                      >
                        <XIcon className="h-3 w-3" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label
                          className="text-xs"
                          htmlFor={`category_${item.id}`}
                        >
                          Category
                        </Label>
                        <Select
                          onValueChange={(v) =>
                            updateLineItem(
                              item.id,
                              "category",
                              v as BudgetLineItemCategory
                            )
                          }
                          value={item.category}
                        >
                          <SelectTrigger id={`category_${item.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="venue">Venue</SelectItem>
                            <SelectItem value="catering">Catering</SelectItem>
                            <SelectItem value="beverages">Beverages</SelectItem>
                            <SelectItem value="labor">Labor</SelectItem>
                            <SelectItem value="equipment">Equipment</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label
                          className="text-xs"
                          htmlFor={`amount_${item.id}`}
                        >
                          Amount
                        </Label>
                        <Input
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
                      <Label className="text-xs" htmlFor={`name_${item.id}`}>
                        Name *
                      </Label>
                      <Input
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
                      <Label className="text-xs" htmlFor={`desc_${item.id}`}>
                        Description
                      </Label>
                      <Input
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
            <Button disabled={loading} onClick={onClose} variant="outline">
              Cancel
            </Button>
            <Button disabled={loading} onClick={handleSave}>
              {loading
                ? "Saving..."
                : isEditing
                  ? "Update Budget"
                  : "Create Budget"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
