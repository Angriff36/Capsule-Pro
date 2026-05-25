/**
 * Entity Relationship Graph Types
 *
 * Core type definitions for the entity graph.
 * Separated to avoid circular dependencies.
 */

// ---------------------------------------------------------------------------
// Relationship Types
// ---------------------------------------------------------------------------

/**
 * Types of relationships between entities in the graph.
 *
 * - **composition**: Child entity cannot exist without parent (e.g., Event → EventBudget)
 * - **aggregation**: Child entity can exist independently but belongs to parent (e.g., Menu → MenuDish)
 * - **reference**: Entity references another without ownership (e.g., Event → Client)
 * - **dependency**: Entity depends on another for behavior (e.g., PrepTask → Recipe)
 * - **junction**: Many-to-many relationship via junction table (e.g., Event ↔ Dish)
 * - **hierarchy**: Hierarchical relationship (e.g., CommandBoard → CommandBoardCard)
 * - **version**: Versioned relationship (e.g., Recipe → RecipeVersion)
 * - **workflow**: Entity participates in a workflow (e.g., PrepTask → PrepList)
 */
export enum RelationshipType {
  Composition = "composition",
  Aggregation = "aggregation",
  Reference = "reference",
  Dependency = "dependency",
  Junction = "junction",
  Hierarchy = "hierarchy",
  Version = "version",
  Workflow = "workflow",
}

/**
 * Direction for relationship definitions and traversals.
 */
export enum Direction {
  /** Relationship flows from source to target */
  Outgoing = "outgoing",
  /** Relationship flows from target to source */
  Incoming = "incoming",
  /** Bidirectional relationship */
  Both = "both",
}

/**
 * Direction for graph traversal queries.
 */
export enum TraversalDirection {
  /** Traverse from source to target (following outgoing edges) */
  Downstream = "downstream",
  /** Traverse from target to source (following incoming edges) */
  Upstream = "upstream",
  /** Traverse both directions */
  Both = "both",
}

// ---------------------------------------------------------------------------
// Graph Node Types
// ---------------------------------------------------------------------------

/**
 * A node in the entity graph representing an entity type or instance.
 */
export interface GraphNode {
  /** Unique identifier for the node (entity name or instance ID) */
  id: string;
  /** Entity name (e.g., "Event", "PrepTask") */
  entityName: string;
  /** Whether this is a type node (entity schema) or instance node */
  kind: "type" | "instance";
  /** Display name for the node */
  label?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Graph Edge Types
// ---------------------------------------------------------------------------

/**
 * An edge in the entity graph representing a relationship.
 */
export interface GraphEdge {
  /** Unique identifier for this edge */
  id: string;
  /** Source node ID */
  sourceId: string;
  /** Target node ID */
  targetId: string;
  /** Type of relationship */
  type: RelationshipType;
  /** Name of the relationship (e.g., "budget", "tasks", "recipe") */
  name: string;
  /** Whether this is required or optional */
  required: boolean;
  /** Cardinality (e.g., "1:1", "1:N", "N:M") */
  cardinality: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Path Types for Traversal
// ---------------------------------------------------------------------------

/**
 * A path through the graph representing a chain of relationships.
 */
export interface GraphPath {
  /** The sequence of nodes in the path */
  nodes: GraphNode[];
  /** The edges connecting the nodes */
  edges: GraphEdge[];
  /** Total path weight/cost */
  weight: number;
}

// ---------------------------------------------------------------------------
// Impact Analysis Types
// ---------------------------------------------------------------------------

/**
 * Result of an impact analysis query.
 */
export interface ImpactAnalysisResult {
  /** The starting entity */
  source: GraphNode;
  /** Entities that would be directly affected */
  directImpact: GraphNode[];
  /** Entities that would be transitively affected */
  transitiveImpact: GraphNode[];
  /** Paths from source to each affected entity */
  impactPaths: Map<string, GraphPath[]>;
  /** Impact severity (number of affected entities weighted by relationship type) */
  severity: "low" | "medium" | "high" | "critical";
}

/**
 * Options for impact analysis queries.
 */
export interface ImpactAnalysisOptions {
  /** Maximum traversal depth */
  maxDepth?: number;
  /** Whether to include the source in results */
  includeSource?: boolean;
  /** Filter by relationship types */
  relationshipTypes?: RelationshipType[];
  /** Filter by entity names */
  entityFilter?: Set<string>;
}

// ---------------------------------------------------------------------------
// Query Types
// ---------------------------------------------------------------------------

/**
 * A query for finding related entities.
 */
export interface RelationshipQuery {
  /** Starting node ID */
  from: string;
  /** Traversal direction */
  direction: TraversalDirection;
  /** Maximum depth to traverse */
  maxDepth?: number;
  /** Filter by relationship types */
  types?: RelationshipType[];
  /** Filter by entity names */
  entityNames?: string[];
  /** Whether to follow only required relationships */
  requiredOnly?: boolean;
}

/**
 * Result of a relationship query.
 */
export interface RelationshipQueryResult {
  /** Nodes found by the query */
  nodes: GraphNode[];
  /** Edges traversed */
  edges: GraphEdge[];
  /** Paths to each node */
  paths: Map<string, GraphPath[]>;
}

// ---------------------------------------------------------------------------
// Main Graph Type
// ---------------------------------------------------------------------------

/**
 * Options for building the entity graph.
 */
export interface EntityGraphOptions {
  /** Whether to include instance nodes (default: type nodes only) */
  includeInstances?: boolean;
  /** Whether to infer relationships from property names */
  inferRelationships?: boolean;
}

/**
 * The entity relationship graph.
 *
 * Provides methods for:
 * - Adding nodes and edges
 * - Querying relationships
 * - Traversal (BFS, DFS, shortest path)
 * - Impact analysis
 * - Dependency detection
 */
export interface EntityGraph {
  // ---------------------------------------------------------------------------
  // Graph Construction
  // ---------------------------------------------------------------------------

