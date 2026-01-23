"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  type CreateInventoryItemRequest,
  type UpdateInventoryItemRequest,
  type InventoryItemWithStatus,
  type ItemCategory,
  type FSAStatus,
  createInventoryItem,
  updateInventoryItem,
  ITEM_CATEGORIES,
  FSA_STATUSES,
  getCategoryLabel,
  getFSAStatusLabel,
  formatCurrency,
  formatQuantity,
} from "../../../../lib/use-inventory";
import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/design-system/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { Checkbox } from "@repo/design-system/components/ui/checkbox";
import { Badge } from "@repo/design-system/components/ui/badge";

interface CreateInventoryItemModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  editItem?: InventoryItemWithStatus | null;
}

export const CreateInventoryItemModal = ({
  open,
  onClose,
  onCreated,
  editItem,
}: CreateInventoryItemModalProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    item_number: "",
    name: "",
    category: "other" as ItemCategory,
    unit_cost: "",
    quantity_on_hand: "",
    reorder_level: "",
    tags: [] as string[],
    fsa_status: "unknown" as FSAStatus,
    fsa_temp_logged: false,
    fsa_allergen_info: false,
    fsa_traceable: false,
  });
  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    if (editItem) {
      setFormData({
        item_number: editItem.item_number,
        name: editItem.name,
        category: editItem.category as ItemCategory,
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const request: CreateInventoryItemRequest | UpdateInventoryItemRequest = {
        item_number: formData.item_number.trim(),
        name: formData.name.trim(),
        category: formData.category,
        unit_cost: formData.unit_cost
          ? parseFloat(formData.unit_cost)
          : undefined,
        quantity_on_hand: formData.quantity_on_hand
          ? parseFloat(formData.quantity_on_hand)
          : undefined,
        reorder_level: formData.reorder_level
          ? parseFloat(formData.reorder_level)
          : undefined,
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
        await createInventoryItem(
          request as CreateInventoryItemRequest
        );
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
                  placeholder="e.g., INV001"
                  required
                  value={formData.item_number}
                  onChange={(e) =>
                    setFormData({ ...formData, item_number: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Item Name *</Label>
                <Input
                  disabled={isLoading}
                  id="name"
                  placeholder="e.g., Olive Oil"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
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

            {/* Unit Cost, Quantity, Reorder Level */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="unit_cost">Unit Cost</Label>
                <Input
                  disabled={isLoading}
                  id="unit_cost"
                  min="0"
                  placeholder="0.00"
                  step="0.01"
                  type="number"
                  value={formData.unit_cost}
                  onChange={(e) =>
                    setFormData({ ...formData, unit_cost: e.target.value })
                  }
                />
                <p className="text-muted-foreground text-xs">
                  {formData.unit_cost
                    ? formatCurrency(parseFloat(formData.unit_cost))
                    : "-"}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantity_on_hand">Quantity On Hand</Label>
                <Input
                  disabled={isLoading}
                  id="quantity_on_hand"
                  min="0"
                  placeholder="0.000"
                  step="0.001"
                  type="number"
                  value={formData.quantity_on_hand}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      quantity_on_hand: e.target.value,
                    })
                  }
                />
                <p className="text-muted-foreground text-xs">
                  {formData.quantity_on_hand
                    ? formatQuantity(parseFloat(formData.quantity_on_hand))
                    : "-"}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reorder_level">Reorder Level</Label>
                <Input
                  disabled={isLoading}
                  id="reorder_level"
                  min="0"
                  placeholder="0.000"
                  step="0.001"
                  type="number"
                  value={formData.reorder_level}
                  onChange={(e) =>
                    setFormData({ ...formData, reorder_level: e.target.value })
                  }
                />
                <p className="text-muted-foreground text-xs">
                  {formData.reorder_level
                    ? formatQuantity(parseFloat(formData.reorder_level))
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
                  placeholder="Add tags (e.g., organic, gluten-free)"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleKeyPress}
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
