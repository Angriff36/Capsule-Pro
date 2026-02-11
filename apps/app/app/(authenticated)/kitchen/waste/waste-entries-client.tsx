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
import { Textarea } from "@repo/design-system/components/ui/textarea";
import { AlertCircle, DollarSign, Package, Search, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/app/lib/api";

interface InventoryItem {
  id: string;
  name: string;
  item_number: string;
  unit_cost?: number;
  quantity_on_hand?: number;
  category?: string;
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
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([]);
  const [wasteReasons, setWasteReasons] = useState<WasteReason[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useTransition();
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [formData, setFormData] = useState({
    inventoryItemId: "",
    quantity: "",
    reasonId: "",
    unitId: "",
    notes: "",
  });
  const [estimatedCost, setEstimatedCost] = useState<number | null>(null);

  // Fetch waste reasons and units on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [reasonsRes, unitsRes] = await Promise.all([
          apiFetch("/api/kitchen/waste/reasons", {
            credentials: "include",
          }),
          apiFetch("/api/kitchen/waste/units", {
            credentials: "include",
          }),
        ]);

        if (reasonsRes.ok) {
          const reasonsData = await reasonsRes.json();
          setWasteReasons(reasonsData.data || []);
        } else {
          console.warn("Failed to fetch waste reasons");
          setWasteReasons([]);
        }
        if (unitsRes.ok) {
          const unitsData = await unitsRes.json();
          setUnits(unitsData.data || []);
        } else {
          console.warn("Failed to fetch units");
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

  // Debounced search for inventory items
  const debouncedSearch = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setFilteredItems([]);
      setSelectedItem(null);
      return;
    }

    setIsSearching(async () => {
      try {
        const response = await apiFetch(
          `/api/inventory/items?search=${encodeURIComponent(query)}&limit=20`,
          { credentials: "include" }
        );

        if (response.ok) {
          const data = await response.json();
          setFilteredItems(data.data || []);
        } else {
          setFilteredItems([]);
        }
      } catch (error) {
        console.error("Failed to search inventory items:", error);
        setFilteredItems([]);
      }
    });
  }, []);

  // Search effect with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      debouncedSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, debouncedSearch]);

  // Update estimated cost when item or quantity changes
  useEffect(() => {
    if (selectedItem && formData.quantity) {
      const quantity = Number.parseFloat(formData.quantity);
      const unitCost = selectedItem.unit_cost ?? 0;
      if (!Number.isNaN(quantity) && quantity > 0) {
        setEstimatedCost(quantity * unitCost);
      } else {
        setEstimatedCost(null);
      }
    } else {
      setEstimatedCost(null);
    }
  }, [selectedItem, formData.quantity]);

  const handleItemSelect = (item: InventoryItem) => {
    setSelectedItem(item);
    setFormData({ ...formData, inventoryItemId: item.id });
    setSearchQuery(`${item.item_number} - ${item.name}`);
    setFilteredItems([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    if (!formData.inventoryItemId) {
      toast.error("Please select an inventory item");
      return;
    }
    if (!formData.quantity || Number.parseFloat(formData.quantity) <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }
    if (!formData.reasonId) {
      toast.error("Please select a reason for the waste");
      return;
    }

    // Show confirmation dialog
    setShowConfirmDialog(true);
  };

  const confirmSubmit = async () => {
    setShowConfirmDialog(false);
    setSubmitting(true);

    try {
      const response = await apiFetch("/api/kitchen/waste/entries", {
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
      setSearchQuery("");
      setSelectedItem(null);
      setEstimatedCost(null);
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
    <>
      <form className="space-y-4" onSubmit={handleSubmit}>
        {/* Inventory Item with Search */}
        <div className="space-y-2">
          <Label htmlFor="itemSearch">Item *</Label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="h-4 w-4 text-muted-foreground" />
            </div>
            <Input
              className="pl-10"
              id="itemSearch"
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by item number or name..."
              type="text"
              value={searchQuery}
            />
            {isSearching && (
              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            )}
          </div>

          {/* Search Results Dropdown */}
          {filteredItems.length > 0 && (
            <div className="border rounded-md shadow-sm bg-background max-h-60 overflow-y-auto">
              {filteredItems.map((item) => (
                <button
                  className="w-full text-left px-3 py-2 hover:bg-muted transition-colors border-b last:border-b-0"
                  key={item.id}
                  onClick={() => handleItemSelect(item)}
                  type="button"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm">
                        {item.item_number} - {item.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {item.category} • Stock: {item.quantity_on_hand ?? 0}
                      </div>
                    </div>
                    {item.unit_cost !== undefined && item.unit_cost > 0 && (
                      <div className="text-xs font-medium text-green-600">
                        ${item.unit_cost.toFixed(2)}/unit
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Selected Item Info */}
          {selectedItem && (
            <div className="mt-2 p-3 bg-muted rounded-md border">
              <div className="flex items-start gap-3">
                <Package className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">
                    {selectedItem.item_number} - {selectedItem.name}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Category: {selectedItem.category} • Stock on hand:{" "}
                    {selectedItem.quantity_on_hand ?? 0}
                  </div>
                  {selectedItem.unit_cost !== undefined &&
                    selectedItem.unit_cost > 0 && (
                      <div className="text-xs text-green-600 mt-1">
                        Unit cost: ${selectedItem.unit_cost.toFixed(2)}
                      </div>
                    )}
                </div>
                <Button
                  onClick={() => {
                    setSelectedItem(null);
                    setSearchQuery("");
                    setFormData({ ...formData, inventoryItemId: "" });
                    setEstimatedCost(null);
                  }}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  Change
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Quantity */}
        <div className="space-y-2">
          <Label htmlFor="quantity">Quantity *</Label>
          <Input
            disabled={submitting}
            id="quantity"
            min="0.001"
            onChange={(e) => {
              setFormData({ ...formData, quantity: e.target.value });
            }}
            placeholder="0.00"
            required
            step="0.001"
            type="number"
            value={formData.quantity}
          />
          {/* Estimated Cost Display */}
          {estimatedCost !== null && estimatedCost > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              <span>
                Estimated cost:{" "}
                <strong className="text-foreground">
                  ${estimatedCost.toFixed(2)}
                </strong>
              </span>
            </div>
          )}
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
            onValueChange={(value) =>
              setFormData({ ...formData, unitId: value })
            }
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
            onChange={(e) =>
              setFormData({ ...formData, notes: e.target.value })
            }
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

      {/* Confirmation Dialog */}
      <Dialog onOpenChange={setShowConfirmDialog} open={showConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              Confirm Waste Entry
            </DialogTitle>
            <DialogDescription>
              Please review the waste entry details before confirming:
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            {selectedItem && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Item:</span>
                <span className="font-medium">
                  {selectedItem.item_number} - {selectedItem.name}
                </span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Quantity:</span>
              <span className="font-medium">{formData.quantity}</span>
            </div>
            {formData.unitId && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Unit:</span>
                <span className="font-medium">
                  {
                    units.find((u) => u.id.toString() === formData.unitId)
                      ?.name_plural
                  }
                </span>
              </div>
            )}
            {formData.reasonId && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Reason:</span>
                <span className="font-medium">
                  {
                    wasteReasons.find(
                      (r) => r.id.toString() === formData.reasonId
                    )?.name
                  }
                </span>
              </div>
            )}
            {estimatedCost !== null && estimatedCost > 0 && (
              <div className="flex justify-between text-sm border-t pt-3">
                <span className="text-muted-foreground">Estimated Cost:</span>
                <span className="font-bold text-red-600">
                  ${estimatedCost.toFixed(2)}
                </span>
              </div>
            )}
            {formData.notes && (
              <div className="text-sm border-t pt-3">
                <span className="text-muted-foreground">Notes: </span>
                <span>{formData.notes}</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              onClick={() => setShowConfirmDialog(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button disabled={submitting} onClick={confirmSubmit}>
              {submitting ? "Logging..." : "Confirm Waste Entry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
