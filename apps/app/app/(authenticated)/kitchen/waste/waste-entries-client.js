"use client";

Object.defineProperty(exports, "__esModule", { value: true });
exports.WasteEntriesClient = WasteEntriesClient;
const button_1 = require("@repo/design-system/components/ui/button");
const input_1 = require("@repo/design-system/components/ui/input");
const label_1 = require("@repo/design-system/components/ui/label");
const select_1 = require("@repo/design-system/components/ui/select");
const textarea_1 = require("@repo/design-system/components/ui/textarea");
const lucide_react_1 = require("lucide-react");
const react_1 = require("react");
const sonner_1 = require("sonner");
function WasteEntriesClient() {
  const [submitting, setSubmitting] = (0, react_1.useState)(false);
  const [loading, setLoading] = (0, react_1.useState)(true);
  const [inventoryItems, setInventoryItems] = (0, react_1.useState)([]);
  const [wasteReasons, setWasteReasons] = (0, react_1.useState)([]);
  const [units, setUnits] = (0, react_1.useState)([]);
  const [formData, setFormData] = (0, react_1.useState)({
    inventoryItemId: "",
    quantity: "",
    reasonId: "",
    unitId: "",
    notes: "",
  });
  // Fetch dropdown data on mount
  (0, react_1.useEffect)(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch inventory items, waste reasons, and units in parallel
        const [itemsRes, reasonsRes, unitsRes] = await Promise.all([
          fetch("/api/inventory/items?limit=500"),
          fetch("/api/kitchen/waste/reasons"),
          fetch("/api/kitchen/waste/units"),
        ]);
        if (!itemsRes.ok) throw new Error("Failed to fetch inventory items");
        if (!reasonsRes.ok) throw new Error("Failed to fetch waste reasons");
        if (!unitsRes.ok) throw new Error("Failed to fetch units");
        const itemsData = await itemsRes.json();
        const reasonsData = await reasonsRes.json();
        const unitsData = await unitsRes.json();
        setInventoryItems(itemsData.data || []);
        setWasteReasons(reasonsData.data || []);
        setUnits(unitsData.data || []);
      } catch (error) {
        console.error("Failed to fetch dropdown data:", error);
        sonner_1.toast.error("Failed to load form data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const response = await fetch("/api/kitchen/waste/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to log waste entry");
      }
      const result = await response.json();
      sonner_1.toast.success(
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
      sonner_1.toast.error(
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
        <label_1.Label htmlFor="inventoryItemId">Item *</label_1.Label>
        <select_1.Select
          disabled={inventoryItems.length === 0}
          onValueChange={(value) =>
            setFormData({ ...formData, inventoryItemId: value })
          }
          required
          value={formData.inventoryItemId}
        >
          <select_1.SelectTrigger>
            <select_1.SelectValue
              placeholder={
                inventoryItems.length === 0
                  ? "No items available"
                  : "Select item"
              }
            />
          </select_1.SelectTrigger>
          <select_1.SelectContent>
            {inventoryItems.map((item) => (
              <select_1.SelectItem key={item.id} value={item.id}>
                {item.item_number} - {item.name}
              </select_1.SelectItem>
            ))}
          </select_1.SelectContent>
        </select_1.Select>
      </div>

      {/* Quantity */}
      <div className="space-y-2">
        <label_1.Label htmlFor="quantity">Quantity *</label_1.Label>
        <input_1.Input
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
        <label_1.Label htmlFor="reasonId">Reason *</label_1.Label>
        <select_1.Select
          disabled={wasteReasons.length === 0}
          onValueChange={(value) =>
            setFormData({ ...formData, reasonId: value })
          }
          required
          value={formData.reasonId}
        >
          <select_1.SelectTrigger>
            <select_1.SelectValue
              placeholder={
                wasteReasons.length === 0
                  ? "No reasons available"
                  : "Select reason"
              }
            />
          </select_1.SelectTrigger>
          <select_1.SelectContent>
            {wasteReasons.map((reason) => (
              <select_1.SelectItem key={reason.id} value={reason.id.toString()}>
                {reason.name}
              </select_1.SelectItem>
            ))}
          </select_1.SelectContent>
        </select_1.Select>
      </div>

      {/* Unit */}
      <div className="space-y-2">
        <label_1.Label htmlFor="unitId">Unit (optional)</label_1.Label>
        <select_1.Select
          disabled={units.length === 0}
          onValueChange={(value) => setFormData({ ...formData, unitId: value })}
          value={formData.unitId}
        >
          <select_1.SelectTrigger>
            <select_1.SelectValue
              placeholder={
                units.length === 0 ? "No units available" : "Select unit"
              }
            />
          </select_1.SelectTrigger>
          <select_1.SelectContent>
            {units.map((unit) => (
              <select_1.SelectItem key={unit.id} value={unit.id.toString()}>
                {unit.name_plural}
              </select_1.SelectItem>
            ))}
          </select_1.SelectContent>
        </select_1.Select>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <label_1.Label htmlFor="notes">Notes (optional)</label_1.Label>
        <textarea_1.Textarea
          disabled={submitting}
          id="notes"
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Additional context about this waste entry..."
          rows={3}
          value={formData.notes}
        />
      </div>

      {/* Submit */}
      <button_1.Button className="w-full" disabled={submitting} type="submit">
        {submitting ? (
          "Logging..."
        ) : (
          <>
            <lucide_react_1.Trash2 className="mr-2 h-4 w-4" />
            Log Waste Entry
          </>
        )}
      </button_1.Button>
    </form>
  );
}
