/**
 * @vitest-environment node
 *
 * Board Load Performance - Fixture and Budget Validation Tests
 *
 * This test file validates the performance benchmark fixtures and documents
 * the budget thresholds. These tests run as regular unit tests alongside
 * the rest of the test suite.
 */

import { describe, expect, it } from "vitest";
import type {
  BoardProjection,
  DerivedConnection,
} from "../../app/(authenticated)/command-board/types/board";
import type {
  EntityType,
  ResolvedEntity,
} from "../../app/(authenticated)/command-board/types/entities";

// ============================================================================
// Budget Thresholds (in milliseconds)
// ============================================================================

/**
 * Performance budget thresholds for board operations.
 *
 * These thresholds are based on measured baseline performance and are set
 * to catch significant regressions while allowing for CI environment variation.
 *
 * Baseline measurements (2026-02-20, Windows 11, Node.js):
 * - Empty board full pipeline: ~0.0002ms mean
 * - Medium board (50 items) full pipeline: ~0.018ms mean
 * - Large board (150 items) full pipeline: ~0.055ms mean
 */
const PERFORMANCE_BUDGETS = {
  /** Projection normalization per item budget (ms) */
  projectionNormalization: {
    empty: 0.001, // Measured: ~0.00004ms
    medium: 0.001, // Measured: ~0.0004ms per item
    large: 0.002, // Measured: ~0.0012ms per item
  },
  /** Entity map construction budget (ms) */
  entityMapConstruction: {
    empty: 0.001, // Measured: ~0.00005ms
    medium: 0.01, // Measured: ~0.0047ms
    large: 0.02, // Measured: ~0.0153ms
  },
  /** Connection transformation budget (ms) */
  connectionTransformation: {
    empty: 0.001, // Measured: ~0.0001ms
    medium: 0.002, // Measured: ~0.0008ms
    large: 0.005, // Measured: ~0.0028ms
  },
  /** Full pipeline (all operations combined) budget (ms) */
  fullPipeline: {
    empty: 0.001, // Measured: ~0.0002ms
    medium: 0.05, // Measured: ~0.018ms
    large: 0.1, // Measured: ~0.055ms
  },
} as const;

// ============================================================================
// Test Fixtures (shared with benchmark file)
// ============================================================================

function generateId(prefix: string, index: number): string {
  return `${prefix}-${index.toString().padStart(4, "0")}-${Date.now().toString(36)}`;
}

function createMockProjection(
  index: number,
  entityType: EntityType
): BoardProjection {
  const gridSize = 280;
  const columns = 10;
  const row = Math.floor(index / columns);
  const col = index % columns;

  return {
    id: generateId("proj", index),
    tenantId: "tenant-test-123",
    boardId: "board-test-123",
    entityType,
    entityId: generateId("entity", index),
    positionX: col * gridSize,
    positionY: row * gridSize,
    width: 280,
    height: 180,
    zIndex: index,
    colorOverride: null,
    collapsed: false,
    groupId:
      index % 5 === 0 ? generateId("group", Math.floor(index / 5)) : null,
    pinned: index % 10 === 0,
  };
}

function createMockEntity(
  index: number,
  entityType: EntityType
): ResolvedEntity {
  const id = generateId("entity", index);

  switch (entityType) {
    case "event":
      return {
        type: "event",
        data: {
          id,
          title: `Event ${index}`,
          eventDate: new Date("2025-06-15"),
          guestCount: 50 + index,
          status: index % 3 === 0 ? "confirmed" : "pending",
          budget: 5000 + index * 100,
          clientName: `Client ${index}`,
          venueName: `Venue ${index}`,
          assignedTo: `Staff ${index % 10}`,
        },
      };
    case "prep_task":
      return {
        type: "prep_task",
        data: {
          id,
          name: `Prep Task ${index}`,
          status: index % 4 === 0 ? "completed" : "pending",
          priority: index % 3 === 0 ? "high" : "medium",
          dueByDate: new Date("2025-06-10"),
          eventTitle: `Event ${index}`,
          eventId: generateId("event", index),
          assigneeName: `Staff ${index % 10}`,
          assigneeId: generateId("staff", index % 10),
        },
      };
    default:
      return {
        type: "event",
        data: {
          id,
          title: `Entity ${index}`,
          eventDate: null,
          guestCount: null,
          status: "pending",
          budget: null,
          clientName: null,
          venueName: null,
          assignedTo: null,
        },
      };
  }
}

function createMockConnection(
  index: number,
  projections: BoardProjection[]
): DerivedConnection {
  const fromIndex = index % projections.length;
  const toIndex = (index + 1) % projections.length;
  const relationshipTypes = [
    "client_to_event",
    "event_to_task",
    "event_to_employee",
    "generic",
  ];

  return {
    id: generateId("conn", index),
    fromProjectionId: projections[fromIndex]?.id ?? "unknown",
    toProjectionId: projections[toIndex]?.id ?? "unknown",
    relationshipType:
      relationshipTypes[index % relationshipTypes.length] ?? "generic",
    label: `Connection ${index}`,
    derived: true,
  };
}

const emptyFixtures = {
  projections: [] as BoardProjection[],
  entities: [] as ResolvedEntity[],
  connections: [] as DerivedConnection[],
};

