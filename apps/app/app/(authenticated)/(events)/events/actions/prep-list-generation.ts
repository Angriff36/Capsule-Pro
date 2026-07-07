"use server";

import { auth } from "@repo/auth/server";
import { captureException } from "@sentry/nextjs";
import { headers } from "next/headers";
import { apiUrl } from "@/app/lib/api";
import { kitchenPrepListsSaveDb } from "@/app/lib/routes";
import {
  generatePrepList as kitchenGeneratePrepList,
  type PrepListGenerationResult,
} from "../../../(operations)/kitchen/prep-lists/actions";

export interface GenerateEventPrepListInput {
  batchMultiplier?: number;
  dietaryRestrictions?: string[];
  eventId: string;
}

export interface GenerateEventPrepListResult {
  error?: string;
  prepList?: PrepListGenerationResult;
  prepListId?: string;
  success: boolean;
}

/**
 * Generate a prep list for an event based on its dishes and recipes.
 * This aggregates ingredients from all recipes, groups them by station,
 * and saves the result to the database.
 */
export async function generateEventPrepList(
  input: GenerateEventPrepListInput
): Promise<GenerateEventPrepListResult> {
  try {
    const { orgId, userId } = await auth();

    if (!(orgId && userId)) {
      return { success: false, error: "Unauthorized" };
    }

    // Generate the prep list using the kitchen action
    const prepList = await kitchenGeneratePrepList({
      eventId: input.eventId,
      batchMultiplier: input.batchMultiplier,
      dietaryRestrictions: input.dietaryRestrictions,
    });

    // Saving an empty list would create a useless record (and finalize would
    // be rejected by the Manifest warnZeroItems/finalize guard). Explain why
    // the list is empty instead.
    if (prepList.totalIngredients === 0) {
      const detail =
        prepList.linkedDishCount === 0
          ? "This event has no dishes linked to it yet. Add dishes to the event menu first."
          : `${prepList.linkedDishCount} linked dish(es) could not be expanded into ingredients: ${prepList.unresolvedDishes
              .map((d) => `${d.dishName} (${d.reason.replace(/_/g, " ")})`)
              .join(", ")}`;
      return {
        success: false,
        error: `Prep list would be empty. ${detail}`,
        prepList,
      };
    }

    const requestHeaders = await headers();
    const saveResponse = await fetch(apiUrl(kitchenPrepListsSaveDb()), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: requestHeaders.get("cookie") ?? "",
      },
      body: JSON.stringify({
        eventId: input.eventId,
        prepList,
        name: `${prepList.eventTitle} - Prep List`,
        finalize: true,
      }),
    });

    const saveResult = (await saveResponse.json()) as {
      success?: boolean;
      message?: string;
      data?: { prepListId?: string };
    };

    if (!(saveResponse.ok && saveResult.success)) {
      return {
        success: false,
        error: saveResult.message || "Failed to save prep list",
      };
    }

    return {
      success: true,
      prepList,
      prepListId: saveResult.data?.prepListId,
    };
  } catch (error) {
    captureException(error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to generate prep list",
    };
  }
}
