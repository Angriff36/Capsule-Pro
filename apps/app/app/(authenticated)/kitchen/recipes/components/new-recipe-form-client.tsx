"use client";

import type { ConstraintOutcome } from "@angriff36/manifest/ir";
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
import { apiFetch } from "@/app/lib/api";
import { kitchenRecipeCompositeCreate } from "@/app/lib/routes";

interface CompositeRouteResponse {
  success: boolean;
  message?: string;
  constraintOutcomes?: ConstraintOutcome[];
  data?: {
    recipe: unknown;
    version: unknown;
    ingredients: unknown[];
    steps: unknown[];
    events: unknown[];
    recipeId: string;
  };
}

interface NewRecipeFormProps {
  units: Array<{ id: number; code: string; name: string }>;
}

/** Regex to parse ingredient lines like "2 lb lamb rack" or "1 cup flour" */
const INGREDIENT_LINE_REGEX = /^(\d+(?:\.\d+)?)\s*(\w+)?\s*(.+)$/;

/**
 * Parses a text block of ingredients (one per line) into structured format.
 * Format: "quantity unit name" or just "name"
 */
function parseIngredientsText(text: string): Array<{
  name: string;
  quantity: number;
  unit: string | null;
  sortOrder: number;
}> {
  const lines = text.split("\n").filter((line) => line.trim());
  return lines.map((line, idx) => {
    const trimmed = line.trim();
    const match = trimmed.match(INGREDIENT_LINE_REGEX);
    if (match) {
      const [, qty, unit, name] = match;
      return {
        name: name.trim(),
        quantity: Number.parseFloat(qty),
        unit: unit || null,
        sortOrder: idx,
      };
    }
    return {
      name: trimmed,
      quantity: 1,
      unit: null,
      sortOrder: idx,
    };
  });
}

/**
 * Parses a text block of steps (one per line) into structured format.
 */
function parseStepsText(text: string): Array<{
  stepNumber: number;
  instruction: string;
}> {
  const lines = text.split("\n").filter((line) => line.trim());
  return lines.map((line, idx) => ({
    stepNumber: idx + 1,
    instruction: line.trim(),
  }));
}

export function NewRecipeForm({ units }: NewRecipeFormProps) {
  const router = useRouter();
  const [isPending, startTransitionAction] = useTransition();
  const [result, setResult] = useState<CompositeRouteResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cachedFormData, setCachedFormData] = useState<FormData | null>(null);

  // Create a lookup map from unit code to ID
  const unitCodeToId = new Map(units.map((u) => [u.code.toLowerCase(), u.id]));

  /** Helper to get trimmed string from FormData */
  const getString = (fd: FormData, key: string): string =>
    String(fd.get(key) || "").trim();

  /** Helper to get optional trimmed string (undefined if empty) */
  const getOptionalString = (fd: FormData, key: string): string | undefined => {
    const val = getString(fd, key);
    return val || undefined;
  };

  /** Helper to get optional number from FormData */
  const getOptionalNumber = (fd: FormData, key: string): number | undefined => {
    const val = Number.parseInt(String(fd.get(key) || "0"), 10);
    return val || undefined;
  };

  /** Helper to get tags array from comma-separated string */
  const getTags = (fd: FormData): string[] | undefined => {
    const tags = getString(fd, "tags")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    return tags.length > 0 ? tags : undefined;
  };

  /**
   * Converts FormData to JSON payload for composite create route.
   */
  const buildCreatePayload = (
    formData: FormData,
    override?: { reasonCode: string; details: string }
  ) => {
    const yieldUnitCode =
      getString(formData, "yieldUnit").toLowerCase() || "ea";
    const yieldUnitId = unitCodeToId.get(yieldUnitCode) ?? units[0]?.id ?? 1;

    const ingredientsText = getString(formData, "ingredients");
    const stepsText = getString(formData, "steps");

    return {
      name: getString(formData, "name"),
      category: getOptionalString(formData, "category"),
      description: getOptionalString(formData, "description"),
      tags: getTags(formData),
      yieldQuantity:
        Number.parseInt(getString(formData, "yieldQuantity") || "1", 10) || 1,
      yieldUnitId,
      yieldDescription: getOptionalString(formData, "yieldDescription"),
      prepTimeMinutes: getOptionalNumber(formData, "prepTimeMinutes"),
      cookTimeMinutes: getOptionalNumber(formData, "cookTimeMinutes"),
      restTimeMinutes: getOptionalNumber(formData, "restTimeMinutes"),
      difficultyLevel: getOptionalNumber(formData, "difficultyLevel"),
      notes: getOptionalString(formData, "notes"),
      ingredients: ingredientsText
        ? parseIngredientsText(ingredientsText)
        : undefined,
      steps: stepsText ? parseStepsText(stepsText) : undefined,
      override,
    };
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    setCachedFormData(data);
    setError(null);
    setResult(null);

    const payload = buildCreatePayload(data);

    startTransitionAction(async () => {
      try {
        const response = await apiFetch(kitchenRecipeCompositeCreate(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const actionResult: CompositeRouteResponse = await response.json();
        setResult(actionResult);

        if (actionResult.success && actionResult.data?.recipeId) {
          router.push(`/kitchen/recipes/${actionResult.data.recipeId}`);
        } else if (actionResult.constraintOutcomes?.length) {
          // Constraints blocked - dialog will be shown via constraintState
        } else if (actionResult.message) {
          setError(actionResult.message);
        } else {
          setError("Failed to create recipe.");
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "An unknown error occurred";
        setError(message);
      }
    });
  };

  const handleOverride = (reason: OverrideReasonCode, details: string) => {
    if (!cachedFormData) {
      return;
    }

    const payload = buildCreatePayload(cachedFormData, {
      reasonCode: reason,
      details,
    });

    startTransitionAction(async () => {
      try {
        const response = await apiFetch(kitchenRecipeCompositeCreate(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const actionResult: CompositeRouteResponse = await response.json();
        setResult(actionResult);

        if (actionResult.success && actionResult.data?.recipeId) {
          router.push(`/kitchen/recipes/${actionResult.data.recipeId}`);
        } else if (actionResult.message) {
          setError(actionResult.message);
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
