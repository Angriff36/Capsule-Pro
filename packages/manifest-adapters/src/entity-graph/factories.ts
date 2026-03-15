/**
 * Entity Graph Factory Functions
 *
 * Helper functions for creating graph nodes, edges, and paths.
 * Separated to avoid circular dependencies.
 */

import type {
  GraphEdge,
  GraphNode,
  GraphPath,
  RelationshipType,
} from "./types.js";

/**
 * Create a type node for an entity schema.
 */
export function createTypeNode(entityName: string, label?: string): GraphNode {
  return {
    id: `type:${entityName}`,
    entityName,
    kind: "type",
    label: label ?? entityName,
  };
}

/**
 * Create an instance node for a specific entity instance.
 */
export function createInstanceNode(
  entityName: string,
  instanceId: string,
  label?: string
): GraphNode {
  return {
    id: `${entityName}:${instanceId}`,
    entityName,
    kind: "instance",
    label: label ?? `${entityName}:${instanceId}`,
  };
}

/**
 * Create an edge ID from source and target.
 */
export function edgeId(
  sourceId: string,
  targetId: string,
  name: string
): string {
  return `${sourceId}:${name}:${targetId}`;
}

/**
 * Create a graph edge.
 */
export function createEdge(
  sourceId: string,
  targetId: string,
  type: RelationshipType,
  name: string,
  options: {
    required?: boolean;
    cardinality?: string;
    metadata?: Record<string, unknown>;
  } = {}
): GraphEdge {
  return {
    id: edgeId(sourceId, targetId, name),
    sourceId,
    targetId,
    type,
    name,
    required: options.required ?? false,
    cardinality: options.cardinality ?? "1:N",
    metadata: options.metadata,
  };
}

/**
 * Create an empty path starting at a node.
 */
export function createPath(startNode: GraphNode): GraphPath {
  return {
    nodes: [startNode],
    edges: [],
    weight: 0,
  };
}

/**
 * Extend a path with a new node and edge.
 */
export function extendPath(
  path: GraphPath,
  node: GraphNode,
  edge: GraphEdge
): GraphPath {
  return {
    nodes: [...path.nodes, node],
    edges: [...path.edges, edge],
    weight: path.weight + 1,
  };
}
