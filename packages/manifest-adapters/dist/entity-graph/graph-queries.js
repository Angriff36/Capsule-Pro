/**
 * Graph Queries
 *
 * High-level query utilities for the entity graph.
 * Provides convenience methods for common queries and impact analysis.
 */
import { RelationshipType, TraversalDirection } from "./types.js";
// ---------------------------------------------------------------------------
// Dependency Queries
// ---------------------------------------------------------------------------
/**
 * Get the dependency chain for an entity.
 *
 * Returns all downstream entities that the given entity depends on,
 * organized by dependency depth.
 */
export function getDependencyChain(graph, entityName, options = {}) {
    const node = graph
        .getNodesByEntity(entityName)
        .find((n) => n.kind === "type");
    if (!node)
        return [];
    const maxDepth = options.maxDepth ?? 5;
    const result = [];
    // BFS to find all dependencies
    const visited = new Set([node.id]);
    const queue = [
        { nodeId: node.id, chain: [entityName], types: [], hasRequired: false },
    ];
    while (queue.length > 0) {
        const { nodeId, chain, types, hasRequired } = queue.shift();
        if (chain.length > maxDepth)
            continue;
        for (const edge of graph.getOutgoingEdges(nodeId)) {
            if (visited.has(edge.targetId))
                continue;
            visited.add(edge.targetId);
            const targetNode = graph.getNode(edge.targetId);
            if (!targetNode || targetNode.kind !== "type")
                continue;
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
export function getDependents(graph, entityName, options = {}) {
    const node = graph
        .getNodesByEntity(entityName)
        .find((n) => n.kind === "type");
    if (!node)
        return [];
    const maxDepth = options.maxDepth ?? 5;
    const result = new Set();
    const visited = new Set();
    const queue = [
        { nodeId: node.id, depth: 0 },
    ];
    while (queue.length > 0) {
        const { nodeId, depth } = queue.shift();
        if (depth >= maxDepth)
            continue;
        for (const edge of graph.getIncomingEdges(nodeId)) {
            if (visited.has(edge.sourceId))
                continue;
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
export function findCircularDependencies(graph) {
    return graph.detectCycles();
}
// ---------------------------------------------------------------------------
// Connection Queries
// ---------------------------------------------------------------------------
/**
 * Check if two entities are connected and return connection information.
 */
export function getConnectionInfo(graph, fromEntity, toEntity, options = {}) {
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
export function findReachableEntities(graph, entityName, options = {}) {
    const node = graph
        .getNodesByEntity(entityName)
        .find((n) => n.kind === "type");
    if (!node)
        return new Set();
    const result = new Set();
    const maxDepth = options.maxDepth ?? 5;
    const direction = options.direction ?? TraversalDirection.Downstream;
    const visited = new Set();
    const queue = [
        { nodeId: node.id, depth: 0 },
    ];
    while (queue.length > 0) {
        const { nodeId, depth } = queue.shift();
        if (depth >= maxDepth)
            continue;
        const edges = direction === TraversalDirection.Downstream
            ? graph.getOutgoingEdges(nodeId)
            : graph.getIncomingEdges(nodeId);
        for (const edge of edges) {
            const targetId = direction === TraversalDirection.Downstream
                ? edge.targetId
                : edge.sourceId;
            if (visited.has(targetId))
                continue;
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
export function findCriticalPaths(graph, startEntity, endEntity) {
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
    const criticalPaths = allPaths.filter((path) => path.edges.some((e) => e.required));
    // Collect entities on critical paths
    const criticalEntities = new Set();
    for (const path of criticalPaths) {
        for (const node of path.nodes) {
            if (node.kind === "type") {
                criticalEntities.add(node.entityName);
            }
        }
    }
    // Find bottlenecks (entities on multiple critical paths)
    const entityCounts = new Map();
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
export function analyzeDeletionImpact(graph, entityName) {
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
export function analyzeModificationImpact(graph, entityName) {
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
        severity: related.nodes.length > 10
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
export function findEntityGroups(graph) {
    const visited = new Set();
    const groups = [];
    const nodes = graph.getNodes().filter((n) => n.kind === "type");
    for (const node of nodes) {
        if (visited.has(node.id))
            continue;
        const group = new Set();
        const stack = [node.id];
        while (stack.length > 0) {
            const nodeId = stack.pop();
            if (visited.has(nodeId))
                continue;
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
export function groupByRelationshipType(graph) {
    const groups = new Map();
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
/**
 * Get a relationship summary for an entity.
 */
export function getEntitySummary(graph, entityName) {
    const node = graph
        .getNodesByEntity(entityName)
        .find((n) => n.kind === "type");
    if (!node)
        return undefined;
    const dependencies = new Set();
    const dependents = new Set();
    const related = new Set();
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
