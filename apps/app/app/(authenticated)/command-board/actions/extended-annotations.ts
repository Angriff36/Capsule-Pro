"use server";

import { database } from "@repo/database";
import { revalidatePath } from "next/cache";
import { requireTenantId } from "../../../lib/tenant";
import { withRetry } from "../lib/retry-utils";
import type {
  AnnotationComment,
  BoardAnnotation,
  Mention,
} from "../types/board";

// ============================================================================
// Types
// ============================================================================

export interface CreateNoteInput {
  boardId: string;
  content: string;
  position: { x: number; y: number };
  color?: string;
  priority?: "low" | "medium" | "high";
  tags?: string[];
}

export interface CreateLabelInput {
  boardId: string;
  projectionId: string;
  label: string;
  color?: string;
}

export interface CreateHighlightInput {
  boardId: string;
  projectionId: string;
  content: string;
  color?: string;
}

export interface CreateRegionInput {
  boardId: string;
  label: string;
  position: { x: number; y: number; width: number; height: number };
  color?: string;
}

export interface UpdateAnnotationInput {
  annotationId: string;
  content?: string;
  label?: string;
  color?: string;
  priority?: "low" | "medium" | "high";
  resolved?: boolean;
  tags?: string[];
  position?: { x: number; y: number; width?: number; height?: number };
}

export interface AddCommentInput {
  annotationId: string;
  content: string;
  mentions?: Mention[];
  parentId?: string;
}

export interface UpdateCommentInput {
  commentId: string;
  content: string;
  mentions?: Mention[];
  resolved?: boolean;
}

export interface AnnotationResult {
  success: boolean;
  annotation?: BoardAnnotation;
  error?: string;
}

export interface CommentResult {
  success: boolean;
  comment?: AnnotationComment;
  error?: string;
}

export interface DeleteResult {
  success: boolean;
  error?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/** Get current user info for annotations */
async function getCurrentUser() {
  const tenantId = await requireTenantId();
  // In a real implementation, you would get the user from the session
  // For now, we'll use a placeholder
  return {
    tenantId,
    userId: "current-user-id", // TODO: Get from auth session
    userName: "Current User", // TODO: Get from auth session
  };
}

/** Extract mentions from content (finds @username patterns) */
function extractMentions(content: string): Mention[] {
  const mentionRegex = /@(\w+)/g;
  const mentions: Mention[] = [];
  let match;

  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.push({
      userId: match[1], // In real impl, look up user ID from username
      userName: match[1],
      position: match.index,
    });
  }

  return mentions;
}

/** Convert database row to BoardAnnotation type */
function rowToAnnotation(row: any): BoardAnnotation {
  const metadata = row.metadata || {};
  return {
    id: row.id,
    boardId: row.boardId,
    annotationType: row.annotationType as BoardAnnotation["annotationType"],
    fromProjectionId: row.fromProjectionId,
    toProjectionId: row.toProjectionId,
    label: row.label,
    color: row.color,
    style: row.style,
    // Extended fields from metadata
    content: metadata.content || null,
    position: metadata.position || null,
    authorId: metadata.authorId || undefined,
    authorName: metadata.authorName || undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    comments: metadata.comments || [],
    tags: metadata.tags || [],
    priority: metadata.priority,
    resolved: metadata.resolved,
  };
}

// ============================================================================
// Create Annotations
// ============================================================================

/**
 * Create a sticky note annotation on the board.
 * Notes are free-floating annotations with rich text content.
 */
