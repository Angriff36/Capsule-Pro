"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { ListChecks } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { apiUrl } from "@/app/lib/api";
import { parseFlatInstructions } from "../lib/parse-flat-instructions";

// Converts a legacy flat-text method into governed RecipeStep rows via the
// batch transport (one transaction per chunk). Uses apiUrl + raw fetch on
// purpose: apiFetch dev-validates paths against routes.manifest.json, which
// has no /api/manifest/batch entry.

// Mirrors apps/api MAX_BATCH_SIZE (MANIFEST_BATCH_MAX_SIZE, default 50).
const BATCH_LIMIT = 50;

export function ConvertInstructionsButton({
  instructionsText,
  recipeVersionId,
}: {
  instructionsText: string;
  recipeVersionId: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const handleConvert = async () => {
    const steps = parseFlatInstructions(instructionsText);
    if (steps.length === 0) {
      toast.error("No instructions found to convert.");
      return;
    }

    setPending(true);
    try {
      for (let i = 0; i < steps.length; i += BATCH_LIMIT) {
        const operations = steps.slice(i, i + BATCH_LIMIT).map((step) => ({
          command: "create",
          entity: "RecipeStep",
          params: {
            instruction: step.instruction,
            phase: "method",
            recipeVersionId,
            stepNumber: step.stepNumber,
          },
        }));
        const res = await fetch(apiUrl("/api/manifest/batch"), {
          body: JSON.stringify({ operations }),
          credentials: "include",
          headers: { "content-type": "application/json" },
          method: "POST",
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as {
            error?: string;
            message?: string;
          } | null;
          throw new Error(
            body?.error ??
              body?.message ??
              `Failed to create steps (${res.status})`
          );
        }
      }
      toast.success(
        `Converted to ${steps.length} checkable step${steps.length === 1 ? "" : "s"}.`
      );
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to convert instructions"
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <Button
      disabled={pending}
      onClick={handleConvert}
      size="sm"
      variant="outline"
    >
      <ListChecks className="size-3.5" />
      {pending ? "Converting…" : "Convert to checkable steps"}
    </Button>
  );
}
