"use server";

import { auth } from "@repo/auth/server";
import { captureException } from "@sentry/nextjs";
import { headers } from "next/headers";
import { apiUrl } from "@/app/lib/api";
import { kitchenPrepListsSaveDb } from "@/app/lib/routes";
import {
  generatePrepList as kitchenGeneratePrepList,
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

    if (!(orgId && userId)) {
      return { success: false, error: "Unauthorized" };
    }

    // Generate the prep list using the kitchen action
    const prepList = await kitchenGeneratePrepList({
      eventId: input.eventId,
      batchMultiplier: input.batchMultiplier,
      dietaryRestrictions: input.dietaryRestrictions,
    });

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

    if (!saveResponse.ok || !saveResult.success) {
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
