// ============================================================================
// React Flow Types — Node and edge types for @xyflow/react integration
// ============================================================================

import type { Node, Edge } from "@xyflow/react";
import type { ResolvedEntity } from "./entities";
import type {
  BoardProjection,
  DerivedConnection,
  BoardAnnotation,
} from "./board";

// ============================================================================
// Node Data Types
// ============================================================================

/** Custom node data for entity projection nodes */
export interface ProjectionNodeData {
  [key: string]: unknown;
  projection: BoardProjection;
  entity: ResolvedEntity | null;
  /** True when entity data has not yet been resolved */
  stale: boolean;
  onOpenDetail: (entityType: string, entityId: string) => void;
  onRemove: (projectionId: string) => void;
}

/** Custom node data for group nodes */
export interface GroupNodeData {
  [key: string]: unknown;
  groupId: string;
  name: string;
  color: string | null;
  collapsed: boolean;
}

// ============================================================================
// Node Types
// ============================================================================

export type ProjectionNode = Node<ProjectionNodeData, "projection">;
export type GroupNode = Node<GroupNodeData, "group">;
export type BoardNode = ProjectionNode | GroupNode;

// ============================================================================
// Edge Data Types
// ============================================================================

/** Edge data for derived (automatic) connections */
export interface DerivedEdgeData {
  [key: string]: unknown;
  derived: true;
  relationshipType: string;
  label: string;
}

/** Edge data for manual annotation connections */
export interface AnnotationEdgeData {
  [key: string]: unknown;
  derived: false;
  annotationId: string;
  label: string | null;
  style: string | null;
}

export type BoardEdge = Edge<DerivedEdgeData | AnnotationEdgeData>;

// ============================================================================
// Converter Functions
// ============================================================================

/** Convert a BoardProjection + ResolvedEntity into a React Flow Node */
export function projectionToNode(
  projection: BoardProjection,
  entity: ResolvedEntity | null,
  callbacks: {
    onOpenDetail: (entityType: string, entityId: string) => void;
    onRemove: (projectionId: string) => void;
  },
): ProjectionNode {
  return {
    id: projection.id,
    type: "projection",
    position: { x: projection.positionX, y: projection.positionY },
    data: {
      projection,
      entity,
      stale: entity === null,
      onOpenDetail: callbacks.onOpenDetail,
      onRemove: callbacks.onRemove,
    },
    style: {
      width: projection.width,
      height: projection.height,
    },
    parentId: projection.groupId ?? undefined,
    zIndex: projection.zIndex,
  };
}

/** Convert a DerivedConnection into a React Flow Edge */
export function connectionToEdge(connection: DerivedConnection): BoardEdge {
  return {
    id: connection.id,
    source: connection.fromProjectionId,
    target: connection.toProjectionId,
    type: "smoothstep",
    animated: false,
    data: {
      derived: true,
      relationshipType: connection.relationshipType,
      label: connection.label,
    },
    label: connection.label,
    style: { stroke: "#9ca3af" },
  };
}

/** Convert a BoardAnnotation into a React Flow Edge (connection type only) */
export function annotationToEdge(
  annotation: BoardAnnotation,
): BoardEdge | null {
  if (annotation.annotationType !== "connection") return null;
  if (!annotation.fromProjectionId) return null;
  if (!annotation.toProjectionId) return null;

  return {
    id: `annotation-${annotation.id}`,
    source: annotation.fromProjectionId,
    target: annotation.toProjectionId,
    type: "smoothstep",
    animated: false,
    data: {
      derived: false,
      annotationId: annotation.id,
      label: annotation.label,
      style: annotation.style,
    },
    label: annotation.label ?? undefined,
    style: {
      stroke: annotation.color ?? "#9ca3af",
      strokeDasharray:
        annotation.style === "dashed"
          ? "5,5"
          : annotation.style === "dotted"
            ? "2,2"
            : undefined,
    },
  };
}
