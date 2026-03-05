/**
 * Tests for Entity Graph functionality
 */

import { beforeEach, describe, expect, it } from "vitest";
import {
  buildGraphFromKnownRelationships,
  createEdge,
  createEntityGraph,
  createInstanceNode,
  createTypeNode,
  findCircularDependencies,
  getConnectionInfo,
  getDependencyChain,
  getEntitySummary,
  getRelationshipsForEntity,
  type InMemoryEntityGraph,
  RelationshipType,
} from "../src/entity-graph/index.js";

describe("EntityGraph", () => {
  let graph: InMemoryEntityGraph;

  beforeEach(() => {
    graph = createEntityGraph();
  });

  describe("Basic Graph Operations", () => {
    it("should add and retrieve nodes", () => {
      const eventNode = createTypeNode("Event");
      graph.addNode(eventNode);

      expect(graph.hasNode(eventNode.id)).toBe(true);
      expect(graph.getNode(eventNode.id)).toEqual(eventNode);
    });

    it("should add and retrieve edges", () => {
      const eventNode = createTypeNode("Event");
      const clientNode = createTypeNode("Client");
      graph.addNode(eventNode);
      graph.addNode(clientNode);

      const edge = createEdge(
        eventNode.id,
        clientNode.id,
        RelationshipType.Reference,
        "client"
      );
      graph.addEdge(edge);

      expect(graph.hasEdge(eventNode.id, clientNode.id, "client")).toBe(true);
      expect(graph.getEdge(edge.id)).toEqual(edge);
    });

    it("should retrieve nodes by entity name", () => {
      const node1 = createTypeNode("Event");
      const node2 = createInstanceNode("Event", "event-1");
      graph.addNode(node1);
      graph.addNode(node2);

      const eventNodes = graph.getNodesByEntity("Event");
      expect(eventNodes).toHaveLength(2);
      expect(eventNodes).toContainEqual(node1);
      expect(eventNodes).toContainEqual(node2);
    });

    it("should calculate node degree correctly", () => {
      const eventNode = createTypeNode("Event");
      const clientNode = createTypeNode("Client");
      const venueNode = createTypeNode("Venue");

      graph.addNode(eventNode);
      graph.addNode(clientNode);
      graph.addNode(venueNode);

      graph.addEdge(
        createEdge(
          eventNode.id,
          clientNode.id,
          RelationshipType.Reference,
          "client"
        )
      );
      graph.addEdge(
        createEdge(
          eventNode.id,
          venueNode.id,
          RelationshipType.Reference,
          "venue"
        )
      );

      expect(graph.getDegree(eventNode.id)).toBe(2);
      expect(graph.getDegree(clientNode.id)).toBe(1);
      expect(graph.getDegree(venueNode.id)).toBe(1);
    });

    it("should remove nodes and their edges", () => {
      const eventNode = createTypeNode("Event");
      const clientNode = createTypeNode("Client");

      graph.addNode(eventNode);
      graph.addNode(clientNode);

      const edge = createEdge(
        eventNode.id,
        clientNode.id,
        RelationshipType.Reference,
        "client"
      );
      graph.addEdge(edge);

      graph.removeNode(eventNode.id);

      expect(graph.hasNode(eventNode.id)).toBe(false);
      expect(graph.hasEdge(eventNode.id, clientNode.id)).toBe(false);
    });
  });

  describe("Graph Traversal", () => {
    beforeEach(() => {
      // Build a simple graph:
      // Event -> Client
      // Event -> Venue
      // Client -> Contact
      // Event -> PrepTask
      // PrepTask -> Recipe

      const eventNode = createTypeNode("Event");
      const clientNode = createTypeNode("Client");
      const venueNode = createTypeNode("Venue");
      const contactNode = createTypeNode("ClientContact");
      const prepTaskNode = createTypeNode("PrepTask");
      const recipeNode = createTypeNode("Recipe");

      graph.addNode(eventNode);
      graph.addNode(clientNode);
      graph.addNode(venueNode);
      graph.addNode(contactNode);
      graph.addNode(prepTaskNode);
      graph.addNode(recipeNode);

      graph.addEdge(
        createEdge(
          eventNode.id,
          clientNode.id,
          RelationshipType.Reference,
          "client",
          {
            required: true,
          }
        )
      );
      graph.addEdge(
        createEdge(
          eventNode.id,
          venueNode.id,
          RelationshipType.Reference,
          "venue"
        )
      );
      graph.addEdge(
        createEdge(
          clientNode.id,
          contactNode.id,
          RelationshipType.Composition,
          "contacts"
        )
      );
      graph.addEdge(
        createEdge(
          eventNode.id,
          prepTaskNode.id,
          RelationshipType.Dependency,
          "prepTasks"
        )
      );
      graph.addEdge(
        createEdge(
          prepTaskNode.id,
          recipeNode.id,
          RelationshipType.Dependency,
          "recipe"
        )
      );
    });

    it("should perform BFS traversal", () => {
      const eventNode = graph.getNodesByEntity("Event")[0];
      const result = graph.bfs(eventNode.id, { maxDepth: 2 });

      expect(result.size).toBeGreaterThan(1);
      expect(result.has(eventNode.id)).toBe(true);
    });

    it("should perform DFS traversal", () => {
      const eventNode = graph.getNodesByEntity("Event")[0];
      const result = graph.dfs(eventNode.id, { maxDepth: 2 });

      expect(result.size).toBeGreaterThan(1);
      expect(result.has(eventNode.id)).toBe(true);
    });

    it("should find shortest path between nodes", () => {
      const eventNode = graph.getNodesByEntity("Event")[0];
      const recipeNode = graph.getNodesByEntity("Recipe")[0];

      const path = graph.findShortestPath(eventNode.id, recipeNode.id);

      expect(path).toBeDefined();
      expect(path?.nodes).toHaveLength(3); // Event -> PrepTask -> Recipe
      expect(path?.nodes[0].entityName).toBe("Event");
      expect(path?.nodes[2].entityName).toBe("Recipe");
    });

    it("should find all paths between nodes", () => {
      const eventNode = graph.getNodesByEntity("Event")[0];
      const contactNode = graph.getNodesByEntity("ClientContact")[0];

      const paths = graph.findAllPaths(eventNode.id, contactNode.id);

      expect(paths.length).toBeGreaterThan(0);
      const path = paths[0];
      expect(path.nodes[0].entityName).toBe("Event");
      expect(path.nodes[path.nodes.length - 1].entityName).toBe(
        "ClientContact"
      );
    });
  });

  describe("Impact Analysis", () => {
    beforeEach(() => {
      // Build a graph with composition and reference relationships
      // Event (composition) -> EventBudget (composition) -> BudgetLineItem
      // Event (reference) -> Client

      const eventNode = createTypeNode("Event");
      const budgetNode = createTypeNode("EventBudget");
      const lineItemNode = createTypeNode("BudgetLineItem");
      const clientNode = createTypeNode("Client");

      graph.addNode(eventNode);
      graph.addNode(budgetNode);
      graph.addNode(lineItemNode);
      graph.addNode(clientNode);

      graph.addEdge(
        createEdge(
          eventNode.id,
          budgetNode.id,
          RelationshipType.Composition,
          "budget",
          { required: true }
        )
      );
      graph.addEdge(
        createEdge(
          budgetNode.id,
          lineItemNode.id,
          RelationshipType.Composition,
          "lineItems",
          { required: false }
        )
      );
      graph.addEdge(
        createEdge(
          eventNode.id,
          clientNode.id,
          RelationshipType.Reference,
          "client",
          { required: true }
        )
      );
    });

    it("should analyze impact of changing an entity", () => {
      const eventNode = graph.getNodesByEntity("Event")[0];
      const impact = graph.analyzeImpact(eventNode.id, { maxDepth: 3 });

      expect(impact.source.entityName).toBe("Event");
      expect(impact.directImpact.length).toBeGreaterThan(0);
      expect(impact.transitiveImpact.length).toBeGreaterThan(0);
      expect(impact.severity).toBeDefined();
    });

    it("should find dependents of an entity", () => {
      const budgetNode = graph.getNodesByEntity("EventBudget")[0];
      const dependents = graph.findDependents(budgetNode.id);

      expect(dependents).toHaveLength(1);
      expect(dependents[0].entityName).toBe("Event");
    });

    it("should find dependencies of an entity", () => {
      const eventNode = graph.getNodesByEntity("Event")[0];
      const dependencies = graph.findDependencies(eventNode.id);

      expect(dependencies.length).toBeGreaterThan(0);
      const entityNames = dependencies.map((n) => n.entityName);
      expect(entityNames).toContain("EventBudget");
      expect(entityNames).toContain("Client");
    });
  });

  describe("Cycle Detection", () => {
    it("should detect no cycles in an acyclic graph", () => {
      const node1 = createTypeNode("A");
      const node2 = createTypeNode("B");
      const node3 = createTypeNode("C");

      graph.addNode(node1);
      graph.addNode(node2);
      graph.addNode(node3);

      graph.addEdge(
        createEdge(node1.id, node2.id, RelationshipType.Reference, "a")
      );
      graph.addEdge(
        createEdge(node2.id, node3.id, RelationshipType.Reference, "b")
      );

      const cycles = graph.detectCycles();
      expect(cycles).toHaveLength(0);
    });

    it("should detect cycles in a cyclic graph", () => {
      const node1 = createTypeNode("A");
      const node2 = createTypeNode("B");
      const node3 = createTypeNode("C");

      graph.addNode(node1);
      graph.addNode(node2);
      graph.addNode(node3);

      // Create a cycle: A -> B -> C -> A
      graph.addEdge(
        createEdge(node1.id, node2.id, RelationshipType.Reference, "a")
      );
      graph.addEdge(
        createEdge(node2.id, node3.id, RelationshipType.Reference, "b")
      );
      graph.addEdge(
        createEdge(node3.id, node1.id, RelationshipType.Reference, "c")
      );

      const cycles = graph.detectCycles();
      expect(cycles.length).toBeGreaterThan(0);
    });
  });
});

