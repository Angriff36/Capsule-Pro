"use client";

import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Input } from "@repo/design-system/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/app/lib/api";
import { inventoryBatchAdjust, inventoryItems } from "@/app/lib/routes";

interface InventoryItemOption {
  id: string;
  name: string;
  quantityOnHand: number;
}

interface AdjustmentRow {
  delta: string;
  itemId: string;
  reason: string;
}

export function BatchAdjustClient() {
  const [items, setItems] = useState<InventoryItemOption[]>([]);
  const [rows, setRows] = useState<AdjustmentRow[]>([
    { itemId: "", delta: "0", reason: "Batch adjustment" },
  ]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch(`${inventoryItems()}?limit=200`);
        if (!res.ok) {
          throw new Error("load failed");
        }
        const json = (await res.json()) as {
          data: Array<{ id: string; name: string; quantity_on_hand: number }>;
        };
        setItems(
          json.data.map((i) => ({
            id: i.id,
            name: i.name,
            quantityOnHand: Number(i.quantity_on_hand ?? 0),
          }))
        );
      } catch {
        toast.error("Failed to load inventory items");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const addRow = () => {
    setRows((prev) => [
      ...prev,
      { itemId: "", delta: "0", reason: "Batch adjustment" },
    ]);
  };

  const updateRow = (index: number, patch: Partial<AdjustmentRow>) => {
    setRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row))
    );
  };

  const removeRow = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const submit = useCallback(async () => {
    const adjustments = rows
      .filter((r) => r.itemId && r.reason.trim())
      .map((r) => ({
        itemId: r.itemId,
        delta: Number(r.delta),
        reason: r.reason.trim(),
      }))
      .filter((r) => r.delta !== 0);

    if (adjustments.length === 0) {
      toast.error("Add at least one non-zero adjustment");
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiFetch(inventoryBatchAdjust(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adjustments }),
      });
      const json = (await res.json()) as {
        success: boolean;
        adjusted: number;
        failed: number;
        message?: string;
      };
      if (!res.ok) {
        throw new Error(json.message ?? "Submit failed");
      }
      toast.success(`Adjusted ${json.adjusted} item(s)`);
      if (json.failed > 0) {
        toast.warning(`${json.failed} adjustment(s) failed`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Batch adjust failed");
    } finally {
      setSubmitting(false);
    }
  }, [rows]);

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="font-semibold text-2xl">Batch Inventory Adjustment</h1>
        <p className="text-muted-foreground text-sm">
          Apply quantity corrections across multiple items in one governed pass.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Adjustments</CardTitle>
          <CardDescription>
            Positive delta increases on-hand; negative decreases.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Delta</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <select
                      className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                      onChange={(e) =>
                        updateRow(index, { itemId: e.target.value })
                      }
                      value={row.itemId}
                    >
                      <option value="">Select item</option>
                      {items.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} ({item.quantityOnHand})
                        </option>
                      ))}
                    </select>
                  </TableCell>
                  <TableCell>
                    <Input
                      onChange={(e) =>
                        updateRow(index, { delta: e.target.value })
                      }
                      step="0.001"
                      type="number"
                      value={row.delta}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      onChange={(e) =>
                        updateRow(index, { reason: e.target.value })
                      }
                      value={row.reason}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      onClick={() => removeRow(index)}
                      size="icon"
                      variant="ghost"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex gap-2">
            <Button onClick={addRow} variant="outline">
              <Plus className="mr-1 size-4" />
              Add line
            </Button>
            <Button disabled={submitting} onClick={submit}>
              {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
              Apply batch
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