export async function createNote(
  input: CreateNoteInput
): Promise<AnnotationResult> {
  try {
    const { tenantId, userId, userName } = await getCurrentUser();

    const mentions = extractMentions(input.content);

    const created = await withRetry(
      () =>
        database.boardAnnotation.create({
          data: {
            tenantId,
            id: crypto.randomUUID(),
            boardId: input.boardId,
            annotationType: "note",
            fromProjectionId: null,
            toProjectionId: null,
            label: null,
            color: input.color ?? "#fef3c7", // Default yellow sticky note color
            style: null,
            metadata: {
              content: input.content,
              mentions: mentions.map((m) => ({
                userId: m.userId,
                userName: m.userName,
              })),
              position: input.position,
              authorId: userId,
              authorName: userName,
              priority: input.priority ?? "medium",
              tags: input.tags ?? [],
              comments: [],
              resolved: false,
            },
          },
        }),
      { maxRetries: 1, delayMs: 2000 }
    );

    revalidatePath(`/command-board/${input.boardId}`);

    return {
      success: true,
      annotation: rowToAnnotation(created),
    };
  } catch (error) {
    console.error("[createNote] Failed to create note:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create note",
    };
  }
}

/**
 * Create a label annotation on a projection.
 * Labels are tags attached to specific entities.
 */
export async function createLabel(
  input: CreateLabelInput
): Promise<AnnotationResult> {
  try {
    const { tenantId } = await getCurrentUser();

    // Validate projection exists
    const projection = await withRetry(
      () =>
        database.boardProjection.findFirst({
          where: {
            tenantId,
            boardId: input.boardId,
            id: input.projectionId,
            deletedAt: null,
          },
        }),
      { maxRetries: 1, delayMs: 2000 }
    );

    if (!projection) {
      return {
        success: false,
        error: "Projection not found on this board",
      };
    }

    const created = await withRetry(
      () =>
        database.boardAnnotation.create({
          data: {
            tenantId,
            id: crypto.randomUUID(),
            boardId: input.boardId,
            annotationType: "label",
            fromProjectionId: input.projectionId,
            toProjectionId: null,
            label: input.label,
            color: input.color ?? "#3b82f6",
            style: null,
            metadata: {
              position: null,
              comments: [],
            },
          },
        }),
      { maxRetries: 1, delayMs: 2000 }
    );

    revalidatePath(`/command-board/${input.boardId}`);

    return {
      success: true,
      annotation: rowToAnnotation(created),
    };
  } catch (error) {
    console.error("[createLabel] Failed to create label:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create label",
    };
  }
}

/**
 * Create a highlight annotation on a projection.
 * Highlights are for emphasizing specific content.
 */
export async function createHighlight(
  input: CreateHighlightInput
): Promise<AnnotationResult> {
  try {
    const { tenantId, userId, userName } = await getCurrentUser();

    // Validate projection exists
    const projection = await withRetry(
      () =>
        database.boardProjection.findFirst({
          where: {
            tenantId,
            boardId: input.boardId,
            id: input.projectionId,
            deletedAt: null,
          },
        }),
      { maxRetries: 1, delayMs: 2000 }
    );

    if (!projection) {
      return {
        success: false,
        error: "Projection not found on this board",
      };
    }

    const mentions = extractMentions(input.content);

    const created = await withRetry(
      () =>
        database.boardAnnotation.create({
          data: {
            tenantId,
            id: crypto.randomUUID(),
            boardId: input.boardId,
            annotationType: "highlight",
            fromProjectionId: input.projectionId,
            toProjectionId: null,
            label: null,
            color: input.color ?? "#fde047", // Default yellow highlight
            style: null,
            metadata: {
              content: input.content,
              mentions: mentions.map((m) => ({
                userId: m.userId,
                userName: m.userName,
              })),
              authorId: userId,
              authorName: userName,
              comments: [],
              resolved: false,
            },
          },
        }),
      { maxRetries: 1, delayMs: 2000 }
    );

    revalidatePath(`/command-board/${input.boardId}`);

    return {
      success: true,
      annotation: rowToAnnotation(created),
    };
  } catch (error) {
    console.error("[createHighlight] Failed to create highlight:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create highlight",
    };
  }
}

/**
 * Create a region annotation (visual area on the board).
 * Regions are for grouping or highlighting board areas.
 */
