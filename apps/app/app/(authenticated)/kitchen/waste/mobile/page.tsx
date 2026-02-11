"use client";

import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
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
import { Trash2, Wifi, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";
import { apiFetch } from "@/app/lib/api";
import { Header } from "../../../components/header";

interface WasteReason {
  id: string;
  name: string;
  category: string;
}

interface InventoryItem {
  id: string;
  name: string;
  unit: string;
  currentStock?: number;
}

interface WasteEntryFormData {
  itemId: string;
  quantity: number;
  reasonId: string;
  location: string;
  notes: string;
}

const locationOptions = [
  "Hot Line",
  "Cold Station",
  "Pastry",
  "Prep",
  "Garde Manger",
  "Walk-in Cooler",
  "Walk-in Freezer",
  "Dry Storage",
  "Other",
];

export default function WasteLoggingMobilePage() {
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [wasteReasons, setWasteReasons] = useState<WasteReason[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [syncQueue, setSyncQueue] = useState<WasteEntryFormData[]>([]);

  const [formData, setFormData] = useState<WasteEntryFormData>({
    itemId: "",
    quantity: 0,
    reasonId: "",
    location: "",
    notes: "",
  });

  const [errors, setErrors] = useState<
    Partial<Record<keyof WasteEntryFormData, string>>
  >({});
  const [successMessage, setSuccessMessage] = useState("");

  const fetchInventoryItems = async () => {
    try {
      const response = await apiFetch("/api/inventory/items?limit=100");
      if (response.ok) {
        const data = await response.json();
        setInventoryItems(data.items || []);
      }
    } catch (error) {
      console.error("Error fetching inventory items:", error);
    }
  };

  const fetchWasteReasons = async () => {
    try {
      const response = await apiFetch("/api/kitchen/waste/reasons");
      if (response.ok) {
        const data = await response.json();
        setWasteReasons(data.reasons || []);
      }
    } catch (error) {
      console.error("Error fetching waste reasons:", error);
    }
  };

  const syncOfflineEntries = async () => {
    for (const entry of syncQueue) {
      try {
        await apiFetch("/api/kitchen/waste/entries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(entry),
        });
      } catch (error) {
        console.error("Error syncing waste entry:", error);
      }
    }
    setSyncQueue([]);
  };

  useEffect(() => {
    fetchInventoryItems();
    fetchWasteReasons();
  }, [fetchInventoryItems, fetchWasteReasons]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Sync offline queue when coming back online
  useEffect(() => {
    if (isOnline && syncQueue.length > 0) {
      syncOfflineEntries();
    }
  }, [isOnline, syncQueue, syncOfflineEntries]);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof WasteEntryFormData, string>> = {};

    if (!formData.itemId) {
      newErrors.itemId = "Item is required";
    }
    if (!formData.quantity || formData.quantity <= 0) {
      newErrors.quantity = "Quantity must be greater than 0";
    }
    if (!formData.reasonId) {
      newErrors.reasonId = "Reason is required";
    }
    if (!formData.location) {
      newErrors.location = "Location is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage("");

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    const submitData = {
      ...formData,
      quantity: Number(formData.quantity),
    };

    if (!isOnline) {
      // Queue for later sync
      setSyncQueue((prev) => [...prev, submitData]);
      setSuccessMessage(
        "Waste entry saved! Will sync when you're back online."
      );
      setIsLoading(false);
      resetForm();
      return;
    }

    try {
      const response = await apiFetch("/api/kitchen/waste/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitData),
      });

      if (response.ok) {
        setSuccessMessage("Waste entry logged successfully!");
        resetForm();
      } else {
        const error = await response.json();
        setErrors({ itemId: error.message || "Failed to log waste entry" });
      }
    } catch (error) {
      console.error("Error logging waste:", error);
      setErrors({ itemId: "Failed to connect. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      itemId: "",
      quantity: 0,
      reasonId: "",
      location: "",
      notes: "",
    });
    setErrors({});
  };

  const selectedItem = inventoryItems.find(
    (item) => item.id === formData.itemId
  );
  const selectedReason = wasteReasons.find(
    (reason) => reason.id === formData.reasonId
  );

  return (
    <>
      <Header page="Log Waste" pages={["Kitchen Ops"]} />

      {!isOnline && (
        <div className="flex items-center justify-center gap-2 bg-amber-500 px-4 py-2">
          <WifiOff className="h-4 w-4 text-white" />
          <span className="font-medium text-white">
            You're offline. Entry will sync when you reconnect.
          </span>
        </div>
      )}

      {syncQueue.length > 0 && (
        <div className="flex items-center justify-center gap-2 bg-blue-500 px-4 py-2">
          <Wifi className="h-4 w-4 text-white" />
          <span className="font-medium text-white">
            {syncQueue.length} entry pending sync
          </span>
        </div>
      )}

      <div className="flex flex-1 flex-col p-4">
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Trash2 className="h-5 w-5 text-rose-600" />
              Log Waste Entry
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              {/* Item Selection */}
              <div className="space-y-2">
                <Label htmlFor="item">
                  Item <span className="text-rose-600">*</span>
                </Label>
                <Select
                  disabled={isLoading}
                  onValueChange={(value) =>
                    setFormData({ ...formData, itemId: value })
                  }
                  value={formData.itemId}
                >
                  <SelectTrigger id="item">
                    <SelectValue placeholder="Select an item" />
                  </SelectTrigger>
                  <SelectContent>
                    {inventoryItems.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name} ({item.unit})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.itemId && (
                  <p className="text-rose-600 text-sm">{errors.itemId}</p>
                )}
              </div>

              {/* Quantity */}
              <div className="space-y-2">
                <Label htmlFor="quantity">
                  Quantity <span className="text-rose-600">*</span>
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    disabled={isLoading}
                    id="quantity"
                    inputMode="numeric"
                    min="0"
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        quantity: Number.parseFloat(e.target.value) || 0,
                      })
                    }
                    placeholder="0"
                    step="0.01"
                    type="number"
                    value={formData.quantity || ""}
                  />
                  {selectedItem && (
                    <span className="text-slate-600 text-sm">
                      {selectedItem.unit}
                    </span>
                  )}
                </div>
                {errors.quantity && (
                  <p className="text-rose-600 text-sm">{errors.quantity}</p>
                )}
              </div>

              {/* Reason */}
              <div className="space-y-2">
                <Label htmlFor="reason">
                  Reason <span className="text-rose-600">*</span>
                </Label>
                <Select
                  disabled={isLoading}
                  onValueChange={(value) =>
                    setFormData({ ...formData, reasonId: value })
                  }
                  value={formData.reasonId}
                >
                  <SelectTrigger id="reason">
                    <SelectValue placeholder="Select a reason" />
                  </SelectTrigger>
                  <SelectContent>
                    {wasteReasons.map((reason) => (
                      <SelectItem key={reason.id} value={reason.id}>
                        {reason.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.reasonId && (
                  <p className="text-rose-600 text-sm">{errors.reasonId}</p>
                )}
              </div>

              {/* Location */}
              <div className="space-y-2">
                <Label htmlFor="location">
                  Location <span className="text-rose-600">*</span>
                </Label>
                <Select
                  disabled={isLoading}
                  onValueChange={(value) =>
                    setFormData({ ...formData, location: value })
                  }
                  value={formData.location}
                >
                  <SelectTrigger id="location">
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locationOptions.map((location) => (
                      <SelectItem key={location} value={location}>
                        {location}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.location && (
                  <p className="text-rose-600 text-sm">{errors.location}</p>
                )}
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea
                  disabled={isLoading}
                  id="notes"
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="Add any additional details..."
                  value={formData.notes}
                />
              </div>

              {/* Summary */}
              {selectedItem && selectedReason && formData.quantity > 0 && (
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-slate-600 text-sm">
                    Logging:{" "}
                    <strong>
                      {formData.quantity} {selectedItem.unit}
                    </strong>{" "}
                    of <strong>{selectedItem.name}</strong>
                  </p>
                  <p className="text-slate-600 text-sm">
                    Reason: <strong>{selectedReason.name}</strong>
                  </p>
                </div>
              )}

              {/* Success Message */}
              {successMessage && (
                <div className="rounded-lg bg-emerald-50 p-3">
                  <p className="text-emerald-800 text-sm font-medium">
                    {successMessage}
                  </p>
                </div>
              )}

              {/* Submit Button */}
              <Button
                className="h-14 w-full text-lg font-bold"
                disabled={isLoading}
                type="submit"
              >
                {isLoading ? "Saving..." : "LOG WASTE ENTRY"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
