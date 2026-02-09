"use client";

import {
  ConstraintOverrideDialog,
  useConstraintOverride,
} from "@repo/design-system/components/constraint-override-dialog";
import {
  Alert,
  AlertDescription,
} from "@repo/design-system/components/ui/alert";
import type { OverrideReasonCode } from "@repo/manifest";
import { AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { ManifestActionResult } from "../actions-manifest-v2";
import { createRecipe, createRecipeWithOverride } from "../actions-manifest-v2";

interface NewRecipeFormProps {
  units: Array<{ id: number; code: string; name: string }>;
}

export function NewRecipeForm({ units }: NewRecipeFormProps) {
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
        const actionResult = await createRecipe(data);
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
        const actionResult = await createRecipeWithOverride(
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
        {/* Recipe Information Section */}
        <section className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground">
            Recipe Information
          </h2>
          <div className="rounded-lg border bg-card p-6 space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="name">
                  Recipe name
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
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="description">
                Description
              </label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                id="description"
                name="description"
                placeholder="Short summary for the kitchen team."
                rows={4}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="yieldQuantity">
                  Yield quantity
                </label>
                <input
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  id="yieldQuantity"
                  min="1"
                  name="yieldQuantity"
                  placeholder="4"
                  type="number"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="yieldUnit">
                  Yield unit
                </label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  defaultValue={units[0]?.code ?? "ea"}
                  name="yieldUnit"
                >
                  {units.map((unit) => (
                    <option key={unit.id} value={unit.code}>
                      {unit.code} - {unit.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label
                  className="text-sm font-medium"
                  htmlFor="yieldDescription"
                >
                  Yield notes
                </label>
                <input
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  id="yieldDescription"
                  name="yieldDescription"
                  placeholder="Serves 4"
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <label
                  className="text-sm font-medium"
                  htmlFor="prepTimeMinutes"
                >
                  Prep time (min)
                </label>
                <input
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  id="prepTimeMinutes"
                  min="0"
                  name="prepTimeMinutes"
                  type="number"
                />
              </div>
              <div className="space-y-2">
                <label
                  className="text-sm font-medium"
                  htmlFor="cookTimeMinutes"
                >
                  Cook time (min)
                </label>
                <input
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  id="cookTimeMinutes"
                  min="0"
                  name="cookTimeMinutes"
                  type="number"
                />
              </div>
              <div className="space-y-2">
                <label
                  className="text-sm font-medium"
                  htmlFor="restTimeMinutes"
                >
                  Rest time (min)
                </label>
                <input
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  id="restTimeMinutes"
                  min="0"
                  name="restTimeMinutes"
                  type="number"
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label
                  className="text-sm font-medium"
                  htmlFor="difficultyLevel"
                >
                  Difficulty (1-5)
                </label>
                <input
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  id="difficultyLevel"
                  max="5"
                  min="1"
                  name="difficultyLevel"
                  type="number"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="tags">
                  Tags (comma separated)
                </label>
                <input
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  id="tags"
                  name="tags"
                  placeholder="GF, seasonal"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Ingredients & Steps Section */}
        <section className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground">
            Ingredients & Steps
          </h2>
          <div className="rounded-lg border bg-card p-6 space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="ingredients">
                Ingredients (one per line)
              </label>
              <textarea
                className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                id="ingredients"
                name="ingredients"
                placeholder="2 lb rack of lamb"
                rows={6}
              />
              <p className="text-muted-foreground text-xs">
                Tip: start with quantity and unit, then ingredient name.
              </p>
            </div>
            <div className="h-px bg-border" />
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="steps">
                Steps (one per line)
              </label>
              <textarea
                className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                id="steps"
                name="steps"
                placeholder="Trim the racks and season generously."
                rows={6}
              />
            </div>
          </div>
        </section>

        {/* Media & Notes Section */}
        <section className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground">
            Media & Notes
          </h2>
          <div className="rounded-lg border bg-card p-6 space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="imageFile">
                Hero image
              </label>
              <input
                accept="image/*"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                id="imageFile"
                name="imageFile"
                type="file"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="notes">
                Kitchen notes
              </label>
              <textarea
                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                id="notes"
                name="notes"
                placeholder="Share plating or storage notes for staff."
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
                {isPending ? "Creating..." : "Create recipe"}
              </button>
              <a
                className="inline-flex items-center justify-center rounded-md text-sm font-medium h-10 px-4 py-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground"
                href="/kitchen/recipes"
              >
                Cancel
              </a>
            </div>
          </div>
        </section>
      </form>

      <ConstraintOverrideDialog
        actionDescription="create this recipe"
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
