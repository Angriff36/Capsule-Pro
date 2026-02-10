"use client";

import {
  ConstraintOverrideDialog,
  useConstraintOverride,
} from "@repo/design-system/components/constraint-override-dialog";
import {
  Alert,
  AlertDescription,
} from "@repo/design-system/components/ui/alert";
import type { OverrideReasonCode } from "@repo/design-system/components/override-reasons";
import { AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { ManifestActionResult } from "../actions-manifest-v2";
import {
  createDish,
  createDishWithOverride,
  createRecipe,
  createRecipeWithOverride,
  updateRecipe,
  updateRecipeWithOverride,
} from "../actions-manifest-v2";

interface FormWithConstraintsProps {
  formAction: "createRecipe" | "updateRecipe" | "createDish";
  recipeId?: string;
  children: (props: {
    handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
    isSubmitting: boolean;
    error: string | null;
  }) => React.ReactNode;
  submitButton?: (props: { isSubmitting: boolean }) => React.ReactNode;
}

/**
 * Client form wrapper that handles Manifest constraint outcomes and override dialog
 *
 * Usage:
 * <RecipeFormWithConstraints formAction="createRecipe">
 *   {({ handleSubmit, isSubmitting, error }) => (
 *     <form onSubmit={handleSubmit}>
 *       ... form fields ...
 *       {error && <ErrorMessage>{error}</ErrorMessage>}
 *       <Button type="submit" disabled={isSubmitting}>
 *         {isSubmitting ? "Submitting..." : "Create"}
 *       </Button>
 *     </form>
 *   )}
 * </RecipeFormWithConstraints>
 */
export function RecipeFormWithConstraints({
  formAction,
  recipeId,
  children,
  submitButton,
}: FormWithConstraintsProps) {
  const router = useRouter();
  const [isPending, startTransitionAction] = useTransition();
  const [result, setResult] = useState<ManifestActionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    setFormData(data);
    setError(null);
    setResult(null);

    startTransitionAction(async () => {
      try {
        let actionResult: ManifestActionResult;

        switch (formAction) {
          case "createRecipe":
            actionResult = await createRecipe(data);
            break;
          case "updateRecipe":
            actionResult = await updateRecipe(recipeId!, data);
            break;
          case "createDish":
            actionResult = await createDish(data);
            break;
          default:
            throw new Error(`Unknown form action: ${formAction}`);
        }

        setResult(actionResult);

        if (actionResult.success) {
          // Navigate to redirect URL on success
          if (actionResult.redirectUrl) {
            router.push(actionResult.redirectUrl);
          }
        } else if (actionResult.error) {
          setError(actionResult.error);
        }
        // If not successful due to constraints, the dialog will show
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
        let actionResult: ManifestActionResult;

        switch (formAction) {
          case "createRecipe":
            actionResult = await createRecipeWithOverride(
              formData,
              reason,
              details
            );
            break;
          case "updateRecipe":
            actionResult = await updateRecipeWithOverride(
              recipeId!,
              formData,
              reason,
              details
            );
            break;
          case "createDish":
            actionResult = await createDishWithOverride(
              formData,
              reason,
              details
            );
            break;
          default:
            throw new Error(`Unknown form action: ${formAction}`);
        }

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

  const isSubmitting = isPending;

  return (
    <>
      {children({ handleSubmit, isSubmitting, error })}
      <ConstraintOverrideDialog
        actionDescription={
          formAction === "createRecipe"
            ? "create this recipe"
            : formAction === "updateRecipe"
              ? "update this recipe"
              : "create this dish"
        }
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

// Hook version for more complex use cases
export function useManifestFormAction(
  action: "createRecipe" | "updateRecipe" | "createDish",
  recipeId?: string
) {
  const router = useRouter();
  const [isPending, startTransitionAction] = useTransition();
  const [result, setResult] = useState<ManifestActionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cachedFormData, setCachedFormData] = useState<FormData | null>(null);

  const execute = async (formData: FormData) => {
    setCachedFormData(formData);
    setError(null);
    setResult(null);

    return new Promise<ManifestActionResult>((resolve, reject) => {
      startTransitionAction(async () => {
        try {
          let actionResult: ManifestActionResult;

          switch (action) {
            case "createRecipe":
              actionResult = await createRecipe(formData);
              break;
            case "updateRecipe":
              actionResult = await updateRecipe(recipeId!, formData);
              break;
            case "createDish":
              actionResult = await createDish(formData);
              break;
            default:
              throw new Error(`Unknown form action: ${action}`);
          }

          setResult(actionResult);
          resolve(actionResult);

          if (actionResult.success && actionResult.redirectUrl) {
            router.push(actionResult.redirectUrl);
          }
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "An unknown error occurred";
          setError(message);
          reject(err);
        }
      });
    });
  };

  const executeWithOverride = async (
    reason: OverrideReasonCode,
    details: string
  ) => {
    if (!cachedFormData) {
      throw new Error("No form data cached for override");
    }

    setError(null);
    setResult(null);

    return new Promise<ManifestActionResult>((resolve, reject) => {
      startTransitionAction(async () => {
        try {
          let actionResult: ManifestActionResult;

          switch (action) {
            case "createRecipe":
              actionResult = await createRecipeWithOverride(
                cachedFormData,
                reason,
                details
              );
              break;
            case "updateRecipe":
              actionResult = await updateRecipeWithOverride(
                recipeId!,
                cachedFormData,
                reason,
                details
              );
              break;
            case "createDish":
              actionResult = await createDishWithOverride(
                cachedFormData,
                reason,
                details
              );
              break;
            default:
              throw new Error(`Unknown form action: ${action}`);
          }

          setResult(actionResult);
          resolve(actionResult);

          if (actionResult.success && actionResult.redirectUrl) {
            router.push(actionResult.redirectUrl);
          }
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "An unknown error occurred";
          setError(message);
          reject(err);
        }
      });
    });
  };

  const handleOverride = async (
    reason: OverrideReasonCode,
    details: string
  ) => {
    await executeWithOverride(reason, details);
  };

  const constraintState = useConstraintOverride({
    result: result ?? {},
    onOverride: handleOverride,
  });

  return {
    execute,
    isSubmitting: isPending,
    error,
    result,
    constraintState,
  };
}