export async function createRegion(
  input: CreateRegionInput
): Promise<AnnotationResult> {
  try {
    const { tenantId } = await getCurrentUser();

    const created = await withRetry(
      () =>
        database.boardAnnotation.create({
          data: {
            tenantId,
            id: crypto.randomUUID(),
            boardId: input.boardId,
            annotationType: "region",
            fromProjectionId: null,
            toProjectionId: null,
            label: input.label,
            color: input.color ?? "rgba(59, 130, 246, 0.1)",
            style: null,
            metadata: {
              position: input.position,
              comments: [],
            },
          },
        }),
      { maxRetries: 1, delayMs: 2000 }
    );

    revalidatePath(`/command-board/${input.boardId}`);

    return {
      success: true,
      annotation: rowToAnnotation(created),
    };
  } catch (error) {
    console.error("[createRegion] Failed to create region:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create region",
    };
  }
}

// ============================================================================
// Update Annotations
// ============================================================================

/**
 * Update an existing annotation.
 * Supports updating content, label, color, priority, tags, and position.
 */
export async function updateAnnotation(
  input: UpdateAnnotationInput
): Promise<AnnotationResult> {
  try {
    const tenantId = await requireTenantId();

    // Fetch existing annotation
    const existing = await withRetry(
      () =>
        database.boardAnnotation.findUnique({
          where: {
            tenantId_id: {
              tenantId,
              id: input.annotationId,
            },
          },
        }),
      { maxRetries: 1, delayMs: 2000 }
    );

    if (!existing) {
      return {
        success: false,
        error: "Annotation not found",
      };
    }

    // Merge existing metadata with updates
    const metadata = (existing.metadata as Record<string, unknown>) || {};
    const updates: Record<string, unknown> = {};

    if (input.content !== undefined) {
      metadata.content = input.content;
      // Update mentions if content changed
      metadata.mentions = extractMentions(input.content).map((m) => ({
        userId: m.userId,
        userName: m.userName,
      }));
    }
    if (input.priority !== undefined) metadata.priority = input.priority;
    if (input.resolved !== undefined) metadata.resolved = input.resolved;
    if (input.tags !== undefined) metadata.tags = input.tags;
    if (input.position !== undefined) metadata.position = input.position;

    // Direct field updates
    if (input.label !== undefined) updates.label = input.label;
    if (input.color !== undefined) updates.color = input.color;

    updates.metadata = metadata;
    updates.updatedAt = new Date();

    const updated = await withRetry(
      () =>
        database.boardAnnotation.update({
          where: {
            tenantId_id: {
              tenantId,
              id: input.annotationId,
            },
          },
          data: updates,
        }),
      { maxRetries: 1, delayMs: 2000 }
    );

    revalidatePath(`/command-board/${existing.boardId}`);

    return {
      success: true,
      annotation: rowToAnnotation(updated),
    };
  } catch (error) {
    console.error("[updateAnnotation] Failed to update annotation:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update annotation",
    };
  }
}

// ============================================================================
// Comments
// ============================================================================

/**
 * Add a comment to an annotation.
 * Comments support threading via parentId for replies.
 */
export async function addComment(
  input: AddCommentInput
): Promise<CommentResult> {
  try {
    const { tenantId, userId, userName } = await getCurrentUser();

    // Fetch existing annotation
    const existing = await withRetry(
      () =>
        database.boardAnnotation.findUnique({
          where: {
            tenantId_id: {
              tenantId,
              id: input.annotationId,
            },
          },
        }),
      { maxRetries: 1, delayMs: 2000 }
    );

    if (!existing) {
      return {
        success: false,
        error: "Annotation not found",
      };
    }

    // Create new comment
    const comment: AnnotationComment = {
      id: crypto.randomUUID(),
      annotationId: input.annotationId,
      authorId: userId,
      authorName: userName,
      authorAvatar: null, // TODO: Get from user profile
      content: input.content,
      mentions: input.mentions || extractMentions(input.content),
      parentId: input.parentId || null,
      createdAt: new Date(),
      updatedAt: new Date(),
      resolved: false,
    };

    // Add comment to metadata
    const metadata = (existing.metadata as Record<string, unknown>) || {};
    const comments = (metadata.comments as AnnotationComment[]) || [];
    comments.push(comment);

    await withRetry(
      () =>
        database.boardAnnotation.update({
          where: {
            tenantId_id: {
              tenantId,
              id: input.annotationId,
            },
          },
          data: {
            metadata: {
              ...metadata,
              comments,
            },
          },
        }),
      { maxRetries: 1, delayMs: 2000 }
    );

    revalidatePath(`/command-board/${existing.boardId}`);

    return {
      success: true,
      comment,
    };
  } catch (error) {
    console.error("[addComment] Failed to add comment:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to add comment",
    };
  }
}

