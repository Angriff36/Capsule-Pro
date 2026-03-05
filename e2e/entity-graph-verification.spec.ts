/**
 * Temporary verification test for Entity Graph functionality
 *
 * This test verifies that the entity relationship graph works correctly
 * by testing core functionality like building the graph, traversing relationships,
 * and performing impact analysis.
 */

import { expect, test } from "@playwright/test";
import {
  buildGraphFromKnownRelationships,
  createEdge,
  createEntityGraph,
  createTypeNode,
  getConnectionInfo,
  getEntitySummary,
  RelationshipType,
} from "../packages/manifest-adapters/src/entity-graph/index.js";

test.describe("Entity Graph Verification", () => {
  test("should build a graph from known relationships", () => {
    const graph = buildGraphFromKnownRelationships();

    // Verify core entities exist
    const eventNodes = graph.getNodesByEntity("Event");
    expect(eventNodes.length).toBeGreaterThan(0);

    const clientNodes = graph.getNodesByEntity("Client");
    expect(clientNodes.length).toBeGreaterThan(0);

    // Verify relationships
    const eventNode = eventNodes[0];
    const clientNode = clientNodes[0];
    expect(graph.hasEdge(eventNode.id, clientNode.id, "client")).toBe(true);
  });

  test("should find connections between entities", () => {
    const graph = buildGraphFromKnownRelationships();

    // Event should be connected to Recipe (via PrepTask)
    const info = getConnectionInfo(graph, "Event", "Recipe");
    expect(info.connected).toBe(true);
    expect(info.distance).toBeGreaterThan(0);
    expect(info.shortestPath).toBeDefined();
  });

  test("should provide entity summaries", () => {
    const graph = buildGraphFromKnownRelationships();

    const summary = getEntitySummary(graph, "Event");
    expect(summary).toBeDefined();
    expect(summary?.entityName).toBe("Event");
    expect(summary?.dependencies.length).toBeGreaterThan(0);
    expect(summary?.related.length).toBeGreaterThan(0);
  });

  test("should support custom graph construction", () => {
    const graph = createEntityGraph();

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

    // Verify structure
    expect(graph.getNodes()).toHaveLength(3);
    expect(graph.getEdges()).toHaveLength(2);
    expect(graph.hasEdge(eventNode.id, clientNode.id)).toBe(true);
    expect(graph.getDegree(eventNode.id)).toBe(2);
  });

  test("should traverse graph correctly", () => {
    const graph = buildGraphFromKnownRelationships();

    const eventNode = graph.getNodesByEntity("Event")[0];

    // BFS traversal
    const bfsResult = graph.bfs(eventNode.id, { maxDepth: 2 });
    expect(bfsResult.size).toBeGreaterThan(1);

    // DFS traversal
    const dfsResult = graph.dfs(eventNode.id, { maxDepth: 2 });
    expect(dfsResult.size).toBeGreaterThan(1);
  });

  test("should analyze impact of entity changes", () => {
    const graph = buildGraphFromKnownRelationships();

    const eventNode = graph.getNodesByEntity("Event")[0];
    const impact = graph.analyzeImpact(eventNode.id, { maxDepth: 3 });

    expect(impact.source.entityName).toBe("Event");
    expect(impact.directImpact.length).toBeGreaterThan(0);
    expect(impact.severity).toBeDefined();
  });

  test("should detect cycles in graph", () => {
    const graph = createEntityGraph();

    // Create a simple cycle: A -> B -> C -> A
    const nodeA = createTypeNode("A");
    const nodeB = createTypeNode("B");
    const nodeC = createTypeNode("C");

    graph.addNode(nodeA);
    graph.addNode(nodeB);
    graph.addNode(nodeC);

    graph.addEdge(
      createEdge(nodeA.id, nodeB.id, RelationshipType.Reference, "b")
    );
    graph.addEdge(
      createEdge(nodeB.id, nodeC.id, RelationshipType.Reference, "c")
    );
    graph.addEdge(
      createEdge(nodeC.id, nodeA.id, RelationshipType.Reference, "a")
    );

    const cycles = graph.detectCycles();
    expect(cycles.length).toBeGreaterThan(0);
  });

  test("should find shortest path between entities", () => {
    const graph = buildGraphFromKnownRelationships();

    const eventNode = graph.getNodesByEntity("Event")[0];
    const recipeNode = graph.getNodesByEntity("Recipe")[0];

    const path = graph.findShortestPath(eventNode.id, recipeNode.id);
    expect(path).toBeDefined();
    expect(path?.nodes.length).toBeGreaterThan(0);
  });
});
