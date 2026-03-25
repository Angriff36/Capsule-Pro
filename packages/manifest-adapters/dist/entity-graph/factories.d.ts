/**
 * Entity Graph Factory Functions
 *
 * Helper functions for creating graph nodes, edges, and paths.
 * Separated to avoid circular dependencies.
 */
import type { GraphEdge, GraphNode, GraphPath, RelationshipType } from "./types.js";
/**
 * Create a type node for an entity schema.
 */
export declare function createTypeNode(entityName: string, label?: string): GraphNode;
/**
 * Create an instance node for a specific entity instance.
 */
export declare function createInstanceNode(entityName: string, instanceId: string, label?: string): GraphNode;
/**
 * Create an edge ID from source and target.
 */
export declare function edgeId(sourceId: string, targetId: string, name: string): string;
/**
 * Create a graph edge.
 */
export declare function createEdge(sourceId: string, targetId: string, type: RelationshipType, name: string, options?: {
    required?: boolean;
    cardinality?: string;
    metadata?: Record<string, unknown>;
}): GraphEdge;
/**
 * Create an empty path starting at a node.
 */
export declare function createPath(startNode: GraphNode): GraphPath;
/**
 * Extend a path with a new node and edge.
 */
export declare function extendPath(path: GraphPath, node: GraphNode, edge: GraphEdge): GraphPath;
//# sourceMappingURL=factories.d.ts.map