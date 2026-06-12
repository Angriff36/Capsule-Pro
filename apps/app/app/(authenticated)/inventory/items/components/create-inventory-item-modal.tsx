"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import { Checkbox } from "@repo/design-system/components/ui/checkbox";
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
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  type CreateInventoryItemRequest,
  createInventoryItem,
  FSA_STATUSES,
  type FSAStatus,
  formatCurrency,
  formatQuantity,
  getCategoryLabel,
  getFSAStatusLabel,
  getUnitLabel,
  type InventoryItemWithStatus,
  ITEM_CATEGORIES,
  type ItemCategory,
  listSuppliers,
  type Supplier,
  UNITS_OF_MEASURE,
  type UnitOfMeasure,
  type UpdateInventoryItemRequest,
  updateInventoryItem,
} from "../../../../lib/inventory";

interface CreateInventoryItemModalProps {
  editItem?: InventoryItemWithStatus | null;
  onClose: () => void;
  onCreated: () => void;
  open: boolean;
}

export const CreateInventoryItemModal = ({
  open,
  onClose,
  onCreated,
  editItem,
}: CreateInventoryItemModalProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [formData, setFormData] = useState({
    item_number: "",
    name: "",
    description: "",
    category: "other" as ItemCategory,
    unit_of_measure: "each" as UnitOfMeasure,
    unit_cost: "",
    quantity_on_hand: "",
    par_level: "",
    reorder_level: "",
    supplier_id: "",
    tags: [] as string[],
    fsa_status: "unknown" as FSAStatus,
    fsa_temp_logged: false,
    fsa_allergen_info: false,
    fsa_traceable: false,
  });
  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    listSuppliers()
      .then(setSuppliers)
      .catch(() => setSuppliers([]));
  }, []);

  useEffect(() => {
    if (editItem) {
      setFormData({
        item_number: editItem.item_number,
        name: editItem.name,
        description: editItem.description ?? "",
        category: editItem.category as ItemCategory,
        unit_of_measure: (editItem.unit_of_measure as UnitOfMeasure) ?? "each",
        unit_cost: editItem.unit_cost.toString(),
        quantity_on_hand: editItem.quantity_on_hand.toString(),
        par_level: editItem.par_level?.toString() ?? "",
        reorder_level: editItem.reorder_level.toString(),
        supplier_id: editItem.supplier_id ?? "",
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
        description: "",
        category: "other",
        unit_of_measure: "each",
        unit_cost: "",
        quantity_on_hand: "",
        par_level: "",
        reorder_level: "",
        supplier_id: "",
        tags: [],
        fsa_status: "unknown",
        fsa_temp_logged: false,
        fsa_allergen_info: false,
        fsa_traceable: false,
      });
    }
    setTagInput("");
  }, [editItem]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const request: CreateInventoryItemRequest | UpdateInventoryItemRequest = {
        item_number: formData.item_number.trim(),
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        category: formData.category,
        unit_of_measure: formData.unit_of_measure,
        unit_cost: formData.unit_cost
          ? Number.parseFloat(formData.unit_cost)
          : undefined,
        quantity_on_hand: formData.quantity_on_hand
          ? Number.parseFloat(formData.quantity_on_hand)
          : undefined,
        par_level: formData.par_level
          ? Number.parseFloat(formData.par_level)
          : undefined,
        reorder_level: formData.reorder_level
          ? Number.parseFloat(formData.reorder_level)
          : undefined,
        supplier_id: formData.supplier_id || undefined,
        tags: formData.tags.length > 0 ? formData.tags : undefined,
        fsa_status: formData.fsa_status,
        fsa_temp_logged: formData.fsa_temp_logged,
        fsa_allergen_info: formData.fsa_allergen_info,
        fsa_traceable: formData.fsa_traceable,
      };

      if (editItem) {
        await updateInventoryItem(editItem.id, request);
        toast.success("Inventory item updated successfully");
      } else {
        await createInventoryItem(request as CreateInventoryItemRequest);
        toast.success("Inventory item created successfully");
      }

      onCreated();
      onClose();
    } catch (error) {
      console.error("Failed to save inventory item:", error);
      toast.error(
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

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter((t) => t !== tagToRemove),
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    }
  };

  return (
    <Dialog onOpenChange={onClose} open={open}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editItem ? "Edit Inventory Item" : "Create Inventory Item"}
          </DialogTitle>
          <DialogDescription>
            {editItem
              ? "Update the inventory item details below."
              : "Add a new inventory item to your catalog."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Item Number & Name */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="item_number">Item Number *</Label>
                <Input
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
                <Label htmlFor="name">Item Name *</Label>
                <Input
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
              <Label htmlFor="category">Category *</Label>
              <Select
                disabled={isLoading}
                onValueChange={(value) =>
                  setFormData({ ...formData, category: value as ItemCategory })
                }
                value={formData.category}
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {ITEM_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {getCategoryLabel(cat)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                disabled={isLoading}
                id="description"
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Brief description of the item"
                value={formData.description}
              />
            </div>

            {/* Unit of Measure & Supplier */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="unit_of_measure">Unit of Measure</Label>
                <Select
                  disabled={isLoading}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      unit_of_measure: value as UnitOfMeasure,
                    })
                  }
                  value={formData.unit_of_measure}
                >
                  <SelectTrigger id="unit_of_measure">
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {UNITS_OF_MEASURE.map((unit) => (
                      <SelectItem key={unit} value={unit}>
                        {getUnitLabel(unit)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="supplier_id">Supplier</Label>
                <Select
                  disabled={isLoading}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      supplier_id: value === "_none" ? "" : value,
                    })
                  }
                  value={formData.supplier_id || "_none"}
                >
                  <SelectTrigger id="supplier_id">
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">No supplier</SelectItem>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Unit Cost, Quantity, Par Level, Reorder Level */}
            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="unit_cost">Unit Cost</Label>
                <Input
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
                    ? formatCurrency(Number.parseFloat(formData.unit_cost))
                    : "-"}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantity_on_hand">Quantity On Hand</Label>
                <Input
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
                    ? formatQuantity(
                        Number.parseFloat(formData.quantity_on_hand)
                      )
                    : "-"}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="par_level">Par Level</Label>
                <Input
                  disabled={isLoading}
                  id="par_level"
                  min="0"
                  onChange={(e) =>
                    setFormData({ ...formData, par_level: e.target.value })
                  }
                  placeholder="0.000"
                  step="0.001"
                  type="number"
                  value={formData.par_level}
                />
                <p className="text-muted-foreground text-xs">
                  {formData.par_level
                    ? formatQuantity(Number.parseFloat(formData.par_level))
                    : "-"}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reorder_level">Reorder Level</Label>
                <Input
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
                    ? formatQuantity(Number.parseFloat(formData.reorder_level))
                    : "-"}
                </p>
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label htmlFor="tags">Tags</Label>
              <div className="flex gap-2">
                <Input
                  disabled={isLoading}
                  id="tags"
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Add tags (e.g., organic, gluten-free)"
                  value={tagInput}
                />
                <Button
                  disabled={isLoading || !tagInput.trim()}
                  onClick={handleAddTag}
                  type="button"
                  variant="outline"
                >
                  Add
                </Button>
              </div>
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag) => (
                    <Badge
                      className="cursor-pointer"
                      key={tag}
                      onClick={() => handleRemoveTag(tag)}
                      variant="secondary"
                    >
                      {tag}
                      <span className="ml-1">×</span>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* FSA Status */}
            <div className="space-y-2">
              <Label htmlFor="fsa_status">FSA Status</Label>
              <Select
                disabled={isLoading}
                onValueChange={(value) =>
                  setFormData({ ...formData, fsa_status: value as FSAStatus })
                }
                value={formData.fsa_status}
              >
                <SelectTrigger id="fsa_status">
                  <SelectValue placeholder="Select FSA status" />
                </SelectTrigger>
                <SelectContent>
                  {FSA_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {getFSAStatusLabel(status)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* FSA Flags */}
            <div className="space-y-3">
              <Label>Food Safety & Compliance Flags</Label>
              <div className="flex flex-col gap-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={formData.fsa_temp_logged}
                    disabled={isLoading}
                    id="fsa_temp_logged"
                    onCheckedChange={(checked) =>
                      setFormData({
                        ...formData,
                        fsa_temp_logged: checked as boolean,
                      })
                    }
                  />
                  <Label
                    className="cursor-pointer font-normal"
                    htmlFor="fsa_temp_logged"
                  >
                    Temperature Logged
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={formData.fsa_allergen_info}
                    disabled={isLoading}
                    id="fsa_allergen_info"
                    onCheckedChange={(checked) =>
                      setFormData({
                        ...formData,
                        fsa_allergen_info: checked as boolean,
                      })
                    }
                  />
                  <Label
                    className="cursor-pointer font-normal"
                    htmlFor="fsa_allergen_info"
                  >
                    Has Allergen Information
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={formData.fsa_traceable}
                    disabled={isLoading}
                    id="fsa_traceable"
                    onCheckedChange={(checked) =>
                      setFormData({
                        ...formData,
                        fsa_traceable: checked as boolean,
                      })
                    }
                  />
                  <Label
                    className="cursor-pointer font-normal"
                    htmlFor="fsa_traceable"
                  >
                    Traceable Source
                  </Label>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              disabled={isLoading}
              onClick={onClose}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button disabled={isLoading} type="submit">
              {isLoading
                ? "Saving..."
                : editItem
                  ? "Update Item"
                  : "Create Item"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
