"use client";

import { useState } from "react";
import { Button } from "@capsule/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@capsule/ui/select";
import { Input } from "@capsule/ui/input";
import { Label } from "@capsule/ui/label";
import { Textarea } from "@capsule/ui/textarea";
import { Trash2, CheckCircle2 } from "lucide-react";
import { useToast } from "@capsule/ui/use-toast";

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
        description: error instanceof Error ? error.message : "Failed to log waste entry",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Inventory Item */}
      <div className="space-y-2">
        <Label htmlFor="inventoryItemId">Item *</Label>
        <Select
          value={formData.inventoryItemId}
          onValueChange={(value) =>
            setFormData({ ...formData, inventoryItemId: value })
          }
          required
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
          type="number"
          step="0.001"
          min="0.001"
          placeholder="0.00"
          value={formData.quantity}
          onChange={(e) =>
            setFormData({ ...formData, quantity: e.target.value })
          }
          required
        />
      </div>

      {/* Reason */}
      <div className="space-y-2">
        <Label htmlFor="reasonId">Reason *</Label>
        <Select
          value={formData.reasonId}
          onValueChange={(value) =>
            setFormData({ ...formData, reasonId: value })
          }
          required
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
          value={formData.unitId}
          onValueChange={(value) =>
            setFormData({ ...formData, unitId: value })
          }
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
          placeholder="Additional context about this waste entry..."
          value={formData.notes}
          onChange={(e) =>
            setFormData({ ...formData, notes: e.target.value })
          }
          rows={3}
        />
      </div>

      {/* Submit */}
      <Button type="submit" disabled={submitting} className="w-full">
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
