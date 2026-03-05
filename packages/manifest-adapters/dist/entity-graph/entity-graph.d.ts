/**
 * Entity Graph Implementation
 *
 * In-memory implementation of the EntityGraph interface using adjacency lists
 * for efficient traversal and querying.
 */
import type { EntityGraph, GraphEdge, GraphNode, GraphPath, ImpactAnalysisOptions, ImpactAnalysisResult, RelationshipQuery, RelationshipQueryResult } from "./types.js";
/**
 * In-memory implementation of the entity graph.
 */
export declare class InMemoryEntityGraph implements EntityGraph {
    private nodes;
    private edges;
    private adjacencyOut;
    private adjacencyIn;
    addNode(node: GraphNode): void;
    addEdge(edge: GraphEdge): void;
    removeNode(nodeId: string): void;
    removeEdge(edgeId: string): void;
    getNode(nodeId: string): GraphNode | undefined;
    getNodes(): GraphNode[];
    getNodesByEntity(entityName: string): GraphNode[];
    getEdge(edgeId: string): GraphEdge | undefined;
    getEdges(): GraphEdge[];
    getOutgoingEdges(nodeId: string): GraphEdge[];
    getIncomingEdges(nodeId: string): GraphEdge[];
    getConnectedEdges(nodeId: string): GraphEdge[];
    findRelated(query: RelationshipQuery): RelationshipQueryResult;
    bfs(startNodeId: string, options?: {
        maxDepth?: number;
        filter?: (edge: GraphEdge) => boolean;
    }): Map<string, GraphPath>;
    dfs(startNodeId: string, options?: {
        maxDepth?: number;
        filter?: (edge: GraphEdge) => boolean;
    }): Map<string, GraphPath>;
    findShortestPath(fromId: string, toId: string): GraphPath | undefined;
    findAllPaths(fromId: string, toId: string, options?: {
        maxDepth?: number;
    }): GraphPath[];
    analyzeImpact(nodeId: string, options?: ImpactAnalysisOptions): ImpactAnalysisResult;
    findDependents(nodeId: string, options?: {
        maxDepth?: number;
    }): GraphNode[];
    findDependencies(nodeId: string, options?: {
        maxDepth?: number;
    }): GraphNode[];
    detectCycles(nodeId?: string): GraphPath[];
    hasNode(nodeId: string): boolean;
    hasEdge(fromId: string, toId: string, name?: string): boolean;
    getDegree(nodeId: string): number;
    getEntityNames(): string[];
    toAdjacencyList(): Map<string, Array<{
        nodeId: string;
        edge: GraphEdge;
    }>>;
    clear(): void;
}
/**
 * Create a new empty entity graph.
 */
export declare function createEntityGraph(): InMemoryEntityGraph;
//# sourceMappingURL=entity-graph.d.ts.map