/**
 * @module NewIngredientForm
 * @intent Client form for creating a new ingredient
 * @responsibility Render ingredient form fields, handle submission via server action
 * @domain Kitchen
 * @tags ingredients, form, client-component, kitchen
 * @canonical true
 */

"use client";

import {
  CommandBand,
  CommandBandBody,
  CommandBandHeader,
  CommandBandLede,
  DisplayHeading,
  MonoLabel,
  PageCanvas,
  SectionHeader,
} from "@repo/design-system/components/blocks/page-shell";
import {
  Alert,
  AlertDescription,
} from "@repo/design-system/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { IngredientActionResult } from "../actions-ingredient";
import { createIngredient } from "../actions-ingredient";

interface UnitOption {
  id: number;
  code: string;
  name: string;
}

interface NewIngredientFormProps {
  units: UnitOption[];
}

export function NewIngredientForm({ units }: NewIngredientFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        const formData = new FormData(e.currentTarget);
        const result: IngredientActionResult = await createIngredient(formData);

        if (result.success) {
          if (result.redirectUrl) {
            router.push(result.redirectUrl);
          }
        } else {
          setError(result.error ?? "Failed to create ingredient.");
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "An unknown error occurred";
        setError(message);
      }
    });
  };

  return (
    <PageCanvas>
      <CommandBand>
        <CommandBandHeader>
          <div className="space-y-4">
            <MonoLabel tone="dark">Kitchen / Ingredients</MonoLabel>
            <DisplayHeading size="md">New ingredient</DisplayHeading>
            <CommandBandLede>
              Add a raw ingredient to your library with allergen info and
              storage details. Ingredients are used across recipes, scaling, and
              cost calculations.
            </CommandBandLede>
          </div>
        </CommandBandHeader>
        <CommandBandBody>
          <div className="flex items-center gap-4 text-sm text-white/60">
            <span>
              {units.length} unit{units.length !== 1 ? "s" : ""} available
            </span>
          </div>
        </CommandBandBody>
      </CommandBand>

      <form className="space-y-8" onSubmit={handleSubmit}>
        {/* Basic Information Section */}
        <section className="space-y-4">
          <SectionHeader
            count="1 of 2"
            description="Name, category, and default unit for this ingredient."
            eyebrow="Details"
            title="Basic information"
          />
          <div className="space-y-6 rounded-lg border bg-card p-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="name">
                  Ingredient name <span className="text-coral">*</span>
                </label>
                <input
                  className="flex h-10 w-full rounded-sm border border-input bg-background px-3 py-2 text-sm"
                  id="name"
                  name="name"
                  placeholder="All-purpose flour"
                  required
                  type="text"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="category">
                  Category
                </label>
                <input
                  className="flex h-10 w-full rounded-sm border border-input bg-background px-3 py-2 text-sm"
                  id="category"
                  name="category"
                  placeholder="Dry goods, Produce, Dairy"
                  type="text"
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="defaultUnitId">
                  Default unit
                </label>
                <select
                  className="flex h-10 w-full rounded-sm border border-input bg-background px-3 py-2 text-sm"
                  id="defaultUnitId"
                  name="defaultUnitId"
                >
                  <option value="">Select unit</option>
                  {units.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.code} &mdash; {unit.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="allergens">
                  Allergens
                </label>
                <input
                  className="flex h-10 w-full rounded-sm border border-input bg-background px-3 py-2 text-sm"
                  id="allergens"
                  name="allergens"
                  placeholder="nuts, dairy, gluten (comma-separated)"
                  type="text"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Storage & Shelf Life Section */}
        <section className="space-y-4">
          <SectionHeader
            count="2 of 2"
            description="Shelf life and storage requirements for safe handling."
            eyebrow="Storage"
            title="Shelf life & storage"
          />
          <div className="space-y-6 rounded-lg border bg-card p-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="shelfLifeDays">
                  Shelf life (days)
                </label>
                <input
                  className="flex h-10 w-full rounded-sm border border-input bg-background px-3 py-2 text-sm"
                  id="shelfLifeDays"
                  min="0"
                  name="shelfLifeDays"
                  placeholder="14"
                  type="number"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label
                className="text-sm font-medium"
                htmlFor="storageInstructions"
              >
                Storage instructions
              </label>
              <textarea
                className="flex min-h-[100px] w-full rounded-sm border border-input bg-background px-3 py-2 text-sm"
                id="storageInstructions"
                name="storageInstructions"
                placeholder="Refrigerate at 2-4C. Keep sealed when not in use."
                rows={4}
              />
            </div>
          </div>
        </section>

        {/* Actions */}
        <section className="space-y-4">
          <div className="rounded-lg border bg-card p-6">
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                className="inline-flex h-10 items-center justify-center rounded-sm bg-ink px-6 py-2 text-sm font-medium text-white hover:bg-ink/90 disabled:pointer-events-none disabled:opacity-50"
                disabled={isPending}
                type="submit"
              >
                {isPending ? "Creating..." : "Create ingredient"}
              </button>
              <a
                className="inline-flex h-10 items-center justify-center rounded-sm border border-input bg-background px-6 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
                href="/kitchen/recipes?tab=ingredients"
              >
                Cancel
              </a>
            </div>
          </div>
        </section>
      </form>

      {error && (
        <Alert className="mt-4" variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </PageCanvas>
  );
}
