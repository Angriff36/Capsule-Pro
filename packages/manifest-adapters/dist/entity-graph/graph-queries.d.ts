/**
 * Graph Queries
 *
 * High-level query utilities for the entity graph.
 * Provides convenience methods for common queries and impact analysis.
 */
import type { EntityGraph, GraphNode, GraphPath, ImpactAnalysisResult, RelationshipType } from "./types.js";
import { TraversalDirection } from "./types.js";
/**
 * Result of a dependency chain query.
 */
export interface DependencyChain {
    /** The chain of entities */
    chain: string[];
    /** The relationship types along the chain */
    relationshipTypes: RelationshipType[];
    /** Whether any link in the chain is required */
    hasRequiredLink: boolean;
}
/**
 * Result of a critical path analysis.
 */
export interface CriticalPathResult {
    /** Paths that are critical (contain required relationships) */
    criticalPaths: GraphPath[];
    /** Entities on critical paths */
    criticalEntities: Set<string>;
    /** Bottleneck entities (on multiple critical paths) */
    bottlenecks: string[];
}
/**
 * Connection information between two entities.
 */
export interface ConnectionInfo {
    /** Whether the entities are connected */
    connected: boolean;
    /** Shortest path between entities */
    shortestPath?: GraphPath;
    /** All paths between entities */
    allPaths: GraphPath[];
    /** Distance (number of edges) */
    distance: number;
}
/**
 * Get the dependency chain for an entity.
 *
 * Returns all downstream entities that the given entity depends on,
 * organized by dependency depth.
 */
export declare function getDependencyChain(graph: EntityGraph, entityName: string, options?: {
    maxDepth?: number;
}): DependencyChain[];
/**
 * Get all entities that depend on the given entity.
 *
 * Returns all upstream entities that would be affected by changes
 * to the given entity.
 */
export declare function getDependents(graph: EntityGraph, entityName: string, options?: {
    maxDepth?: number;
}): GraphNode[];
/**
 * Find circular dependencies in the graph.
 */
export declare function findCircularDependencies(graph: EntityGraph): GraphPath[];
/**
 * Check if two entities are connected and return connection information.
 */
export declare function getConnectionInfo(graph: EntityGraph, fromEntity: string, toEntity: string, options?: {
    maxDepth?: number;
}): ConnectionInfo;
/**
 * Find all entities reachable from a given entity.
 */
export declare function findReachableEntities(graph: EntityGraph, entityName: string, options?: {
    maxDepth?: number;
    direction?: TraversalDirection;
}): Set<string>;
/**
 * Find critical paths through the graph.
 *
 * Critical paths are those that contain required relationships.
 * Bottlenecks are entities that appear on multiple critical paths.
 */
export declare function findCriticalPaths(graph: EntityGraph, startEntity: string, endEntity: string): CriticalPathResult;
/**
 * Analyze the impact of deleting an entity.
 */
export declare function analyzeDeletionImpact(graph: EntityGraph, entityName: string): ImpactAnalysisResult;
/**
 * Analyze the impact of modifying an entity property.
 */
export declare function analyzeModificationImpact(graph: EntityGraph, entityName: string): ImpactAnalysisResult;
/**
 * Find strongly connected components in the graph.
 *
 * Returns groups of entities that are mutually reachable.
 */
export declare function findEntityGroups(graph: EntityGraph): Set<string>[];
/**
 * Group entities by their relationship types.
 *
 * Returns a map of relationship types to the entities that participate
 * in that type of relationship.
 */
export declare function groupByRelationshipType(graph: EntityGraph): Map<RelationshipType, Set<string>>;
/**
 * Get a summary of relationships for an entity.
 */
export interface EntityRelationshipSummary {
    /** The entity name */
    entityName: string;
    /** Direct dependencies (what this entity depends on) */
    dependencies: string[];
    /** Direct dependents (what depends on this entity) */
    dependents: string[];
    /** Related entities via any relationship */
    related: string[];
    /** Total number of relationships */
    degree: number;
}
/**
 * Get a relationship summary for an entity.
 */
export declare function getEntitySummary(graph: EntityGraph, entityName: string): EntityRelationshipSummary | undefined;
//# sourceMappingURL=graph-queries.d.ts.map