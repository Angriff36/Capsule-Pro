/**
 * Entity Graph Implementation
 *
 * In-memory implementation of the EntityGraph interface using adjacency lists
 * for efficient traversal and querying.
 */

import { createPath, extendPath } from "./factories.js";
import type {
  EntityGraph,
  GraphEdge,
  GraphNode,
  GraphPath,
  ImpactAnalysisOptions,
  ImpactAnalysisResult,
  RelationshipQuery,
  RelationshipQueryResult,
} from "./types.js";
import { TraversalDirection } from "./types.js";

/**
 * In-memory implementation of the entity graph.
 */
export class InMemoryEntityGraph implements EntityGraph {
  private nodes: Map<string, GraphNode> = new Map();
  private edges: Map<string, GraphEdge> = new Map();
  private adjacencyOut: Map<string, GraphEdge[]> = new Map();
  private adjacencyIn: Map<string, GraphEdge[]> = new Map();

  // ---------------------------------------------------------------------------
  // Graph Construction
  // ---------------------------------------------------------------------------

  addNode(node: GraphNode): void {
    this.nodes.set(node.id, node);
    // Initialize adjacency lists if not present
    if (!this.adjacencyOut.has(node.id)) {
      this.adjacencyOut.set(node.id, []);
    }
    if (!this.adjacencyIn.has(node.id)) {
      this.adjacencyIn.set(node.id, []);
    }
  }

  addEdge(edge: GraphEdge): void {
    this.edges.set(edge.id, edge);
    // Update adjacency lists
    const outEdges = this.adjacencyOut.get(edge.sourceId) ?? [];
    outEdges.push(edge);
    this.adjacencyOut.set(edge.sourceId, outEdges);

    const inEdges = this.adjacencyIn.get(edge.targetId) ?? [];
    inEdges.push(edge);
    this.adjacencyIn.set(edge.targetId, inEdges);
  }

  removeNode(nodeId: string): void {
    const node = this.nodes.get(nodeId);
    if (!node) return;

    // Remove all connected edges
    const outEdges = this.adjacencyOut.get(nodeId) ?? [];
    const inEdges = this.adjacencyIn.get(nodeId) ?? [];

    for (const edge of [...outEdges, ...inEdges]) {
      this.removeEdge(edge.id);
    }

    // Remove the node
    this.nodes.delete(nodeId);
    this.adjacencyOut.delete(nodeId);
    this.adjacencyIn.delete(nodeId);
  }

  removeEdge(edgeId: string): void {
    const edge = this.edges.get(edgeId);
    if (!edge) return;

    this.edges.delete(edgeId);

    // Remove from adjacency lists
    const outEdges = this.adjacencyOut.get(edge.sourceId) ?? [];
    const filteredOut = outEdges.filter((e) => e.id !== edgeId);
    this.adjacencyOut.set(edge.sourceId, filteredOut);

    const inEdges = this.adjacencyIn.get(edge.targetId) ?? [];
    const filteredIn = inEdges.filter((e) => e.id !== edgeId);
    this.adjacencyIn.set(edge.targetId, filteredIn);
  }

  // ---------------------------------------------------------------------------
  // Graph Queries
  // ---------------------------------------------------------------------------

  getNode(nodeId: string): GraphNode | undefined {
    return this.nodes.get(nodeId);
  }

  getNodes(): GraphNode[] {
    return Array.from(this.nodes.values());
  }

  getNodesByEntity(entityName: string): GraphNode[] {
    return Array.from(this.nodes.values()).filter(
      (n) => n.entityName === entityName
    );
  }

  getEdge(edgeId: string): GraphEdge | undefined {
    return this.edges.get(edgeId);
  }

  getEdges(): GraphEdge[] {
    return Array.from(this.edges.values());
  }

  getOutgoingEdges(nodeId: string): GraphEdge[] {
    return this.adjacencyOut.get(nodeId) ?? [];
  }

  getIncomingEdges(nodeId: string): GraphEdge[] {
    return this.adjacencyIn.get(nodeId) ?? [];
  }

  getConnectedEdges(nodeId: string): GraphEdge[] {
    return [
      ...(this.adjacencyOut.get(nodeId) ?? []),
      ...(this.adjacencyIn.get(nodeId) ?? []),
    ];
  }

