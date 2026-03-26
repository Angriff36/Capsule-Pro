"use client";

import { Button } from "@repo/design-system/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { PencilIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateDish } from "../../actions";

interface EditDishDialogProps {
  dish: {
    id: string;
    name: string;
    description: string | null;
    category: string | null;
    service_style: string | null;
    dietary_tags: string[] | null;
    allergens: string[] | null;
    price_per_person: number | null;
    cost_per_person: number | null;
    portion_size_description: string | null;
    min_prep_lead_days: number;
    max_prep_lead_days: number | null;
    is_active: boolean;
  };
}

const DISH_CATEGORIES = [
  "Appetizer",
  "Soup",
  "Salad",
  "Main Course",
  "Side Dish",
  "Dessert",
  "Beverage",
  "Snack",
];

const SERVICE_STYLES = [
  "Plated",
  "Buffet",
  "Family Style",
  "Station",
  "Passed",
];

const COMMON_DIETARY_TAGS = [
  "vegan",
  "vegetarian",
  "gluten-free",
  "dairy-free",
  "nut-free",
  "soy-free",
  "keto",
  "paleo",
  "halal",
  "kosher",
];

const COMMON_ALLERGENS = [
  "Dairy",
  "Eggs",
  "Fish",
  "Shellfish",
  "Tree Nuts",
  "Peanuts",
  "Wheat",
  "Soy",
  "Sesame",
];

export function EditDishDialog({ dish }: EditDishDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [formData, setFormData] = useState({
    name: dish.name,
    description: dish.description ?? "",
    category: dish.category ?? "",
    serviceStyle: dish.service_style ?? "",
    dietaryTags: dish.dietary_tags ?? [],
    allergens: dish.allergens ?? [],
    pricePerPerson: dish.price_per_person?.toString() ?? "",
    costPerPerson: dish.cost_per_person?.toString() ?? "",
    portionSizeDescription: dish.portion_size_description ?? "",
    minPrepLeadDays: dish.min_prep_lead_days.toString(),
    maxPrepLeadDays: dish.max_prep_lead_days?.toString() ?? "",
    isActive: dish.is_active,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("name", formData.name);
        fd.set("description", formData.description);
        fd.set("category", formData.category);
        fd.set("serviceStyle", formData.serviceStyle);
        fd.set("dietaryTags", formData.dietaryTags.join(","));
        fd.set("allergens", formData.allergens.join(","));
        fd.set("pricePerPerson", formData.pricePerPerson);
        fd.set("costPerPerson", formData.costPerPerson);
        fd.set("portionSizeDescription", formData.portionSizeDescription);
        fd.set("minPrepLeadDays", formData.minPrepLeadDays);
        fd.set("maxPrepLeadDays", formData.maxPrepLeadDays);
        fd.set("isActive", formData.isActive ? "true" : "false");

        await updateDish(dish.id, fd);
        toast.success("Dish updated successfully.");
        setOpen(false);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to update dish.");
      }
    });
  };

  const toggleArrayItem = (array: string[], item: string): string[] => {
    return array.includes(item)
      ? array.filter((i) => i !== item)
      : [...array, item];
  };

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button className="gap-2" type="button" variant="outline">
          <PencilIcon className="h-4 w-4" />
          Edit Dish
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Dish</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Basic Info */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  required
                  value={formData.name}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, category: value }))
                  }
                  value={formData.category}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {DISH_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat.toLowerCase()}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                rows={2}
                value={formData.description}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="serviceStyle">Service Style</Label>
                <Select
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, serviceStyle: value }))
                  }
                  value={formData.serviceStyle}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select style" />
                  </SelectTrigger>
                  <SelectContent>
                    {SERVICE_STYLES.map((style) => (
                      <SelectItem key={style} value={style.toLowerCase()}>
                        {style}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="portionSize">Portion Size</Label>
                <Input
                  id="portionSize"
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      portionSizeDescription: e.target.value,
                    }))
                  }
                  placeholder="e.g., 6 oz, 1 cup"
                  value={formData.portionSizeDescription}
                />
              </div>
            </div>

            {/* Pricing */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="pricePerPerson">Price/Person ($)</Label>
                <Input
                  id="pricePerPerson"
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      pricePerPerson: e.target.value,
                    }))
                  }
                  placeholder="0.00"
                  step="0.01"
                  type="number"
                  value={formData.pricePerPerson}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="costPerPerson">Cost/Person ($)</Label>
                <Input
                  id="costPerPerson"
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      costPerPerson: e.target.value,
                    }))
                  }
                  placeholder="0.00"
                  step="0.01"
                  type="number"
                  value={formData.costPerPerson}
                />
              </div>
            </div>

            {/* Prep Lead Time */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="minPrepLeadDays">Min Prep Lead (days)</Label>
                <Input
                  id="minPrepLeadDays"
                  min="0"
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      minPrepLeadDays: e.target.value,
                    }))
                  }
                  type="number"
                  value={formData.minPrepLeadDays}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxPrepLeadDays">Max Prep Lead (days)</Label>
                <Input
                  id="maxPrepLeadDays"
                  min="0"
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      maxPrepLeadDays: e.target.value,
                    }))
                  }
                  type="number"
                  value={formData.maxPrepLeadDays}
                />
              </div>
            </div>

            {/* Dietary Tags */}
            <div className="space-y-2">
              <Label>Dietary Tags</Label>
              <div className="flex flex-wrap gap-2">
                {COMMON_DIETARY_TAGS.map((tag) => (
                  <Button
                    className={
                      formData.dietaryTags.includes(tag)
                        ? "bg-[var(--brand-leafy-green)] text-white hover:bg-[var(--brand-leafy-green)]/80"
                        : ""
                    }
                    key={tag}
                    onClick={(e) => {
                      e.preventDefault();
                      setFormData((prev) => ({
                        ...prev,
                        dietaryTags: toggleArrayItem(prev.dietaryTags, tag),
                      }));
                    }}
                    size="sm"
                    type="button"
                    variant={
                      formData.dietaryTags.includes(tag) ? "default" : "outline"
                    }
                  >
                    {tag}
                  </Button>
                ))}
              </div>
            </div>

            {/* Allergens */}
            <div className="space-y-2">
              <Label>Allergens</Label>
              <div className="flex flex-wrap gap-2">
                {COMMON_ALLERGENS.map((allergen) => (
                  <Button
                    className={
                      formData.allergens.includes(allergen)
                        ? "bg-[var(--brand-spiced-orange)] text-white hover:bg-[var(--brand-spiced-orange)]/80"
                        : ""
                    }
                    key={allergen}
                    onClick={(e) => {
                      e.preventDefault();
                      setFormData((prev) => ({
                        ...prev,
                        allergens: toggleArrayItem(prev.allergens, allergen),
                      }));
                    }}
                    size="sm"
                    type="button"
                    variant={
                      formData.allergens.includes(allergen) ? "default" : "outline"
                    }
                  >
                    {allergen}
                  </Button>
                ))}
              </div>
            </div>

            {/* Status */}
            <div className="flex items-center gap-2">
              <input
                checked={formData.isActive}
                className="h-4 w-4"
                id="isActive"
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    isActive: e.target.checked,
                  }))
                }
                type="checkbox"
              />
              <Label className="font-normal" htmlFor="isActive">
                Active (available for events)
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => setOpen(false)}
              type="button"
              variant="ghost"
            >
              Cancel
            </Button>
            <Button disabled={isPending} type="submit">
              {isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