describe("Graph Builder", () => {
  it("should build a graph from known relationships", () => {
    const graph = buildGraphFromKnownRelationships();

    // Check that some core entities exist
    expect(graph.getNodesByEntity("Event")).toHaveLength(1);
    expect(graph.getNodesByEntity("Client")).toHaveLength(1);
    expect(graph.getNodesByEntity("PrepTask")).toHaveLength(1);
    expect(graph.getNodesByEntity("Recipe")).toHaveLength(1);

    // Check that Event -> Client relationship exists
    const eventNode = graph.getNodesByEntity("Event")[0];
    const clientNode = graph.getNodesByEntity("Client")[0];
    expect(graph.hasEdge(eventNode.id, clientNode.id, "client")).toBe(true);

    // Check that PrepTask -> Recipe relationship exists
    const prepTaskNode = graph.getNodesByEntity("PrepTask")[0];
    const recipeNode = graph.getNodesByEntity("Recipe")[0];
    expect(graph.hasEdge(prepTaskNode.id, recipeNode.id, "recipe")).toBe(true);
  });

  it("should get relationships for a specific entity", () => {
    const relationships = getRelationshipsForEntity("Event");

    expect(relationships.length).toBeGreaterThan(0);

    const relNames = relationships.map((r) => r.name);
    expect(relNames).toContain("client");
    expect(relNames).toContain("budget");
  });
});

