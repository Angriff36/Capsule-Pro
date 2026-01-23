"use client";

import { CheckIcon, PlusIcon, TrashIcon, XIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  type BudgetCategory,
  type CreateBudgetLineItemRequest,
  type EventBudgetStatus,
  getCategoryLabel,
  createBudget,
} from "../../../../lib/use-budgets";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import { invariant } from "../../../../lib/invariant";

interface LineItemForm extends CreateBudgetLineItemRequest {
  id: string;
}

interface CreateBudgetModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export const CreateBudgetModal = ({
  open,
  onClose,
  onCreated,
}: CreateBudgetModalProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [eventId, setEventId] = useState("");
  const [status, setStatus] = useState<EventBudgetStatus>("draft");
  const [notes, setNotes] = useState("");
  const [lineItems, setLineItems] = useState<LineItemForm[]>([]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!open) {
      setEventId("");
      setStatus("draft");
      setNotes("");
      setLineItems([]);
    }
  }, [open]);

  const addLineItem = useCallback(() => {
    const newItem: LineItemForm = {
      id: crypto.randomUUID(),
      category: "food",
      name: "",
      description: "",
      budgetedAmount: 0,
      actualAmount: 0,
      sortOrder: lineItems.length,
      notes: "",
    };
    setLineItems([...lineItems, newItem]);
  }, [lineItems]);

  const updateLineItem = useCallback(
    (id: string, updates: Partial<LineItemForm>) => {
      setLineItems(
        lineItems.map((item) => (item.id === id ? { ...item, ...updates } : item))
      );
    },
    [lineItems]
  );

  const removeLineItem = useCallback(
    (id: string) => {
      setLineItems(lineItems.filter((item) => item.id !== id));
    },
    [lineItems]
  );

  const validateForm = useCallback((): boolean => {
    if (!eventId) {
      toast.error("Please select an event");
      return false;
    }

    for (const item of lineItems) {
      if (!item.name) {
        toast.error("All line items must have a name");
        return false;
      }
      if (item.budgetedAmount < 0) {
        toast.error("Budgeted amount cannot be negative");
        return false;
      }
    }

    return true;
  }, [eventId, lineItems]);

  const handleSubmit = useCallback(async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const validLineItems: CreateBudgetLineItemRequest[] = lineItems
        .filter((item) => item.name.trim() !== "")
        .map(({ id, ...rest }) => ({
          ...rest,
          description: rest.description || undefined,
          actualAmount: rest.actualAmount || 0,
          notes: rest.notes || undefined,
        }));

      await createBudget({
        eventId,
        status,
        notes: notes || undefined,
        lineItems: validLineItems.length > 0 ? validLineItems : undefined,
      });

      toast.success("Budget created successfully");
      onClose();
      onCreated();
    } catch (error) {
      console.error("Failed to create budget:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create budget"
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [eventId, status, notes, lineItems, validateForm, onClose, onCreated]);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const totalBudgeted = lineItems.reduce(
    (sum, item) => sum + item.budgetedAmount,
    0
  );
  const totalActual = lineItems.reduce((sum, item) => sum + (item.actualAmount || 0), 0);

  // For now, we'll use a simple text input for event ID
  // In production, this should be a searchable dropdown of events
  return (
    <Dialog onOpenChange={onClose} open={open}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Budget</DialogTitle>
          <DialogDescription>
            Create a budget for an event with line items to track costs.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Event Selection */}
          <div className="space-y-2">
            <Label htmlFor="eventId">Event ID *</Label>
            <Input
              id="eventId"
              placeholder="Enter event ID"
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
            />
            <p className="text-muted-foreground text-xs">
              Enter the ID of the event you want to create a budget for
            </p>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select onValueChange={(v) => setStatus(v as EventBudgetStatus)} value={status}>
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="locked">Locked</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Optional notes for this budget..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Line Items */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Line Items</Label>
              <Button onClick={addLineItem} size="sm" variant="outline">
                <PlusIcon className="mr-1 size-3" />
                Add Line Item
              </Button>
            </div>

            {lineItems.length === 0 ? (
              <div className="rounded-md border border-dashed p-8 text-center">
                <p className="text-muted-foreground text-sm">
                  No line items yet. Add items to track budget categories.
                </p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-32">Category</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead className="w-24 text-right">Budgeted</TableHead>
                      <TableHead className="w-24 text-right">Actual</TableHead>
                      <TableHead className="w-16" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lineItems.map((item, index) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Select
                            onValueChange={(v) =>
                              updateLineItem(item.id, { category: v as BudgetCategory })
                            }
                            value={item.category}
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="food">Food</SelectItem>
                              <SelectItem value="labor">Labor</SelectItem>
                              <SelectItem value="rentals">Rentals</SelectItem>
                              <SelectItem value="miscellaneous">
                                Miscellaneous
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            className="h-8"
                            placeholder="Item name"
                            value={item.name}
                            onChange={(e) =>
                              updateLineItem(item.id, { name: e.target.value })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            className="h-8 text-right"
                            min={0}
                            placeholder="0.00"
                            step="0.01"
                            type="number"
                            value={item.budgetedAmount || ""}
                            onChange={(e) =>
                              updateLineItem(item.id, {
                                budgetedAmount: parseFloat(e.target.value) || 0,
                              })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            className="h-8 text-right"
                            min={0}
                            placeholder="0.00"
                            step="0.01"
                            type="number"
                            value={item.actualAmount || ""}
                            onChange={(e) =>
                              updateLineItem(item.id, {
                                actualAmount: parseFloat(e.target.value) || 0,
                              })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            onClick={() => removeLineItem(item.id)}
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive"
                          >
                            <TrashIcon className="size-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Totals */}
            {lineItems.length > 0 && (
              <div className="flex justify-end gap-6 rounded-md bg-muted p-4">
                <div className="text-right">
                  <div className="text-muted-foreground text-xs">Total Budgeted</div>
                  <div className="font-semibold">{formatCurrency(totalBudgeted)}</div>
                </div>
                <div className="text-right">
                  <div className="text-muted-foreground text-xs">Total Actual</div>
                  <div className="font-semibold">{formatCurrency(totalActual)}</div>
                </div>
                <div className="text-right">
                  <div className="text-muted-foreground text-xs">Variance</div>
                  <div
                    className={`font-semibold ${
                      totalBudgeted - totalActual < 0
                        ? "text-red-600"
                        : totalBudgeted - totalActual === 0
                        ? "text-gray-600"
                        : "text-green-600"
                    }`}
                  >
                    {formatCurrency(totalBudgeted - totalActual)}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            disabled={isSubmitting}
            onClick={onClose}
            variant="outline"
          >
            Cancel
          </Button>
          <Button disabled={isSubmitting} onClick={handleSubmit}>
            {isSubmitting ? "Creating..." : "Create Budget"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