  // ---------------------------------------------------------------------------
  // Traversal
  // ---------------------------------------------------------------------------

  findRelated(query: RelationshipQuery): RelationshipQueryResult {
    const startNode = this.getNode(query.from);
    if (!startNode) {
      return { nodes: [], edges: [], paths: new Map() };
    }

    const visited = new Set<string>([query.from]);
    const resultNodes: GraphNode[] = [];
    const resultEdges: GraphEdge[] = [];
    const paths = new Map<string, GraphPath[]>();
    const queue: Array<{ nodeId: string; path: GraphPath; depth: number }> = [
      { nodeId: query.from, path: createPath(startNode), depth: 0 },
    ];

    const maxDepth = query.maxDepth ?? 3;
    const shouldFollow = (edge: GraphEdge): boolean => {
      if (query.requiredOnly && !edge.required) return false;
      if (query.types && !query.types.includes(edge.type)) return false;
      const targetNode = this.getNode(
        query.direction === TraversalDirection.Downstream
          ? edge.targetId
          : edge.sourceId
      );
      if (
        query.entityNames &&
        targetNode &&
        !query.entityNames.includes(targetNode.entityName)
      ) {
        return false;
      }
      return true;
    };

    while (queue.length > 0) {
      const { nodeId, path, depth } = queue.shift()!;

      if (depth >= maxDepth) continue;

      let edges: GraphEdge[];
      switch (query.direction) {
        case TraversalDirection.Downstream:
          edges = this.getOutgoingEdges(nodeId);
          break;
        case TraversalDirection.Upstream:
          edges = this.getIncomingEdges(nodeId);
          break;
        case TraversalDirection.Both:
          edges = this.getConnectedEdges(nodeId);
          break;
      }

      for (const edge of edges) {
        if (!shouldFollow(edge)) continue;

        const nextId =
          query.direction === TraversalDirection.Upstream
            ? edge.sourceId
            : edge.targetId;
        if (visited.has(nextId)) continue;

        visited.add(nextId);
        const nextNode = this.getNode(nextId);
        if (!nextNode) continue;

        const newPath = extendPath(path, nextNode, edge);
        resultNodes.push(nextNode);
        resultEdges.push(edge);

        const existingPaths = paths.get(nextId) ?? [];
        existingPaths.push(newPath);
        paths.set(nextId, existingPaths);

        queue.push({ nodeId: nextId, path: newPath, depth: depth + 1 });
      }
    }

    return { nodes: resultNodes, edges: resultEdges, paths };
  }

  bfs(
    startNodeId: string,
    options: {
      maxDepth?: number;
      filter?: (edge: GraphEdge) => boolean;
    } = {}
  ): Map<string, GraphPath> {
    const startNode = this.getNode(startNodeId);
    if (!startNode) return new Map();

    const result = new Map<string, GraphPath>();
    const visited = new Set<string>([startNodeId]);
    const queue: Array<{ nodeId: string; path: GraphPath; depth: number }> = [
      { nodeId: startNodeId, path: createPath(startNode), depth: 0 },
    ];

    const maxDepth = options.maxDepth ?? 10;

    while (queue.length > 0) {
      const { nodeId, path, depth } = queue.shift()!;
      result.set(nodeId, path);

      if (depth >= maxDepth) continue;

      for (const edge of this.getOutgoingEdges(nodeId)) {
        if (options.filter && !options.filter(edge)) continue;
        if (visited.has(edge.targetId)) continue;

        visited.add(edge.targetId);
        const targetNode = this.getNode(edge.targetId);
        if (targetNode) {
          queue.push({
            nodeId: edge.targetId,
            path: extendPath(path, targetNode, edge),
            depth: depth + 1,
          });
        }
      }
    }

    return result;
  }

  dfs(
    startNodeId: string,
    options: {
      maxDepth?: number;
      filter?: (edge: GraphEdge) => boolean;
    } = {}
  ): Map<string, GraphPath> {
    const startNode = this.getNode(startNodeId);
    if (!startNode) return new Map();

    const result = new Map<string, GraphPath>();
    const visited = new Set<string>();

    const traverse = (nodeId: string, path: GraphPath, depth: number): void => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);
      result.set(nodeId, path);

      const maxDepth = options.maxDepth ?? 10;
      if (depth >= maxDepth) return;

