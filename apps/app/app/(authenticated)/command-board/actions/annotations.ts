"use server";

import { database } from "@repo/database";
import { revalidatePath } from "next/cache";
import { requireTenantId } from "../../../lib/tenant";
import { withRetry } from "../lib/retry-utils";
import type { BoardAnnotation } from "../types/board";

// ============================================================================
// Types
// ============================================================================

export interface CreateConnectionInput {
  fromProjectionId: string;
  toProjectionId: string;
  label?: string;
  color?: string;
  style?: "solid" | "dashed" | "dotted";
}

export interface CreateConnectionResult {
  success: boolean;
  annotation?: BoardAnnotation;
  error?: string;
  /** True if a connection between these projections already exists */
  isDuplicate?: boolean;
}

export interface DeleteAnnotationResult {
  success: boolean;
  error?: string;
}

// ============================================================================
// Read
// ============================================================================

/** Fetch all non-deleted annotations for a board */
export async function getAnnotationsForBoard(
  boardId: string
): Promise<BoardAnnotation[]> {
  const tenantId = await requireTenantId();

  try {
    const rows = await withRetry(
      () =>
        database.boardAnnotation.findMany({
          where: {
            tenantId,
            boardId,
            deletedAt: null,
          },
        }),
      { maxRetries: 1, delayMs: 2000 }
    );

    return rows.map((row) => ({
      id: row.id,
      boardId: row.boardId,
      annotationType: row.annotationType as BoardAnnotation["annotationType"],
      fromProjectionId: row.fromProjectionId,
      toProjectionId: row.toProjectionId,
      label: row.label,
      color: row.color,
      style: row.style,
    }));
  } catch (error) {
    console.error(
      "[getAnnotationsForBoard] Failed to fetch annotations:",
      error
    );
    return [];
  }
}

// ============================================================================
// Create Connection
// ============================================================================

/**
 * Create a manual connection annotation between two projections.
 * Uses the established pattern from projections.ts and groups.ts.
 */
export async function createConnection(
  boardId: string,
  input: CreateConnectionInput
): Promise<CreateConnectionResult> {
  try {
    const tenantId = await requireTenantId();

    // Validate that both projections exist on this board
    const projections = await withRetry(
      () =>
        database.boardProjection.findMany({
          where: {
            tenantId,
            boardId,
            id: { in: [input.fromProjectionId, input.toProjectionId] },
            deletedAt: null,
          },
          select: { id: true },
        }),
      { maxRetries: 1, delayMs: 2000 }
    );

    if (projections.length !== 2) {
      return {
        success: false,
        error: "One or both projections not found on this board",
      };
    }

    // Check for duplicate connection (in either direction for undirected connections)
    const existing = await withRetry(
      () =>
        database.boardAnnotation.findFirst({
          where: {
            tenantId,
            boardId,
            annotationType: "connection",
            deletedAt: null,
            OR: [
              {
                fromProjectionId: input.fromProjectionId,
                toProjectionId: input.toProjectionId,
              },
              {
                fromProjectionId: input.toProjectionId,
                toProjectionId: input.fromProjectionId,
              },
            ],
          },
        }),
      { maxRetries: 1, delayMs: 2000 }
    );

    if (existing) {
      return {
        success: false,
        isDuplicate: true,
        error: "A connection between these entities already exists",
      };
    }

    // Create the annotation
    const created = await withRetry(
      () =>
        database.boardAnnotation.create({
          data: {
            tenantId,
            id: crypto.randomUUID(),
            boardId,
            annotationType: "connection",
            fromProjectionId: input.fromProjectionId,
            toProjectionId: input.toProjectionId,
            label: input.label ?? null,
            color: input.color ?? null,
            style: input.style ?? null,
          },
        }),
      { maxRetries: 1, delayMs: 2000 }
    );

    revalidatePath(`/command-board/${boardId}`);

    return {
      success: true,
      annotation: {
        id: created.id,
        boardId: created.boardId,
        annotationType:
          created.annotationType as BoardAnnotation["annotationType"],
        fromProjectionId: created.fromProjectionId,
        toProjectionId: created.toProjectionId,
        label: created.label,
        color: created.color,
        style: created.style,
      },
    };
  } catch (error) {
    console.error("[createConnection] Failed to create connection:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create connection",
    };
  }
}

// ============================================================================
// Delete Annotation
// ============================================================================

/**
 * Soft-delete an annotation (connection).
 * Only manual annotations can be deleted - derived connections are auto-generated.
 */
export async function deleteAnnotation(
  annotationId: string
): Promise<DeleteAnnotationResult> {
  try {
    const tenantId = await requireTenantId();

    const annotation = await withRetry(
      () =>
        database.boardAnnotation.update({
          where: {
            tenantId_id: {
              tenantId,
              id: annotationId,
            },
          },
          data: {
            deletedAt: new Date(),
          },
          select: { boardId: true },
        }),
      { maxRetries: 1, delayMs: 2000 }
    );

    revalidatePath(`/command-board/${annotation.boardId}`);

    return { success: true };
  } catch (error) {
    console.error("[deleteAnnotation] Failed to delete annotation:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to delete annotation",
    };
  }
}

// ============================================================================
// Connection Type Helpers
// ============================================================================

// CONNECTION_STYLES and CONNECTION_COLORS moved to ../lib/connection-constants.ts
// (Server Action files cannot export non-async-function values)
