/**
 * Entity Relationship Graph
 *
 * A unified graph data structure representing all entity relationships used for
 * derived connections, impact analysis, and dependency traversal across all modules.
 *
 * This module provides:
 * - GraphNode: Representation of an entity in the graph
 * - GraphEdge: Typed relationships between entities
 * - EntityGraph: The main graph structure with traversal and analysis capabilities
 * - RelationshipType: Enum of relationship types (composition, aggregation, reference, etc.)
 * - TraversalDirection: Direction for graph traversal (upstream, downstream, both)
 */
export { createEntityGraph, InMemoryEntityGraph } from "./entity-graph.js";
export { createEdge, createInstanceNode, createPath, createTypeNode, edgeId, extendPath, } from "./factories.js";
export { buildGraphFromKnownRelationships, getIncomingRelationships, getKnownRelationships, getOutgoingRelationships, getRelationshipsForEntity, type KnownRelationship, } from "./graph-builder.js";
export { analyzeDeletionImpact, analyzeModificationImpact, type ConnectionInfo, type CriticalPathResult, type DependencyChain, type EntityRelationshipSummary, findCircularDependencies, findCriticalPaths, findEntityGroups, findReachableEntities, getConnectionInfo, getDependencyChain, getDependents, getEntitySummary, groupByRelationshipType, } from "./graph-queries.js";
export type { EntityGraph, EntityGraphOptions, GraphEdge, GraphNode, GraphPath, ImpactAnalysisOptions, ImpactAnalysisResult, RelationshipQuery, RelationshipQueryResult, } from "./types.js";
export { Direction, RelationshipType, TraversalDirection } from "./types.js";
//# sourceMappingURL=index.d.ts.map