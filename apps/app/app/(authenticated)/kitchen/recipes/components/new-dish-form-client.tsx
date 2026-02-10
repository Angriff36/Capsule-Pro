"use client";

import {
  ConstraintOverrideDialog,
  useConstraintOverride,
} from "@repo/design-system/components/constraint-override-dialog";
import type { OverrideReasonCode } from "@repo/design-system/components/override-reasons";
import {
  Alert,
  AlertDescription,
} from "@repo/design-system/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { ManifestActionResult } from "../actions-manifest-v2";
import { createDish, createDishWithOverride } from "../actions-manifest-v2";

interface RecipeOption {
  id: string;
  name: string;
}

interface NewDishFormProps {
  recipes: RecipeOption[];
}

export function NewDishForm({ recipes }: NewDishFormProps) {
  const router = useRouter();
  const [isPending, startTransitionAction] = useTransition();
  const [result, setResult] = useState<ManifestActionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    setFormData(data);
    setError(null);
    setResult(null);

    startTransitionAction(async () => {
      try {
        const actionResult = await createDish(data);
        setResult(actionResult);

        if (actionResult.success) {
          if (actionResult.redirectUrl) {
            router.push(actionResult.redirectUrl);
          }
        } else if (actionResult.error) {
          setError(actionResult.error);
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "An unknown error occurred";
        setError(message);
      }
    });
  };

  const handleOverride = async (
    reason: OverrideReasonCode,
    details: string
  ) => {
    if (!formData) {
      return;
    }

    startTransitionAction(async () => {
      try {
        const actionResult = await createDishWithOverride(
          formData,
          reason,
          details
        );
        setResult(actionResult);

        if (actionResult.success) {
          if (actionResult.redirectUrl) {
            router.push(actionResult.redirectUrl);
          }
        } else if (actionResult.error) {
          setError(actionResult.error);
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "An unknown error occurred";
        setError(message);
      }
    });
  };

  const constraintState = useConstraintOverride({
    result: result ?? {},
    onOverride: handleOverride,
  });

  return (
    <>
      <form
        className="space-y-8"
        encType="multipart/form-data"
        onSubmit={handleSubmit}
      >
        {/* Basic Information Section */}
        <section className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground">
            Basic Information
          </h2>
          <div className="rounded-lg border bg-card p-6 space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="name">
                  Dish name
                </label>
                <input
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  id="name"
                  name="name"
                  placeholder="Herb Crusted Rack of Lamb"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="recipeId">
                  Linked recipe
                </label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  name="recipeId"
                  required
                >
                  <option value="">Select recipe</option>
                  {recipes.map((recipe) => (
                    <option key={recipe.id} value={recipe.id}>
                      {recipe.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="category">
                  Category
                </label>
                <input
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  id="category"
                  name="category"
                  placeholder="Main course"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="serviceStyle">
                  Service style
                </label>
                <input
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  id="serviceStyle"
                  name="serviceStyle"
                  placeholder="Plated, family style"
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="dietaryTags">
                  Dietary tags
                </label>
                <input
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  id="dietaryTags"
                  name="dietaryTags"
                  placeholder="GF, dairy free"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="allergens">
                  Allergens
                </label>
                <input
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  id="allergens"
                  name="allergens"
                  placeholder="nuts, dairy"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Pricing & Costs Section */}
        <section className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground">
            Pricing & Costs
          </h2>
          <div className="rounded-lg border bg-card p-6 space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="pricePerPerson">
                  Menu price per person
                </label>
                <input
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  id="pricePerPerson"
                  name="pricePerPerson"
                  placeholder="38"
                  type="number"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="costPerPerson">
                  Food cost per person
                </label>
                <input
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  id="costPerPerson"
                  name="costPerPerson"
                  placeholder="12.5"
                  type="number"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Timing & Portions Section */}
        <section className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground">
            Timing & Portions
          </h2>
          <div className="rounded-lg border bg-card p-6 space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <label
                  className="text-sm font-medium"
                  htmlFor="minPrepLeadDays"
                >
                  Min prep lead (days)
                </label>
                <input
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  id="minPrepLeadDays"
                  min="0"
                  name="minPrepLeadDays"
                  type="number"
                />
              </div>
              <div className="space-y-2">
                <label
                  className="text-sm font-medium"
                  htmlFor="maxPrepLeadDays"
                >
                  Max prep lead (days)
                </label>
                <input
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  id="maxPrepLeadDays"
                  min="0"
                  name="maxPrepLeadDays"
                  type="number"
                />
              </div>
              <div className="space-y-2">
                <label
                  className="text-sm font-medium"
                  htmlFor="portionSizeDescription"
                >
                  Portion size
                </label>
                <input
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  id="portionSizeDescription"
                  name="portionSizeDescription"
                  placeholder="6 oz per guest"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Media & Actions Section */}
        <section className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground">
            Media & Actions
          </h2>
          <div className="rounded-lg border bg-card p-6 space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="imageFile">
                Presentation image
              </label>
              <input
                accept="image/*"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                id="imageFile"
                name="imageFile"
                type="file"
              />
            </div>
            <div className="h-px bg-border" />
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="description">
                Service notes
              </label>
              <textarea
                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                id="description"
                name="description"
                placeholder="Pair with roasted vegetables or seasonal garnish."
                rows={5}
              />
            </div>
            <div className="h-px bg-border" />
            <div className="flex flex-col gap-2">
              <button
                className="inline-flex items-center justify-center rounded-md text-sm font-medium h-10 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none"
                disabled={isPending}
                type="submit"
              >
                {isPending ? "Creating..." : "Create dish"}
              </button>
              <a
                className="inline-flex items-center justify-center rounded-md text-sm font-medium h-10 px-4 py-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground"
                href="/kitchen/recipes?tab=dishes"
              >
                Cancel
              </a>
            </div>
          </div>
        </section>
      </form>

      <ConstraintOverrideDialog
        actionDescription="create this dish"
        constraints={constraintState.overrideConstraints}
        onConfirm={constraintState.handleOverride}
        onOpenChange={constraintState.setShowOverrideDialog}
        open={constraintState.showOverrideDialog}
        warningsOnly={constraintState.warningsOnly}
      />

      {error && (
        <Alert className="mt-4" variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </>
  );
}
