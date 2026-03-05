/**
 * Graph Queries
 *
 * High-level query utilities for the entity graph.
 * Provides convenience methods for common queries and impact analysis.
 */

import type {
  EntityGraph,
  GraphNode,
  GraphPath,
  ImpactAnalysisResult,
  RelationshipType,
} from "./types.js";
import { TraversalDirection } from "./types.js";

// ---------------------------------------------------------------------------
// Query Result Types
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Dependency Queries
// ---------------------------------------------------------------------------

/**
 * Get the dependency chain for an entity.
 *
 * Returns all downstream entities that the given entity depends on,
 * organized by dependency depth.
 */
export function getDependencyChain(
  graph: EntityGraph,
  entityName: string,
  options: { maxDepth?: number } = {}
): DependencyChain[] {
  const node = graph
    .getNodesByEntity(entityName)
    .find((n) => n.kind === "type");
  if (!node) return [];

  const maxDepth = options.maxDepth ?? 5;
  const result: DependencyChain[] = [];

  // BFS to find all dependencies
  const visited = new Set<string>([node.id]);
  const queue: Array<{
    nodeId: string;
    chain: string[];
    types: RelationshipType[];
    hasRequired: boolean;
  }> = [
    { nodeId: node.id, chain: [entityName], types: [], hasRequired: false },
  ];

  while (queue.length > 0) {
    const { nodeId, chain, types, hasRequired } = queue.shift()!;

    if (chain.length > maxDepth) continue;

    for (const edge of graph.getOutgoingEdges(nodeId)) {
      if (visited.has(edge.targetId)) continue;
      visited.add(edge.targetId);

      const targetNode = graph.getNode(edge.targetId);
      if (!targetNode || targetNode.kind !== "type") continue;

      const newChain = [...chain, targetNode.entityName];
      const newTypes = [...types, edge.type];
      const newHasRequired = hasRequired || edge.required;

      result.push({
        chain: newChain,
        relationshipTypes: newTypes,
        hasRequiredLink: newHasRequired,
      });

      queue.push({
        nodeId: edge.targetId,
        chain: newChain,
        types: newTypes,
        hasRequired: newHasRequired,
      });
    }
  }

  return result;
}

/**
 * Get all entities that depend on the given entity.
 *
 * Returns all upstream entities that would be affected by changes
 * to the given entity.
 */
export function getDependents(
  graph: EntityGraph,
  entityName: string,
  options: { maxDepth?: number } = {}
): GraphNode[] {
  const node = graph
    .getNodesByEntity(entityName)
    .find((n) => n.kind === "type");
  if (!node) return [];

  const maxDepth = options.maxDepth ?? 5;
  const result = new Set<GraphNode>();

  const visited = new Set<string>();
  const queue: Array<{ nodeId: string; depth: number }> = [
    { nodeId: node.id, depth: 0 },
  ];

  while (queue.length > 0) {
    const { nodeId, depth } = queue.shift()!;

    if (depth >= maxDepth) continue;

    for (const edge of graph.getIncomingEdges(nodeId)) {
      if (visited.has(edge.sourceId)) continue;
      visited.add(edge.sourceId);

      const sourceNode = graph.getNode(edge.sourceId);
      if (sourceNode) {
        result.add(sourceNode);
        queue.push({ nodeId: edge.sourceId, depth: depth + 1 });
      }
    }
  }

  return Array.from(result);
}

/**
 * Find circular dependencies in the graph.
 */
export function findCircularDependencies(graph: EntityGraph): GraphPath[] {
  return graph.detectCycles();
}

// ---------------------------------------------------------------------------
// Connection Queries
// ---------------------------------------------------------------------------

/**
 * Check if two entities are connected and return connection information.
 */
export function getConnectionInfo(
  graph: EntityGraph,
  fromEntity: string,
  toEntity: string,
  options: { maxDepth?: number } = {}
): ConnectionInfo {
  const fromNode = graph
    .getNodesByEntity(fromEntity)
    .find((n) => n.kind === "type");
  const toNode = graph
    .getNodesByEntity(toEntity)
    .find((n) => n.kind === "type");

  if (!(fromNode && toNode)) {
    return { connected: false, allPaths: [], distance: -1 };
  }

  const shortestPath = graph.findShortestPath(fromNode.id, toNode.id);
  const connected = shortestPath !== undefined;

  if (!connected) {
    return { connected: false, allPaths: [], distance: -1 };
  }

  const maxDepth = options.maxDepth ?? 10;
  const allPaths = graph.findAllPaths(fromNode.id, toNode.id, { maxDepth });

  return {
    connected: true,
    shortestPath,
    allPaths,
    distance: shortestPath.edges.length,
  };
}

