"use server";

import { auth } from "@repo/auth/server";
import { captureException } from "@sentry/nextjs";
import { redirect } from "next/navigation";
import {
  generatePrepList as kitchenGeneratePrepList,
  savePrepListToDatabase,
  type PrepListGenerationResult,
} from "../../kitchen/prep-lists/actions";

export interface GenerateEventPrepListInput {
  eventId: string;
  batchMultiplier?: number;
  dietaryRestrictions?: string[];
}

export interface GenerateEventPrepListResult {
  success: boolean;
  prepList?: PrepListGenerationResult;
  prepListId?: string;
  error?: string;
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

    if (!orgId || !userId) {
      return { success: false, error: "Unauthorized" };
    }

    // Generate the prep list using the kitchen action
    const prepList = await kitchenGeneratePrepList({
      eventId: input.eventId,
      batchMultiplier: input.batchMultiplier,
      dietaryRestrictions: input.dietaryRestrictions,
    });

    // Save to database for persistence
    const saveResult = await savePrepListToDatabase(
      input.eventId,
      prepList,
      `${prepList.eventTitle} - Prep List`
    );

    if (!saveResult.success) {
      return {
        success: false,
        error: saveResult.error || "Failed to save prep list",
      };
    }

    return {
      success: true,
      prepList,
      prepListId: saveResult.prepListId,
    };
  } catch (error) {
    captureException(error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate prep list",
    };
  }
}
