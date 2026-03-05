import type { Node } from "@xyflow/react";
import type { BoardAnnotation } from "../types/board";

// ============================================================================
// Annotation to Node Converter
// ============================================================================

/**
 * Convert a BoardAnnotation to a React Flow Node.
 * Handles different annotation types (note, label, highlight, region).
 */
export function annotationToNode(
  annotation: BoardAnnotation,
  callbacks: {
    onUpdate?: (
      annotationId: string,
      updates: Partial<BoardAnnotation>
    ) => void;
    onDelete?: (annotationId: string) => void;
    onAddComment?: (annotationId: string, content: string) => void;
    onToggleResolve?: (annotationId: string) => void;
  }
): Node | null {
  const position = annotation.position
    ? { x: annotation.position.x, y: annotation.position.y }
    : { x: 0, y: 0 };

  switch (annotation.annotationType) {
    case "note":
      return {
        id: `annotation-note-${annotation.id}`,
        type: "note",
        position,
        data: {
          annotation,
          ...callbacks,
        } as Record<string, unknown>,
        style: {
          width: annotation.position?.width || 200,
        },
      };

    case "region":
      // Regions are rendered as background rectangles
      return {
        id: `annotation-region-${annotation.id}`,
        type: "default",
        position,
        data: {
          label: annotation.label || "",
        },
        style: {
          width: annotation.position?.width || 400,
          height: annotation.position?.height || 300,
          backgroundColor: annotation.color || "rgba(59, 130, 246, 0.1)",
          border: `2px dashed ${annotation.color || "#3b82f6"}`,
          borderRadius: "8px",
          zIndex: -1, // Behind other nodes
        },
        className: "pointer-events-none", // Let clicks pass through
      };

    case "label":
    case "highlight":
      // These are rendered as part of the projection node, not separate nodes
      return null;

    default:
      return null;
  }
}

/**
 * Convert all annotations on a board to React Flow nodes.
 */
export function annotationsToNodes(
  annotations: BoardAnnotation[],
  callbacks: {
    onUpdate?: (
      annotationId: string,
      updates: Partial<BoardAnnotation>
    ) => void;
    onDelete?: (annotationId: string) => void;
    onAddComment?: (annotationId: string, content: string) => void;
    onToggleResolve?: (annotationId: string) => void;
  }
): Node[] {
  return annotations
    .map((annotation) => annotationToNode(annotation, callbacks))
    .filter((node): node is Node => node !== null);
}

// ============================================================================
// Annotation Metadata Helpers
// ============================================================================

/**
 * Check if an annotation has comments.
 */
export function annotationHasComments(annotation: BoardAnnotation): boolean {
  return (annotation.comments?.length ?? 0) > 0;
}

/**
 * Get unresolved comment count for an annotation.
 */
export function getUnresolvedCommentCount(annotation: BoardAnnotation): number {
  return annotation.comments?.filter((c) => !c.resolved).length ?? 0;
}

/**
 * Check if an annotation is resolved.
 */
export function isAnnotationResolved(annotation: BoardAnnotation): boolean {
  return annotation.resolved ?? false;
}

/**
 * Get all mentions from an annotation's content and comments.
 */
export function getAllMentions(annotation: BoardAnnotation): string[] {
  const mentions = new Set<string>();

  // From content (parse @mentions)
  if (annotation.content) {
    const mentionRegex = /@(\w+)/g;
    let match;
    while ((match = mentionRegex.exec(annotation.content)) !== null) {
      mentions.add(match[1]);
    }
  }

  // From comments
  annotation.comments?.forEach((comment) => {
    comment.mentions?.forEach((mention) => {
      mentions.add(mention.userName);
    });
  });

  return Array.from(mentions);
}

// ============================================================================
// Annotation to Node Converter
// ============================================================================

/**
 * Convert a BoardAnnotation to a React Flow Node.
 * Handles different annotation types (note, label, highlight, region).
 */
export function annotationToNode(
  annotation: BoardAnnotation,
  callbacks: {
    onUpdate?: (
      annotationId: string,
      updates: Partial<BoardAnnotation>
    ) => void;
    onDelete?: (annotationId: string) => void;
    onAddComment?: (annotationId: string, content: string) => void;
    onToggleResolve?: (annotationId: string) => void;
  }
): Node | null {
  const position = annotation.position
    ? { x: annotation.position.x, y: annotation.position.y }
    : { x: 0, y: 0 };

  switch (annotation.annotationType) {
    case "note":
      return {
        id: `annotation-note-${annotation.id}`,
        type: "note",
        position,
        data: {
          annotation,
          ...callbacks,
        },
        style: {
          width: annotation.position?.width || 200,
        },
      } as NoteNode;

    case "region":
      // Regions are rendered as background rectangles
      return {
        id: `annotation-region-${annotation.id}`,
        type: "default",
        position,
        data: {
          label: annotation.label || "",
        },
        style: {
          width: annotation.position?.width || 400,
          height: annotation.position?.height || 300,
          backgroundColor: annotation.color || "rgba(59, 130, 246, 0.1)",
          border: `2px dashed ${annotation.color || "#3b82f6"}`,
          borderRadius: "8px",
          zIndex: -1, // Behind other nodes
        },
        className: "pointer-events-none", // Let clicks pass through
      };

    case "label":
    case "highlight":
      // These are rendered as part of the projection node, not separate nodes
      return null;

    default:
      return null;
  }
}

/**
 * Convert all annotations on a board to React Flow nodes.
 */
export function annotationsToNodes(
  annotations: BoardAnnotation[],
  callbacks: {
    onUpdate?: (
      annotationId: string,
      updates: Partial<BoardAnnotation>
    ) => void;
    onDelete?: (annotationId: string) => void;
    onAddComment?: (annotationId: string, content: string) => void;
    onToggleResolve?: (annotationId: string) => void;
  }
): Node[] {
  return annotations
    .map((annotation) => annotationToNode(annotation, callbacks))
    .filter((node): node is Node => node !== null);
}

// ============================================================================
// Annotation Metadata Helpers
// ============================================================================

/**
 * Check if an annotation has comments.
 */
export function annotationHasComments(annotation: BoardAnnotation): boolean {
  return (annotation.comments?.length ?? 0) > 0;
}

/**
 * Get unresolved comment count for an annotation.
 */
export function getUnresolvedCommentCount(annotation: BoardAnnotation): number {
  return annotation.comments?.filter((c) => !c.resolved).length ?? 0;
}

/**
 * Check if an annotation is resolved.
 */
export function isAnnotationResolved(annotation: BoardAnnotation): boolean {
  return annotation.resolved ?? false;
}

/**
 * Get all mentions from an annotation's content and comments.
 */
export function getAllMentions(annotation: BoardAnnotation): string[] {
  const mentions = new Set<string>();

  // From content (parse @mentions)
  if (annotation.content) {
    const mentionRegex = /@(\w+)/g;
    let match;
    while ((match = mentionRegex.exec(annotation.content)) !== null) {
      mentions.add(match[1]);
    }
  }

  // From comments
  annotation.comments?.forEach((comment) => {
    comment.mentions?.forEach((mention) => {
      mentions.add(mention.userName);
    });
  });

  return Array.from(mentions);
}
