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
import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface InventoryItem {
  id: string;
  name: string;
  item_number: string;
}

interface WasteReason {
  id: number;
  code: string;
  name: string;
  description: string | null;
  colorHex: string | null;
  sortOrder: number;
}

interface Unit {
  id: number;
  code: string;
  name: string;
  name_plural: string;
  unit_system: string;
  unit_type: string;
}

export function WasteEntriesClient() {
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [wasteReasons, setWasteReasons] = useState<WasteReason[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [formData, setFormData] = useState({
    inventoryItemId: "",
    quantity: "",
    reasonId: "",
    unitId: "",
    notes: "",
  });

  // Fetch dropdown data on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch inventory items, waste reasons, and units in parallel
        const [itemsRes, reasonsRes, unitsRes] = await Promise.all([
          fetch("/api/inventory/items?limit=500", {
            credentials: "include",
          }),
          fetch("/api/kitchen/waste/reasons", {
            credentials: "include",
          }),
          fetch("/api/kitchen/waste/units", {
            credentials: "include",
          }),
        ]);

        if (itemsRes.ok) {
          const itemsData = await itemsRes.json();
          setInventoryItems(itemsData.data || []);
        } else {
          console.warn(
            "Failed to fetch inventory items, server may be unavailable"
          );
          setInventoryItems([]);
        }
        if (reasonsRes.ok) {
          const reasonsData = await reasonsRes.json();
          setWasteReasons(reasonsData.data || []);
        } else {
          console.warn(
            "Failed to fetch waste reasons, server may be unavailable"
          );
          setWasteReasons([]);
        }
        if (unitsRes.ok) {
          const unitsData = await unitsRes.json();
          setUnits(unitsData.data || []);
        } else {
          console.warn("Failed to fetch units, server may be unavailable");
          setUnits([]);
        }
      } catch (error) {
        console.error("Failed to fetch dropdown data:", error);
        toast.error("Failed to load form data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch("/api/kitchen/waste/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to log waste entry");
      }

      const result = await response.json();

      toast.success(
        `Waste entry logged - Cost: $${result.entry.totalCost?.toFixed(2) || "0.00"}`
      );

      // Reset form
      setFormData({
        inventoryItemId: "",
        quantity: "",
        reasonId: "",
        unitId: "",
        notes: "",
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to log waste entry"
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading form...</div>;
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {/* Inventory Item */}
      <div className="space-y-2">
        <Label htmlFor="inventoryItemId">Item *</Label>
        <Select
          disabled={inventoryItems.length === 0}
          onValueChange={(value) =>
            setFormData({ ...formData, inventoryItemId: value })
          }
          required
          value={formData.inventoryItemId}
        >
          <SelectTrigger>
            <SelectValue
              placeholder={
                inventoryItems.length === 0
                  ? "No items available"
                  : "Select item"
              }
            />
          </SelectTrigger>
          <SelectContent>
            {inventoryItems.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.item_number} - {item.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Quantity */}
      <div className="space-y-2">
        <Label htmlFor="quantity">Quantity *</Label>
        <Input
          disabled={submitting}
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
          disabled={wasteReasons.length === 0}
          onValueChange={(value) =>
            setFormData({ ...formData, reasonId: value })
          }
          required
          value={formData.reasonId}
        >
          <SelectTrigger>
            <SelectValue
              placeholder={
                wasteReasons.length === 0
                  ? "No reasons available"
                  : "Select reason"
              }
            />
          </SelectTrigger>
          <SelectContent>
            {wasteReasons.map((reason) => (
              <SelectItem key={reason.id} value={reason.id.toString()}>
                {reason.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Unit */}
      <div className="space-y-2">
        <Label htmlFor="unitId">Unit (optional)</Label>
        <Select
          disabled={units.length === 0}
          onValueChange={(value) => setFormData({ ...formData, unitId: value })}
          value={formData.unitId}
        >
          <SelectTrigger>
            <SelectValue
              placeholder={
                units.length === 0 ? "No units available" : "Select unit"
              }
            />
          </SelectTrigger>
          <SelectContent>
            {units.map((unit) => (
              <SelectItem key={unit.id} value={unit.id.toString()}>
                {unit.name_plural}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Textarea
          disabled={submitting}
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
