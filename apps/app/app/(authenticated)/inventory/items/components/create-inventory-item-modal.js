"use client";

Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateInventoryItemModal = void 0;
const badge_1 = require("@repo/design-system/components/ui/badge");
const button_1 = require("@repo/design-system/components/ui/button");
const checkbox_1 = require("@repo/design-system/components/ui/checkbox");
const dialog_1 = require("@repo/design-system/components/ui/dialog");
const input_1 = require("@repo/design-system/components/ui/input");
const label_1 = require("@repo/design-system/components/ui/label");
const select_1 = require("@repo/design-system/components/ui/select");
const react_1 = require("react");
const sonner_1 = require("sonner");
const use_inventory_1 = require("../../../../lib/use-inventory");
const CreateInventoryItemModal = ({ open, onClose, onCreated, editItem }) => {
  const [isLoading, setIsLoading] = (0, react_1.useState)(false);
  const [formData, setFormData] = (0, react_1.useState)({
    item_number: "",
    name: "",
    category: "other",
    unit_cost: "",
    quantity_on_hand: "",
    reorder_level: "",
    tags: [],
    fsa_status: "unknown",
    fsa_temp_logged: false,
    fsa_allergen_info: false,
    fsa_traceable: false,
  });
  const [tagInput, setTagInput] = (0, react_1.useState)("");
  (0, react_1.useEffect)(() => {
    if (editItem) {
      setFormData({
        item_number: editItem.item_number,
        name: editItem.name,
        category: editItem.category,
        unit_cost: editItem.unit_cost.toString(),
        quantity_on_hand: editItem.quantity_on_hand.toString(),
        reorder_level: editItem.reorder_level.toString(),
        tags: editItem.tags,
        fsa_status: editItem.fsa_status ?? "unknown",
        fsa_temp_logged: editItem.fsa_temp_logged ?? false,
        fsa_allergen_info: editItem.fsa_allergen_info ?? false,
        fsa_traceable: editItem.fsa_traceable ?? false,
      });
    } else {
      setFormData({
        item_number: "",
        name: "",
        category: "other",
        unit_cost: "",
        quantity_on_hand: "",
        reorder_level: "",
        tags: [],
        fsa_status: "unknown",
        fsa_temp_logged: false,
        fsa_allergen_info: false,
        fsa_traceable: false,
      });
    }
    setTagInput("");
  }, [editItem, open]);
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const request = {
        item_number: formData.item_number.trim(),
        name: formData.name.trim(),
        category: formData.category,
        unit_cost: formData.unit_cost
          ? Number.parseFloat(formData.unit_cost)
          : undefined,
        quantity_on_hand: formData.quantity_on_hand
          ? Number.parseFloat(formData.quantity_on_hand)
          : undefined,
        reorder_level: formData.reorder_level
          ? Number.parseFloat(formData.reorder_level)
          : undefined,
        tags: formData.tags.length > 0 ? formData.tags : undefined,
        fsa_status: formData.fsa_status,
        fsa_temp_logged: formData.fsa_temp_logged,
        fsa_allergen_info: formData.fsa_allergen_info,
        fsa_traceable: formData.fsa_traceable,
      };
      if (editItem) {
        await (0, use_inventory_1.updateInventoryItem)(editItem.id, request);
        sonner_1.toast.success("Inventory item updated successfully");
      } else {
        await (0, use_inventory_1.createInventoryItem)(request);
        sonner_1.toast.success("Inventory item created successfully");
      }
      onCreated();
      onClose();
    } catch (error) {
      console.error("Failed to save inventory item:", error);
      sonner_1.toast.error(
        error instanceof Error ? error.message : "Failed to save inventory item"
      );
    } finally {
      setIsLoading(false);
    }
  };
  const handleAddTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !formData.tags.includes(trimmed)) {
      setFormData({ ...formData, tags: [...formData.tags, trimmed] });
      setTagInput("");
    }
  };
  const handleRemoveTag = (tagToRemove) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter((t) => t !== tagToRemove),
    });
  };
  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    }
  };
  return (
    <dialog_1.Dialog onOpenChange={onClose} open={open}>
      <dialog_1.DialogContent className="max-h-[90vh] overflow-y-auto">
        <dialog_1.DialogHeader>
          <dialog_1.DialogTitle>
            {editItem ? "Edit Inventory Item" : "Create Inventory Item"}
          </dialog_1.DialogTitle>
          <dialog_1.DialogDescription>
            {editItem
              ? "Update the inventory item details below."
              : "Add a new inventory item to your catalog."}
          </dialog_1.DialogDescription>
        </dialog_1.DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Item Number & Name */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label_1.Label htmlFor="item_number">
                  Item Number *
                </label_1.Label>
                <input_1.Input
                  disabled={isLoading}
                  id="item_number"
                  onChange={(e) =>
                    setFormData({ ...formData, item_number: e.target.value })
                  }
                  placeholder="e.g., INV001"
                  required
                  value={formData.item_number}
                />
              </div>
              <div className="space-y-2">
                <label_1.Label htmlFor="name">Item Name *</label_1.Label>
                <input_1.Input
                  disabled={isLoading}
                  id="name"
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., Olive Oil"
                  required
                  value={formData.name}
                />
              </div>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <label_1.Label htmlFor="category">Category *</label_1.Label>
              <select_1.Select
                disabled={isLoading}
                onValueChange={(value) =>
                  setFormData({ ...formData, category: value })
                }
                value={formData.category}
              >
                <select_1.SelectTrigger id="category">
                  <select_1.SelectValue placeholder="Select category" />
                </select_1.SelectTrigger>
                <select_1.SelectContent>
                  {use_inventory_1.ITEM_CATEGORIES.map((cat) => (
                    <select_1.SelectItem key={cat} value={cat}>
                      {(0, use_inventory_1.getCategoryLabel)(cat)}
                    </select_1.SelectItem>
                  ))}
                </select_1.SelectContent>
              </select_1.Select>
            </div>

            {/* Unit Cost, Quantity, Reorder Level */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <label_1.Label htmlFor="unit_cost">Unit Cost</label_1.Label>
                <input_1.Input
                  disabled={isLoading}
                  id="unit_cost"
                  min="0"
                  onChange={(e) =>
                    setFormData({ ...formData, unit_cost: e.target.value })
                  }
                  placeholder="0.00"
                  step="0.01"
                  type="number"
                  value={formData.unit_cost}
                />
                <p className="text-muted-foreground text-xs">
                  {formData.unit_cost
                    ? (0, use_inventory_1.formatCurrency)(
                        Number.parseFloat(formData.unit_cost)
                      )
                    : "-"}
                </p>
              </div>
              <div className="space-y-2">
                <label_1.Label htmlFor="quantity_on_hand">
                  Quantity On Hand
                </label_1.Label>
                <input_1.Input
                  disabled={isLoading}
                  id="quantity_on_hand"
                  min="0"
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      quantity_on_hand: e.target.value,
                    })
                  }
                  placeholder="0.000"
                  step="0.001"
                  type="number"
                  value={formData.quantity_on_hand}
                />
                <p className="text-muted-foreground text-xs">
                  {formData.quantity_on_hand
                    ? (0, use_inventory_1.formatQuantity)(
                        Number.parseFloat(formData.quantity_on_hand)
                      )
                    : "-"}
                </p>
              </div>
              <div className="space-y-2">
                <label_1.Label htmlFor="reorder_level">
                  Reorder Level
                </label_1.Label>
                <input_1.Input
                  disabled={isLoading}
                  id="reorder_level"
                  min="0"
                  onChange={(e) =>
                    setFormData({ ...formData, reorder_level: e.target.value })
                  }
                  placeholder="0.000"
                  step="0.001"
                  type="number"
                  value={formData.reorder_level}
                />
                <p className="text-muted-foreground text-xs">
                  {formData.reorder_level
                    ? (0, use_inventory_1.formatQuantity)(
                        Number.parseFloat(formData.reorder_level)
                      )
                    : "-"}
                </p>
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <label_1.Label htmlFor="tags">Tags</label_1.Label>
              <div className="flex gap-2">
                <input_1.Input
                  disabled={isLoading}
                  id="tags"
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Add tags (e.g., organic, gluten-free)"
                  value={tagInput}
                />
                <button_1.Button
                  disabled={isLoading || !tagInput.trim()}
                  onClick={handleAddTag}
                  type="button"
                  variant="outline"
                >
                  Add
                </button_1.Button>
              </div>
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag) => (
                    <badge_1.Badge
                      className="cursor-pointer"
                      key={tag}
                      onClick={() => handleRemoveTag(tag)}
                      variant="secondary"
                    >
                      {tag}
                      <span className="ml-1">×</span>
                    </badge_1.Badge>
                  ))}
                </div>
              )}
            </div>

            {/* FSA Status */}
            <div className="space-y-2">
              <label_1.Label htmlFor="fsa_status">FSA Status</label_1.Label>
              <select_1.Select
                disabled={isLoading}
                onValueChange={(value) =>
                  setFormData({ ...formData, fsa_status: value })
                }
                value={formData.fsa_status}
              >
                <select_1.SelectTrigger id="fsa_status">
                  <select_1.SelectValue placeholder="Select FSA status" />
                </select_1.SelectTrigger>
                <select_1.SelectContent>
                  {use_inventory_1.FSA_STATUSES.map((status) => (
                    <select_1.SelectItem key={status} value={status}>
                      {(0, use_inventory_1.getFSAStatusLabel)(status)}
                    </select_1.SelectItem>
                  ))}
                </select_1.SelectContent>
              </select_1.Select>
            </div>

            {/* FSA Flags */}
            <div className="space-y-3">
              <label_1.Label>Food Safety & Compliance Flags</label_1.Label>
              <div className="flex flex-col gap-2">
                <div className="flex items-center space-x-2">
                  <checkbox_1.Checkbox
                    checked={formData.fsa_temp_logged}
                    disabled={isLoading}
                    id="fsa_temp_logged"
                    onCheckedChange={(checked) =>
                      setFormData({
                        ...formData,
                        fsa_temp_logged: checked,
                      })
                    }
                  />
                  <label_1.Label
                    className="cursor-pointer font-normal"
                    htmlFor="fsa_temp_logged"
                  >
                    Temperature Logged
                  </label_1.Label>
                </div>
                <div className="flex items-center space-x-2">
                  <checkbox_1.Checkbox
                    checked={formData.fsa_allergen_info}
                    disabled={isLoading}
                    id="fsa_allergen_info"
                    onCheckedChange={(checked) =>
                      setFormData({
                        ...formData,
                        fsa_allergen_info: checked,
                      })
                    }
                  />
                  <label_1.Label
                    className="cursor-pointer font-normal"
                    htmlFor="fsa_allergen_info"
                  >
                    Has Allergen Information
                  </label_1.Label>
                </div>
                <div className="flex items-center space-x-2">
                  <checkbox_1.Checkbox
                    checked={formData.fsa_traceable}
                    disabled={isLoading}
                    id="fsa_traceable"
                    onCheckedChange={(checked) =>
                      setFormData({
                        ...formData,
                        fsa_traceable: checked,
                      })
                    }
                  />
                  <label_1.Label
                    className="cursor-pointer font-normal"
                    htmlFor="fsa_traceable"
                  >
                    Traceable Source
                  </label_1.Label>
                </div>
              </div>
            </div>
          </div>

          <dialog_1.DialogFooter>
            <button_1.Button
              disabled={isLoading}
              onClick={onClose}
              type="button"
              variant="outline"
            >
              Cancel
            </button_1.Button>
            <button_1.Button disabled={isLoading} type="submit">
              {isLoading
                ? "Saving..."
                : editItem
                  ? "Update Item"
                  : "Create Item"}
            </button_1.Button>
          </dialog_1.DialogFooter>
        </form>
      </dialog_1.DialogContent>
    </dialog_1.Dialog>
  );
};
exports.CreateInventoryItemModal = CreateInventoryItemModal;