/**
 * Update an existing comment.
 */
export async function updateComment(
  input: UpdateCommentInput
): Promise<CommentResult> {
  try {
    const tenantId = await requireTenantId();

    // Fetch annotation containing the comment
    const existing = await withRetry(
      () =>
        database.boardAnnotation.findFirst({
          where: {
            tenantId,
            "metadata.comments": {
              some: { id: input.commentId },
            } as unknown, // Prisma JSON query
          },
        }),
      { maxRetries: 1, delayMs: 2000 }
    );

    if (!existing) {
      return {
        success: false,
        error: "Comment not found",
      };
    }

    const metadata = (existing.metadata as Record<string, unknown>) || {};
    const comments = (metadata.comments as AnnotationComment[]) || [];

    // Find and update the comment
    const commentIndex = comments.findIndex((c) => c.id === input.commentId);
    if (commentIndex === -1) {
      return {
        success: false,
        error: "Comment not found",
      };
    }

    const updatedComment = {
      ...comments[commentIndex],
      content: input.content,
      mentions: input.mentions || extractMentions(input.content),
      updatedAt: new Date(),
      resolved: input.resolved ?? comments[commentIndex].resolved,
    };

    comments[commentIndex] = updatedComment;

    await withRetry(
      () =>
        database.boardAnnotation.update({
          where: {
            tenantId_id: {
              tenantId,
              id: existing.id,
            },
          },
          data: {
            metadata: {
              ...metadata,
              comments,
            },
          },
        }),
      { maxRetries: 1, delayMs: 2000 }
    );

    revalidatePath(`/command-board/${existing.boardId}`);

    return {
      success: true,
      comment: updatedComment,
    };
  } catch (error) {
    console.error("[updateComment] Failed to update comment:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update comment",
    };
  }
}

/**
 * Delete a comment from an annotation.
 */
export async function deleteComment(
  commentId: string,
  annotationId: string
): Promise<DeleteResult> {
  try {
    const tenantId = await requireTenantId();

    // Fetch annotation
    const existing = await withRetry(
      () =>
        database.boardAnnotation.findUnique({
          where: {
            tenantId_id: {
              tenantId,
              id: annotationId,
            },
          },
        }),
      { maxRetries: 1, delayMs: 2000 }
    );

    if (!existing) {
      return {
        success: false,
        error: "Annotation not found",
      };
    }

    const metadata = (existing.metadata as Record<string, unknown>) || {};
    const comments = (metadata.comments as AnnotationComment[]) || [];

    // Filter out the comment
    const filteredComments = comments.filter((c) => c.id !== commentId);

    // If comment wasn't found, still consider it a success (idempotent)
    await withRetry(
      () =>
        database.boardAnnotation.update({
          where: {
            tenantId_id: {
              tenantId,
              id: annotationId,
            },
          },
          data: {
            metadata: {
              ...metadata,
              comments: filteredComments,
            },
          },
        }),
      { maxRetries: 1, delayMs: 2000 }
    );

    revalidatePath(`/command-board/${existing.boardId}`);

    return { success: true };
  } catch (error) {
    console.error("[deleteComment] Failed to delete comment:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to delete comment",
    };
  }
}

// ============================================================================
// Delete Annotations
// ============================================================================

/**
 * Delete an annotation (soft delete).
 */
export async function deleteAnnotation(
  annotationId: string
): Promise<DeleteResult> {
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