  /**
   * Add a node to the graph.
   */
  addNode(node: GraphNode): void;

  /**
   * Add an edge to the graph.
   */
  addEdge(edge: GraphEdge): void;

  /**
   * Remove a node and all its connected edges.
   */
  removeNode(nodeId: string): void;

  /**
   * Remove an edge from the graph.
   */
  removeEdge(edgeId: string): void;

  // ---------------------------------------------------------------------------
  // Graph Queries
  // ---------------------------------------------------------------------------

  /**
   * Get a node by ID.
   */
  getNode(nodeId: string): GraphNode | undefined;

  /**
   * Get all nodes.
   */
  getNodes(): GraphNode[];

  /**
   * Get nodes by entity name.
   */
  getNodesByEntity(entityName: string): GraphNode[];

  /**
   * Get an edge by ID.
   */
  getEdge(edgeId: string): GraphEdge | undefined;

  /**
   * Get all edges.
   */
  getEdges(): GraphEdge[];

  /**
   * Get outgoing edges from a node.
   */
  getOutgoingEdges(nodeId: string): GraphEdge[];

  /**
   * Get incoming edges to a node.
   */
  getIncomingEdges(nodeId: string): GraphEdge[];

  /**
   * Get all edges connected to a node.
   */
  getConnectedEdges(nodeId: string): GraphEdge[];

  // ---------------------------------------------------------------------------
  // Traversal
  // ---------------------------------------------------------------------------

  /**
   * Find related entities using the given query.
   */
  findRelated(query: RelationshipQuery): RelationshipQueryResult;

  /**
   * Perform breadth-first search from a starting node.
   */
  bfs(
    startNodeId: string,
    options: {
      maxDepth?: number;
      filter?: (edge: GraphEdge) => boolean;
    }
  ): Map<string, GraphPath>;

  /**
   * Perform depth-first search from a starting node.
   */
  dfs(
    startNodeId: string,
    options: {
      maxDepth?: number;
      filter?: (edge: GraphEdge) => boolean;
    }
  ): Map<string, GraphPath>;

  /**
   * Find shortest path between two nodes using BFS.
   */
  findShortestPath(fromId: string, toId: string): GraphPath | undefined;

  /**
   * Find all paths between two nodes.
   */
  findAllPaths(
    fromId: string,
    toId: string,
    options?: { maxDepth?: number }
  ): GraphPath[];

  // ---------------------------------------------------------------------------
  // Impact Analysis
  // ---------------------------------------------------------------------------

  /**
   * Analyze the impact of changing an entity.
   */
  analyzeImpact(
    nodeId: string,
    options?: ImpactAnalysisOptions
  ): ImpactAnalysisResult;

  /**
   * Find entities that depend on the given entity (upstream traversal).
   */
  findDependents(nodeId: string, options?: { maxDepth?: number }): GraphNode[];

  /**
   * Find entities that the given entity depends on (downstream traversal).
   */
  findDependencies(
    nodeId: string,
    options?: { maxDepth?: number }
  ): GraphNode[];

  /**
   * Detect circular dependencies.
   */
  detectCycles(nodeId?: string): GraphPath[];

  // ---------------------------------------------------------------------------
  // Graph Properties
  // ---------------------------------------------------------------------------

  /**
   * Check if a node exists.
   */
  hasNode(nodeId: string): boolean;

  /**
   * Check if an edge exists.
   */
  hasEdge(fromId: string, toId: string, name?: string): boolean;

  /**
   * Get the degree (number of connected edges) of a node.
   */
  getDegree(nodeId: string): number;

  /**
   * Get all entity names in the graph.
   */
  getEntityNames(): string[];

  /**
   * Export graph as adjacency list (for serialization).
   */
  toAdjacencyList(): Map<string, Array<{ nodeId: string; edge: GraphEdge }>>;

  /**
   * Clear all nodes and edges.
   */
  clear(): void;
}