/**
 * Find all entities reachable from a given entity.
 */
export function findReachableEntities(
  graph: EntityGraph,
  entityName: string,
  options: {
    maxDepth?: number;
    direction?: TraversalDirection;
  } = {}
): Set<string> {
  const node = graph
    .getNodesByEntity(entityName)
    .find((n) => n.kind === "type");
  if (!node) return new Set();

  const result = new Set<string>();
  const maxDepth = options.maxDepth ?? 5;
  const direction = options.direction ?? TraversalDirection.Downstream;

  const visited = new Set<string>();
  const queue: Array<{ nodeId: string; depth: number }> = [
    { nodeId: node.id, depth: 0 },
  ];

  while (queue.length > 0) {
    const { nodeId, depth } = queue.shift()!;
    if (depth >= maxDepth) continue;

    const edges =
      direction === TraversalDirection.Downstream
        ? graph.getOutgoingEdges(nodeId)
        : graph.getIncomingEdges(nodeId);

    for (const edge of edges) {
      const targetId =
        direction === TraversalDirection.Downstream
          ? edge.targetId
          : edge.sourceId;

      if (visited.has(targetId)) continue;
      visited.add(targetId);

      const targetNode = graph.getNode(targetId);
      if (targetNode && targetNode.kind === "type") {
        result.add(targetNode.entityName);
        queue.push({ nodeId: targetId, depth: depth + 1 });
      }
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Critical Path Analysis
// ---------------------------------------------------------------------------

/**
 * Find critical paths through the graph.
 *
 * Critical paths are those that contain required relationships.
 * Bottlenecks are entities that appear on multiple critical paths.
 */
export function findCriticalPaths(
  graph: EntityGraph,
  startEntity: string,
  endEntity: string
): CriticalPathResult {
  const startNode = graph
    .getNodesByEntity(startEntity)
    .find((n) => n.kind === "type");
  const endNode = graph
    .getNodesByEntity(endEntity)
    .find((n) => n.kind === "type");

  if (!(startNode && endNode)) {
    return { criticalPaths: [], criticalEntities: new Set(), bottlenecks: [] };
  }

  const allPaths = graph.findAllPaths(startNode.id, endNode.id);

  // Filter for critical paths (those with at least one required edge)
  const criticalPaths = allPaths.filter((path) =>
    path.edges.some((e) => e.required)
  );

  // Collect entities on critical paths
  const criticalEntities = new Set<string>();
  for (const path of criticalPaths) {
    for (const node of path.nodes) {
      if (node.kind === "type") {
        criticalEntities.add(node.entityName);
      }
    }
  }

  // Find bottlenecks (entities on multiple critical paths)
  const entityCounts = new Map<string, number>();
  for (const path of criticalPaths) {
    for (const node of path.nodes) {
      if (node.kind === "type") {
        const count = entityCounts.get(node.entityName) ?? 0;
        entityCounts.set(node.entityName, count + 1);
      }
    }
  }

  // Bottlenecks are entities appearing on more than one path
  const bottlenecks = Array.from(entityCounts.entries())
    .filter(([_, count]) => count > 1)
    .map(([name, _]) => name)
    .sort((a, b) => (entityCounts.get(b) ?? 0) - (entityCounts.get(a) ?? 0));

  return {
    criticalPaths,
    criticalEntities,
    bottlenecks,
  };
}

// ---------------------------------------------------------------------------
// Impact Analysis Helpers
// ---------------------------------------------------------------------------

/**
 * Analyze the impact of deleting an entity.
 */
export function analyzeDeletionImpact(
  graph: EntityGraph,
  entityName: string
): ImpactAnalysisResult {
  const node = graph
    .getNodesByEntity(entityName)
    .find((n) => n.kind === "type");
  if (!node) {
    return {
      source: { id: "", entityName, kind: "type" },
      directImpact: [],
      transitiveImpact: [],
      impactPaths: new Map(),
      severity: "low",
    };
  }

  // For deletion impact, we look at upstream dependencies (things that depend on us)
  // But also check downstream for composition relationships
  const analysis = graph.analyzeImpact(node.id, {
    maxDepth: 5,
    relationshipTypes: [
      RelationshipType.Composition,
      RelationshipType.Hierarchy,
    ],
  });

  return analysis;
}

/**
 * Analyze the impact of modifying an entity property.
 */
export function analyzeModificationImpact(
  graph: EntityGraph,
  entityName: string
): ImpactAnalysisResult {
  const node = graph
    .getNodesByEntity(entityName)
    .find((n) => n.kind === "type");
  if (!node) {
    return {
      source: { id: "", entityName, kind: "type" },
      directImpact: [],
      transitiveImpact: [],
      impactPaths: new Map(),
      severity: "low",
    };
  }

  // For modification impact, we look at downstream dependencies
  // Include references and dependencies
  const related = graph.findRelated({
    from: node.id,
    direction: TraversalDirection.Upstream,
    maxDepth: 3,
    types: [
      RelationshipType.Reference,
      RelationshipType.Dependency,
      RelationshipType.Aggregation,
    ],
  });

  return {
    source: node,
    directImpact: related.nodes.filter((n) => {
      const path = related.paths.get(n.id)?.[0];
      return path && path.weight === 1;
    }),
    transitiveImpact: related.nodes.filter((n) => {
      const path = related.paths.get(n.id)?.[0];
      return path && path.weight > 1;
    }),
    impactPaths: related.paths,
    severity:
      related.nodes.length > 10
        ? "high"
        : related.nodes.length > 3
          ? "medium"
          : "low",
  };
}

// ---------------------------------------------------------------------------
// Entity Grouping
// ---------------------------------------------------------------------------

/**
 * Find strongly connected components in the graph.
 *
 * Returns groups of entities that are mutually reachable.
 */
export function findEntityGroups(graph: EntityGraph): Set<string>[] {
  const visited = new Set<string>();
  const groups: Set<string>[] = [];

  const nodes = graph.getNodes().filter((n) => n.kind === "type");

  for (const node of nodes) {
    if (visited.has(node.id)) continue;

    const group = new Set<string>();
    const stack = [node.id];

    while (stack.length > 0) {
      const nodeId = stack.pop()!;
      if (visited.has(nodeId)) continue;
      visited.add(nodeId);
      group.add(nodeId);

      // Add neighbors
      for (const edge of graph.getOutgoingEdges(nodeId)) {
        if (!visited.has(edge.targetId)) {
          stack.push(edge.targetId);
        }
      }
      for (const edge of graph.getIncomingEdges(nodeId)) {
        if (!visited.has(edge.sourceId)) {
          stack.push(edge.sourceId);
        }
      }
    }

    if (group.size > 0) {
      groups.push(group);
    }
  }

  return groups;
}

/**
 * Group entities by their relationship types.
 *
 * Returns a map of relationship types to the entities that participate
 * in that type of relationship.
 */
export function groupByRelationshipType(
  graph: EntityGraph
): Map<RelationshipType, Set<string>> {
  const groups = new Map<RelationshipType, Set<string>>();

  for (const edge of graph.getEdges()) {
    if (!groups.has(edge.type)) {
      groups.set(edge.type, new Set());
    }

    const sourceNode = graph.getNode(edge.sourceId);
    const targetNode = graph.getNode(edge.targetId);

    if (sourceNode?.kind === "type") {
      groups.get(edge.type)?.add(sourceNode.entityName);
    }
    if (targetNode?.kind === "type") {
      groups.get(edge.type)?.add(targetNode.entityName);
    }
  }

  return groups;
}

// ---------------------------------------------------------------------------
// Entity Relationship Summary
// ---------------------------------------------------------------------------

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
export function getEntitySummary(
  graph: EntityGraph,
  entityName: string
): EntityRelationshipSummary | undefined {
  const node = graph
    .getNodesByEntity(entityName)
    .find((n) => n.kind === "type");
  if (!node) return undefined;

  const dependencies = new Set<string>();
  const dependents = new Set<string>();
  const related = new Set<string>();

  for (const edge of graph.getOutgoingEdges(node.id)) {
    const targetNode = graph.getNode(edge.targetId);
    if (targetNode?.kind === "type") {
      dependencies.add(targetNode.entityName);
      related.add(targetNode.entityName);
    }
  }

  for (const edge of graph.getIncomingEdges(node.id)) {
    const sourceNode = graph.getNode(edge.sourceId);
    if (sourceNode?.kind === "type") {
      dependents.add(sourceNode.entityName);
      related.add(sourceNode.entityName);
    }
  }

  return {
    entityName,
    dependencies: Array.from(dependencies).sort(),
    dependents: Array.from(dependents).sort(),
    related: Array.from(related).sort(),
    degree: graph.getDegree(node.id),
  };
}
