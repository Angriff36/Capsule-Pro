"use client";

import type { ConstraintOutcome } from "@angriff36/manifest/ir";
import { ConstraintOverrideDialog } from "@repo/design-system/components/constraint-override-dialog";
import type { OverrideReasonCode } from "@repo/design-system/components/override-reasons";
import { Button } from "@repo/design-system/components/ui/button";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type {
  CreatePrepListInput,
  PrepListGenerationResult,
} from "../actions-manifest";
import {
  createPrepListManifest,
  createPrepListWithOverride,
} from "../actions-manifest";

interface PrepListSaveButtonProps {
  prepList: PrepListGenerationResult;
  disabled?: boolean;
}

/**
 * A button component that saves a prep list to the database using
 * Manifest runtime for constraint checking.
 *
 * When blocking constraints are detected, shows the constraint
 * override dialog for user confirmation.
 */
export function PrepListSaveButton({
  prepList,
  disabled,
}: PrepListSaveButtonProps) {
  const router = useRouter();
  const [isPending, startTransitionAction] = useTransition();
  const [constraintOutcomes, setConstraintOutcomes] = useState<
    ConstraintOutcome[]
  >([]);
  const [inputData, setInputData] = useState<CreatePrepListInput | null>(null);
  const [showOverrideDialog, setShowOverrideDialog] = useState(false);

  const handleSave = () => {
    // Build input data from prep list generation result
    const input: CreatePrepListInput = {
      eventId: prepList.eventId,
      name: `${prepList.eventTitle} - ${new Date(prepList.eventDate).toLocaleDateString()} Prep List`,
      batchMultiplier: prepList.batchMultiplier,
      dietaryRestrictions: [],
      totalItems: prepList.totalIngredients,
      totalEstimatedTime: prepList.totalEstimatedTime,
      notes: null,
      items: prepList.stationLists.flatMap((station) =>
        station.ingredients.map((ingredient) => ({
          stationId: station.stationId,
          stationName: station.stationName,
          ingredientId: ingredient.ingredientId,
          ingredientName: ingredient.ingredientName,
          category: ingredient.category ?? null,
          baseQuantity: ingredient.baseQuantity,
          baseUnit: ingredient.baseUnit,
          scaledQuantity: ingredient.scaledQuantity,
          scaledUnit: ingredient.scaledUnit,
          isOptional: ingredient.isOptional,
          preparationNotes: ingredient.preparationNotes ?? null,
          allergens: ingredient.allergens ?? [],
          dietarySubstitutions: ingredient.dietarySubstitutions ?? [],
          dishId: null,
          dishName: null,
          recipeVersionId: null,
        }))
      ),
    };

    setInputData(input);

    startTransitionAction(async () => {
      try {
        const result = await createPrepListManifest(input);

        if (result.success) {
          if (result.redirectUrl) {
            router.push(result.redirectUrl);
          } else if (result.prepListId) {
            router.push(`/kitchen/prep-lists/${result.prepListId}`);
          }
        } else if (
          result.constraintOutcomes &&
          result.constraintOutcomes.length > 0
        ) {
          setConstraintOutcomes(result.constraintOutcomes);
          setShowOverrideDialog(true);
        }
      } catch {
        // Error handling - could add toast notification here
      }
    });
  };

  const handleOverride = async (
    reason: OverrideReasonCode,
    details: string
  ) => {
    if (!inputData) {
      return;
    }

    startTransitionAction(async () => {
      try {
        const result = await createPrepListWithOverride(
          inputData,
          reason,
          details
        );

        if (result.success) {
          setShowOverrideDialog(false);
          if (result.redirectUrl) {
            router.push(result.redirectUrl);
          } else if (result.prepListId) {
            router.push(`/kitchen/prep-lists/${result.prepListId}`);
          }
        }
      } catch {
        // Error handling
      }
    });
  };

  const blockingConstraints = constraintOutcomes.filter(
    (c) => !c.passed && c.severity === "block"
  );

  const isSaving = isPending;

  return (
    <>
      <Button
        disabled={disabled || isSaving}
        onClick={handleSave}
        size="sm"
        variant="secondary"
      >
        {isSaving ? (
          <>
            <span className="mr-2 h-4 w-4 animate-spin">⟳</span>
            Saving...
          </>
        ) : (
          <>
            <span className="mr-2 h-4 w-4">💾</span>
            Save to Database
          </>
        )}
      </Button>
      <ConstraintOverrideDialog
        actionDescription="save this prep list"
        constraints={blockingConstraints}
        onConfirm={handleOverride}
        onOpenChange={setShowOverrideDialog}
        open={showOverrideDialog}
      />
    </>
  );
}