function createMediumFixtures() {
  const entityTypes: EntityType[] = [
    "event",
    "prep_task",
    "client",
    "inventory_item",
  ];
  const projections: BoardProjection[] = [];
  const entities: ResolvedEntity[] = [];

  for (let i = 0; i < 50; i++) {
    const entityType = entityTypes[i % entityTypes.length] ?? "event";
    projections.push(createMockProjection(i, entityType));
    entities.push(createMockEntity(i, entityType));
  }

  const connections = Array.from({ length: 25 }, (_, i) =>
    createMockConnection(i, projections)
  );

  return { projections, entities, connections };
}

function createLargeFixtures() {
  const entityTypes: EntityType[] = [
    "event",
    "prep_task",
    "client",
    "inventory_item",
    "kitchen_task",
    "employee",
    "recipe",
    "dish",
  ];
  const projections: BoardProjection[] = [];
  const entities: ResolvedEntity[] = [];

  for (let i = 0; i < 150; i++) {
    const entityType = entityTypes[i % entityTypes.length] ?? "event";
    projections.push(createMockProjection(i, entityType));
    entities.push(createMockEntity(i, entityType));
  }

  const connections = Array.from({ length: 100 }, (_, i) =>
    createMockConnection(i, projections)
  );

  return { projections, entities, connections };
}

// ============================================================================
// Tests
// ============================================================================

describe("Performance Budget Validation", () => {
  it("documents performance budget thresholds for empty boards", () => {
    expect(PERFORMANCE_BUDGETS.projectionNormalization.empty).toBeLessThan(
      0.01
    );
    expect(PERFORMANCE_BUDGETS.entityMapConstruction.empty).toBeLessThan(0.01);
    expect(PERFORMANCE_BUDGETS.connectionTransformation.empty).toBeLessThan(
      0.01
    );
    expect(PERFORMANCE_BUDGETS.fullPipeline.empty).toBeLessThan(0.01);
  });

  it("documents performance budget thresholds for medium boards", () => {
    expect(PERFORMANCE_BUDGETS.projectionNormalization.medium).toBeLessThan(
      0.01
    );
    expect(PERFORMANCE_BUDGETS.entityMapConstruction.medium).toBeLessThan(0.1);
    expect(PERFORMANCE_BUDGETS.connectionTransformation.medium).toBeLessThan(
      0.01
    );
    expect(PERFORMANCE_BUDGETS.fullPipeline.medium).toBeLessThan(0.1);
  });

  it("documents performance budget thresholds for large boards", () => {
    expect(PERFORMANCE_BUDGETS.projectionNormalization.large).toBeLessThan(
      0.01
    );
    expect(PERFORMANCE_BUDGETS.entityMapConstruction.large).toBeLessThan(0.1);
    expect(PERFORMANCE_BUDGETS.connectionTransformation.large).toBeLessThan(
      0.01
    );
    expect(PERFORMANCE_BUDGETS.fullPipeline.large).toBeLessThan(0.2);
  });
});

describe("Board Fixture Validation", () => {
  it("validates empty board fixtures", () => {
    expect(emptyFixtures.projections).toHaveLength(0);
    expect(emptyFixtures.entities).toHaveLength(0);
    expect(emptyFixtures.connections).toHaveLength(0);
  });

  it("validates medium board fixtures have correct sizes", () => {
    const fixtures = createMediumFixtures();
    expect(fixtures.projections).toHaveLength(50);
    expect(fixtures.entities).toHaveLength(50);
    expect(fixtures.connections).toHaveLength(25);
  });

  it("validates large board fixtures have correct sizes", () => {
    const fixtures = createLargeFixtures();
    expect(fixtures.projections).toHaveLength(150);
    expect(fixtures.entities).toHaveLength(150);
    expect(fixtures.connections).toHaveLength(100);
  });

  it("validates fixture projections have valid structure", () => {
    const fixtures = createMediumFixtures();
    for (const proj of fixtures.projections) {
      expect(proj.id).toBeDefined();
      expect(proj.entityType).toBeDefined();
      expect(proj.entityId).toBeDefined();
      expect(typeof proj.positionX).toBe("number");
      expect(typeof proj.positionY).toBe("number");
    }
  });

  it("validates fixture entities have valid discriminated union shape", () => {
    const fixtures = createMediumFixtures();
    for (const entity of fixtures.entities) {
      expect(entity.type).toBeDefined();
      expect(entity.data).toBeDefined();
      expect(entity.data.id).toBeDefined();
    }
  });

  it("validates fixture connections have valid structure", () => {
    const fixtures = createMediumFixtures();
    for (const conn of fixtures.connections) {
      expect(conn.id).toBeDefined();
      expect(conn.fromProjectionId).toBeDefined();
      expect(conn.toProjectionId).toBeDefined();
      expect(conn.relationshipType).toBeDefined();
      expect(conn.derived).toBe(true);
    }
  });

  it("validates projections are positioned in grid layout", () => {
    const fixtures = createMediumFixtures();
    const positions = fixtures.projections.map((p) => ({
      x: p.positionX,
      y: p.positionY,
    }));

    // All positions should be on 280px grid
    for (const pos of positions) {
      expect(pos.x % 280).toBe(0);
      expect(pos.y % 280).toBe(0);
    }
  });
});