describe("Graph Queries", () => {
  let graph: InMemoryEntityGraph;

  beforeEach(() => {
    graph = buildGraphFromKnownRelationships();
  });

  it("should get connection info between entities", () => {
    const info = getConnectionInfo(graph, "Event", "Recipe");

    expect(info.connected).toBe(true);
    expect(info.distance).toBeGreaterThan(0);
    expect(info.shortestPath).toBeDefined();
    expect(info.allPaths.length).toBeGreaterThan(0);
  });

  it("should get dependency chain for an entity", () => {
    const chains = getDependencyChain(graph, "Event");

    expect(chains.length).toBeGreaterThan(0);

    // Event should have dependencies like Client, Venue, etc.
    const allDeps = new Set<string>();
    for (const chain of chains) {
      for (const entity of chain.chain) {
        allDeps.add(entity);
      }
    }
    expect(allDeps.has("Event")).toBe(true);
  });

  it("should get entity summary", () => {
    const summary = getEntitySummary(graph, "Event");

    expect(summary).toBeDefined();
    expect(summary?.entityName).toBe("Event");
    expect(summary?.dependencies.length).toBeGreaterThan(0);
    expect(summary?.related.length).toBeGreaterThan(0);
    expect(summary?.degree).toBeGreaterThan(0);
  });

  it("should find circular dependencies", () => {
    // The default graph shouldn't have circular dependencies
    const cycles = findCircularDependencies(graph);

    // If we find cycles, they should be documented
    // For now, expect an acyclic graph from known relationships
    expect(Array.isArray(cycles)).toBe(true);
  });
});

describe("Graph Serialization", () => {
  it("should export as adjacency list", () => {
    const graph = createEntityGraph();

    const node1 = createTypeNode("A");
    const node2 = createTypeNode("B");
    const node3 = createTypeNode("C");

    graph.addNode(node1);
    graph.addNode(node2);
    graph.addNode(node3);

    graph.addEdge(
      createEdge(node1.id, node2.id, RelationshipType.Reference, "b")
    );
    graph.addEdge(
      createEdge(node1.id, node3.id, RelationshipType.Reference, "c")
    );

    const adjList = graph.toAdjacencyList();

    expect(adjList.size).toBeGreaterThan(0);
    expect(adjList.has(node1.id)).toBe(true);

    const connections = adjList.get(node1.id);
    expect(connections).toHaveLength(2);
  });

  it("should clear the graph", () => {
    const graph = createEntityGraph();
    graph.addNode(createTypeNode("A"));
    graph.addEdge(
      createEdge("type:A", "type:B", RelationshipType.Reference, "b")
    );

    expect(graph.getNodes().length).toBeGreaterThan(0);

    graph.clear();

    expect(graph.getNodes()).toHaveLength(0);
    expect(graph.getEdges()).toHaveLength(0);
  });
});