      for (const edge of this.getOutgoingEdges(nodeId)) {
        if (options.filter && !options.filter(edge)) continue;

        const targetNode = this.getNode(edge.targetId);
        if (targetNode) {
          traverse(
            edge.targetId,
            extendPath(path, targetNode, edge),
            depth + 1
          );
        }
      }
    };

    traverse(startNodeId, createPath(startNode), 0);
    return result;
  }

  findShortestPath(fromId: string, toId: string): GraphPath | undefined {
    const fromNode = this.getNode(fromId);
    const toNode = this.getNode(toId);
    if (!(fromNode && toNode)) return undefined;

    if (fromId === toId) {
      return createPath(fromNode);
    }

    const visited = new Set<string>([fromId]);
    const queue: GraphPath[] = [createPath(fromNode)];

    while (queue.length > 0) {
      const path = queue.shift()!;
      const lastNode = path.nodes[path.nodes.length - 1];

      for (const edge of this.getOutgoingEdges(lastNode.id)) {
        if (visited.has(edge.targetId)) continue;

        visited.add(edge.targetId);
        const targetNode = this.getNode(edge.targetId);
        if (!targetNode) continue;

        const newPath = extendPath(path, targetNode, edge);

        if (edge.targetId === toId) {
          return newPath;
        }

        queue.push(newPath);
      }
    }

    return undefined;
  }

  findAllPaths(
    fromId: string,
    toId: string,
    options: { maxDepth?: number } = {}
  ): GraphPath[] {
    const fromNode = this.getNode(fromId);
    const toNode = this.getNode(toId);
    if (!(fromNode && toNode)) return [];

    const result: GraphPath[] = [];
    const maxDepth = options.maxDepth ?? 10;
    const visitedInPath = new Set<string>();

    const traverse = (currentPath: GraphPath, depth: number): void => {
      const lastNode = currentPath.nodes[currentPath.nodes.length - 1];

      if (lastNode.id === toId && currentPath.nodes.length > 1) {
        result.push(currentPath);
        return;
      }

      if (depth >= maxDepth) return;

      for (const edge of this.getOutgoingEdges(lastNode.id)) {
        // Avoid cycles by checking if we've already visited this node in current path
        if (currentPath.nodes.some((n) => n.id === edge.targetId)) continue;

        const targetNode = this.getNode(edge.targetId);
        if (!targetNode) continue;

        traverse(extendPath(currentPath, targetNode, edge), depth + 1);
      }
    };

    traverse(createPath(fromNode), 0);
    return result;
  }

  // ---------------------------------------------------------------------------
  // Impact Analysis
  // ---------------------------------------------------------------------------

  analyzeImpact(
    nodeId: string,
    options: ImpactAnalysisOptions = {}
  ): ImpactAnalysisResult {
    const source = this.getNode(nodeId);
    if (!source) {
      return {
        source: { id: nodeId, entityName: "", kind: "instance" },
        directImpact: [],
        transitiveImpact: [],
        impactPaths: new Map(),
        severity: "low",
      };
    }

    const maxDepth = options.maxDepth ?? 5;
    const relationshipTypes = options.relationshipTypes;
    const entityFilter = options.entityFilter;

    const filter = (edge: GraphEdge): boolean => {
      if (relationshipTypes && !relationshipTypes.includes(edge.type)) {
        return false;
      }
      const targetNode = this.getNode(edge.targetId);
      if (
        entityFilter &&
        targetNode &&
        !entityFilter.has(targetNode.entityName)
      ) {
        return false;
      }
      return true;
    };

    // Find all impacted nodes using BFS
    const allPaths = this.bfs(nodeId, { maxDepth, filter });
    const directImpact: GraphNode[] = [];
    const transitiveImpact: GraphNode[] = [];
    const impactPaths = new Map<string, GraphPath[]>();

    for (const [targetId, path] of allPaths) {
      if (targetId === nodeId) continue;

      const targetNode = this.getNode(targetId);
      if (!targetNode) continue;

      // Add to impact paths
      const existingPaths = impactPaths.get(targetId) ?? [];
      existingPaths.push(path);
      impactPaths.set(targetId, existingPaths);

      // Direct impact = depth 1
      if (path.weight === 1) {
        directImpact.push(targetNode);
      } else {
        transitiveImpact.push(targetNode);
      }
    }

    // Calculate severity
    const totalImpacted = directImpact.length + transitiveImpact.length;
    const hasRequiredImpact = [...impactPaths.values()].some((paths) =>
      paths.some((p) => p.edges.some((e) => e.required))
    );

    let severity: ImpactAnalysisResult["severity"] = "low";
    if (hasRequiredImpact && totalImpacted > 10) {
      severity = "critical";
    } else if (hasRequiredImpact || totalImpacted > 5) {
      severity = "high";
    } else if (totalImpacted > 2) {
      severity = "medium";
    }

    return {
      source,
      directImpact,
      transitiveImpact,
      impactPaths,
      severity,
    };
  }

  findDependents(
    nodeId: string,
    options: { maxDepth?: number } = {}
  ): GraphNode[] {
    const result = this.findRelated({
      from: nodeId,
      direction: TraversalDirection.Upstream,
      maxDepth: options.maxDepth,
    });
    return result.nodes;
  }

  findDependencies(
    nodeId: string,
    options: { maxDepth?: number } = {}
  ): GraphNode[] {
    const result = this.findRelated({
      from: nodeId,
      direction: TraversalDirection.Downstream,
      maxDepth: options.maxDepth,
    });
    return result.nodes;
  }

  detectCycles(nodeId?: string): GraphPath[] {
    const cycles: GraphPath[] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const currentPath: GraphNode[] = [];
    const currentEdges: GraphEdge[] = [];

    const detect = (id: string): boolean => {
      visited.add(id);
      recursionStack.add(id);

      const node = this.getNode(id);
      if (node) currentPath.push(node);

      for (const edge of this.getOutgoingEdges(id)) {
        currentEdges.push(edge);

        if (!visited.has(edge.targetId)) {
          if (detect(edge.targetId)) {
            return true;
          }
        } else if (recursionStack.has(edge.targetId)) {
          // Found a cycle - extract it from the current path
          const cycleStartIndex = currentPath.findIndex(
            (n) => n.id === edge.targetId
          );
          if (cycleStartIndex >= 0) {
            const cycleNodes = currentPath.slice(cycleStartIndex);
            const cycleEdges = currentEdges.slice(cycleStartIndex);
            // Close the cycle
            const targetNode = this.getNode(edge.targetId);
            if (targetNode) {
              cycleNodes.push(targetNode);
              cycles.push({
                nodes: cycleNodes,
                edges: cycleEdges,
                weight: cycleEdges.length,
              });
            }
          }
        }

        currentEdges.pop();
      }

      currentPath.pop();
      recursionStack.delete(id);
      return false;
    };

    if (nodeId) {
      detect(nodeId);
    } else {
      for (const id of this.nodes.keys()) {
        if (!visited.has(id)) {
          detect(id);
        }
      }
    }

    return cycles;
  }

  // ---------------------------------------------------------------------------
  // Graph Properties
  // ---------------------------------------------------------------------------

  hasNode(nodeId: string): boolean {
    return this.nodes.has(nodeId);
  }

  hasEdge(fromId: string, toId: string, name?: string): boolean {
    const edges = this.getOutgoingEdges(fromId);
    return edges.some((e) => {
      if (e.targetId !== toId) return false;
      if (name !== undefined && e.name !== name) return false;
      return true;
    });
  }

  getDegree(nodeId: string): number {
    return this.getConnectedEdges(nodeId).length;
  }

  getEntityNames(): string[] {
    const names = new Set<string>();
    for (const node of this.nodes.values()) {
      names.add(node.entityName);
    }
    return Array.from(names).sort();
  }

  toAdjacencyList(): Map<string, Array<{ nodeId: string; edge: GraphEdge }>> {
    const result = new Map();
    for (const [sourceId, edges] of this.adjacencyOut) {
      result.set(
        sourceId,
        edges.map((e) => ({ nodeId: e.targetId, edge: e }))
      );
    }
    return result;
  }

  clear(): void {
    this.nodes.clear();
    this.edges.clear();
    this.adjacencyOut.clear();
    this.adjacencyIn.clear();
  }
}

/**
 * Create a new empty entity graph.
 */
export function createEntityGraph(): InMemoryEntityGraph {
  return new InMemoryEntityGraph();
}
