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
import { useToast } from "@repo/design-system/hooks/use-toast";
import { Trash2 } from "lucide-react";
import { useState } from "react";

export function WasteEntriesClient() {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    inventoryItemId: "",
    quantity: "",
    reasonId: "",
    unitId: "",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Get current user ID from auth context (TODO: implement properly)
      const loggedBy = "current-user-id"; // Placeholder

      const response = await fetch("/api/kitchen/waste/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          loggedBy,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to log waste entry");
      }

      const result = await response.json();

      toast({
        title: "Waste entry logged",
        description: `Cost: $${result.entry.totalCost?.toFixed(2) || "0.00"}`,
        variant: "default",
      });

      // Reset form
      setFormData({
        inventoryItemId: "",
        quantity: "",
        reasonId: "",
        unitId: "",
        notes: "",
      });
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to log waste entry",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {/* Inventory Item */}
      <div className="space-y-2">
        <Label htmlFor="inventoryItemId">Item *</Label>
        <Select
          onValueChange={(value) =>
            setFormData({ ...formData, inventoryItemId: value })
          }
          required
          value={formData.inventoryItemId}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select item" />
          </SelectTrigger>
          <SelectContent>
            {/* TODO: Fetch actual inventory items */}
            <SelectItem value="item-1">Tomatoes</SelectItem>
            <SelectItem value="item-2">Lettuce</SelectItem>
            <SelectItem value="item-3">Chicken Breast</SelectItem>
            <SelectItem value="item-4">Flour</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Quantity */}
      <div className="space-y-2">
        <Label htmlFor="quantity">Quantity *</Label>
        <Input
          id="quantity"
          min="0.001"
          onChange={(e) =>
            setFormData({ ...formData, quantity: e.target.value })
          }
          placeholder="0.00"
          required
          step="0.001"
          type="number"
          value={formData.quantity}
        />
      </div>

      {/* Reason */}
      <div className="space-y-2">
        <Label htmlFor="reasonId">Reason *</Label>
        <Select
          onValueChange={(value) =>
            setFormData({ ...formData, reasonId: value })
          }
          required
          value={formData.reasonId}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select reason" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Spoilage</SelectItem>
            <SelectItem value="2">Overproduction</SelectItem>
            <SelectItem value="3">Preparation Error</SelectItem>
            <SelectItem value="4">Burnt</SelectItem>
            <SelectItem value="5">Expired</SelectItem>
            <SelectItem value="6">Quality Issues</SelectItem>
            <SelectItem value="7">Dropped/Spilled</SelectItem>
            <SelectItem value="8">Leftovers</SelectItem>
            <SelectItem value="9">Customer Return</SelectItem>
            <SelectItem value="10">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Unit */}
      <div className="space-y-2">
        <Label htmlFor="unitId">Unit (optional)</Label>
        <Select
          onValueChange={(value) => setFormData({ ...formData, unitId: value })}
          value={formData.unitId}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select unit" />
          </SelectTrigger>
          <SelectContent>
            {/* TODO: Fetch actual units */}
            <SelectItem value="1">Grams</SelectItem>
            <SelectItem value="2">Kilograms</SelectItem>
            <SelectItem value="3">Ounces</SelectItem>
            <SelectItem value="4">Pounds</SelectItem>
            <SelectItem value="5">Liters</SelectItem>
            <SelectItem value="6">Milliliters</SelectItem>
            <SelectItem value="7">Count</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Textarea
          id="notes"
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Additional context about this waste entry..."
          rows={3}
          value={formData.notes}
        />
      </div>

      {/* Submit */}
      <Button className="w-full" disabled={submitting} type="submit">
        {submitting ? (
          "Logging..."
        ) : (
          <>
            <Trash2 className="mr-2 h-4 w-4" />
            Log Waste Entry
          </>
        )}
      </Button>
    </form>
  );
}
