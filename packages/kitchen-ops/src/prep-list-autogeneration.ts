/**
 * Prep List Auto-Generation Service
 *
 * This module provides event-driven auto-generation of prep lists when events are created or updated.
 * It integrates with the outbox pattern to reliably trigger prep list generation.
 *
 * @module kitchen-ops/prep-list-autogeneration
 */

import { type Prisma, PrismaClient } from "@repo/database";
import { createOutboxEvent } from "@repo/realtime";

/**
 * Input for triggering prep list auto-generation
 */
export interface PrepListAutoGenerationInput {
  /** Database client or transaction */
  db: PrismaClient | Prisma.TransactionClient;
  /** Tenant identifier */
  tenantId: string;
  /** Event ID to generate prep list for */
  eventId: string;
  /** Event title for naming the prep list */
  eventTitle: string;
  /** Guest count for scaling */
  guestCount: number;
  /** Optional batch multiplier (defaults to 1) */
  batchMultiplier?: number;
  /** Optional dietary restrictions */
  dietaryRestrictions?: string[];
  /** User ID who triggered the generation */
  userId: string;
}

/**
 * Result of prep list auto-generation
 */
export interface PrepListAutoGenerationResult {
  success: boolean;
  prepListId?: string;
  error?: string;
  generatedAt: Date;
}

/**
 * Trigger prep list auto-generation for an event.
 *
 * This function creates an outbox event that will be processed to generate
 * a prep list. The outbox pattern ensures reliability and decoupling.
 *
 * @param input - Auto-generation parameters
 * @returns Result indicating if the generation was triggered
 *
 * @example
 * ```typescript
 * // When an event is created
 * const result = await triggerPrepListAutoGeneration({
 *   db: database,
 *   tenantId: "tenant-123",
 *   eventId: event.id,
 *   eventTitle: event.title,
 *   guestCount: event.guestCount,
 *   userId: "user-456",
 * });
 * ```
 */
export async function triggerPrepListAutoGeneration(
  input: PrepListAutoGenerationInput
): Promise<PrepListAutoGenerationResult> {
  const {
    db,
    tenantId,
    eventId,
    eventTitle,
    guestCount,
    batchMultiplier = 1,
    dietaryRestrictions = [],
    userId,
  } = input;

  try {
    // Create outbox event for prep list generation
    await createOutboxEvent(db, {
      tenantId,
      aggregateType: "Event",
      aggregateId: eventId,
      eventType: "event.prep-list.requested",
      payload: {
        eventId,
        eventTitle,
        guestCount,
        batchMultiplier,
        dietaryRestrictions,
        requestedBy: userId,
        requestedAt: new Date().toISOString(),
      },
    });

    return {
      success: true,
      generatedAt: new Date(),
    };
  } catch (error) {
    console.error("Failed to trigger prep list auto-generation:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      generatedAt: new Date(),
    };
  }
}

/**
 * Process pending prep list generation requests.
 *
 * This function queries for pending prep list generation events and processes them.
 * It should be called by a background worker or cron job.
 *
 * @param db - Database client
 * @param generatePrepListFn - Function to generate prep list
 * @returns Number of events processed
 *
 * @example
 * ```typescript
 * // In a background worker or cron job
 * const processed = await processPendingPrepListGenerations(database, async (input) => {
 *   return await generatePrepList(input);
 * });
 * ```
 */
export async function processPendingPrepListGenerations(
  db: PrismaClient,
  generatePrepListFn: (input: {
    eventId: string;
    batchMultiplier?: number;
    dietaryRestrictions?: string[];
    saveToDatabase?: boolean;
  }) => Promise<{
    prepListId?: string;
    success: boolean;
    error?: string;
  }>
): Promise<{ processed: number; errors: number }> {
  // Get pending prep list generation events
  const pendingEvents = await db.outboxEvent.findMany({
    where: {
      eventType: "event.prep-list.requested",
      status: "pending",
    },
    orderBy: {
      createdAt: "asc",
    },
    take: 10, // Process in batches
  });

  let processed = 0;
  let errors = 0;

  for (const event of pendingEvents) {
    try {
      const payload = event.payload as {
        eventId: string;
        batchMultiplier?: number;
        dietaryRestrictions?: string[];
      };

      // Generate prep list
      const result = await generatePrepListFn({
        eventId: payload.eventId,
        batchMultiplier: payload.batchMultiplier,
        dietaryRestrictions: payload.dietaryRestrictions,
        saveToDatabase: true,
      });

      if (result.success) {
        // Mark event as published
        await db.outboxEvent.update({
          where: { id: event.id },
          data: {
            status: "published",
            publishedAt: new Date(),
          },
        });
        processed++;
      } else {
        // Mark as failed
        await db.outboxEvent.update({
          where: { id: event.id },
          data: {
            status: "failed",
            error: result.error || "Unknown error",
          },
        });
        errors++;
      }
    } catch (error) {
      console.error("Failed to process prep list generation:", error);
      await db.outboxEvent.update({
        where: { id: event.id },
        data: {
          status: "failed",
          error: error instanceof Error ? error.message : "Unknown error",
        },
      });
      errors++;
    }
  }

  return { processed, errors };
}

/**
 * Trigger immediate prep list generation for an event.
 *
 * This is a synchronous version that generates the prep list immediately
 * rather than using the outbox pattern. Use this for immediate generation needs.
 *
 * @param input - Auto-generation parameters
 * @param generatePrepListFn - Function to generate prep list
 * @returns Result of generation
 */
export async function generatePrepListImmediately(
  input: Omit<PrepListAutoGenerationInput, "db">,
  generatePrepListFn: (input: {
    eventId: string;
    batchMultiplier?: number;
    dietaryRestrictions?: string[];
    saveToDatabase?: boolean;
  }) => Promise<{
    prepListId?: string;
    success: boolean;
    error?: string;
  }>
): Promise<PrepListAutoGenerationResult> {
  const {
    eventId,
    batchMultiplier = 1,
    dietaryRestrictions = [],
  } = input;

  try {
    const result = await generatePrepListFn({
      eventId,
      batchMultiplier,
      dietaryRestrictions,
      saveToDatabase: true,
    });

    return {
      success: result.success,
      prepListId: result.prepListId,
      error: result.error,
      generatedAt: new Date(),
    };
  } catch (error) {
    console.error("Failed to generate prep list immediately:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      generatedAt: new Date(),
    };
  }
}
