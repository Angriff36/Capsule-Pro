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
// Export implementation
export { createEntityGraph, InMemoryEntityGraph } from "./entity-graph.js";
// Export factory functions
export { createEdge, createInstanceNode, createPath, createTypeNode, edgeId, extendPath, } from "./factories.js";
// Export builder functions
export { buildGraphFromKnownRelationships, getIncomingRelationships, getKnownRelationships, getOutgoingRelationships, getRelationshipsForEntity, } from "./graph-builder.js";
// Export query functions
export { analyzeDeletionImpact, analyzeModificationImpact, findCircularDependencies, findCriticalPaths, findEntityGroups, findReachableEntities, getConnectionInfo, getDependencyChain, getDependents, getEntitySummary, groupByRelationshipType, } from "./graph-queries.js";
// Export enums
export { Direction, RelationshipType, TraversalDirection } from "./types.js";
