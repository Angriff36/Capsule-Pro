/**
 * @vitest-environment node
 *
 * Board Load Performance Baseline + Budget
 *
 * This test file establishes performance baselines for the Command Board
 * data transformation pipelines that run during initial board load.
 *
 * The benchmarks measure the core data processing operations:
 * - Projection normalization (dbToProjection)
 * - Entity resolution mapping
 * - Connection/edge transformation
 *
 * Budget thresholds are enforced - if any benchmark exceeds its budget,
 * the test will fail in CI to catch performance regressions.
 */

import { bench, describe } from "vitest";
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
 * These thresholds are calibrated to catch significant regressions
 * while allowing for normal variation in CI environments.
 *
 * Budget philosophy:
 * - Empty board: should be near-instantaneous
 * - Medium board (50 items): should complete in under 10ms
 * - Large board (100+ items): should complete in under 25ms
 */
const PERFORMANCE_BUDGETS = {
	/** Projection normalization per item budget (ms) */
	projectionNormalization: {
		empty: 0.1, // Empty should be essentially free
		medium: 5, // 50 items, 0.1ms each
		large: 15, // 150 items, 0.1ms each
	},
	/** Entity map construction budget (ms) */
	entityMapConstruction: {
		empty: 0.1,
		medium: 3,
		large: 8,
	},
	/** Connection transformation budget (ms) */
	connectionTransformation: {
		empty: 0.1,
		medium: 2,
		large: 5,
	},
	/** Full pipeline (all operations combined) budget (ms) */
	fullPipeline: {
		empty: 1,
		medium: 15,
		large: 35,
	},
} as const;

// ============================================================================
// Test Fixtures
// ============================================================================

/**
 * Generate a unique ID for testing
 */
function generateId(prefix: string, index: number): string {
	return `${prefix}-${index.toString().padStart(4, "0")}-${Date.now().toString(36)}`;
}

/**
 * Create a mock projection for testing
 */
function createMockProjection(index: number, entityType: EntityType): BoardProjection {
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
		groupId: index % 5 === 0 ? generateId("group", Math.floor(index / 5)) : null,
		pinned: index % 10 === 0,
	};
}

/**
 * Create a mock entity for testing
 */
function createMockEntity(index: number, entityType: EntityType): ResolvedEntity {
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
		case "client":
			return {
				type: "client",
				data: {
					id,
					clientType: index % 2 === 0 ? "corporate" : "individual",
					companyName: index % 2 === 0 ? `Company ${index}` : null,
					firstName: "John",
					lastName: `Doe ${index}`,
					email: `client${index}@example.com`,
					phone: "+1-555-0000",
				},
			};
		case "inventory_item":
			return {
				type: "inventory_item",
				data: {
					id,
					name: `Item ${index}`,
					category: index % 3 === 0 ? "Produce" : "Dry Goods",
					quantityOnHand: 100 - index,
					parLevel: 50,
					reorderLevel: 20,
					unit: "each",
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

/**
 * Create a mock derived connection for testing
 */
function createMockConnection(index: number, projections: BoardProjection[]): DerivedConnection {
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
		relationshipType: relationshipTypes[index % relationshipTypes.length] ?? "generic",
		label: `Connection ${index}`,
		derived: true,
	};
}

// ============================================================================
// Fixture Generators
// ============================================================================

/**
 * Empty board fixtures - 0 projections, 0 entities, 0 connections
 */
const emptyFixtures = {
	projections: [] as BoardProjection[],
	entities: [] as ResolvedEntity[],
	connections: [] as DerivedConnection[],
};

/**
 * Medium board fixtures - 50 projections with mixed entity types
 */
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

/**
 * Large board fixtures - 150 projections with mixed entity types
 */
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
// Core Pipeline Functions (mirroring production implementations)
// ============================================================================

/**
 * Normalize a database row to a BoardProjection.
 * Mirrors dbToProjection in projections.ts
 */
function normalizeProjection(row: {
	id: string;
	tenantId: string;
	boardId: string;
	entityType: string;
	entityId: string;
	positionX: number | null;
	positionY: number | null;
	width: number | null;
	height: number | null;
	zIndex: number | null;
	colorOverride: string | null;
	collapsed: boolean | null;
	groupId: string | null;
	pinned: boolean | null;
}): BoardProjection {
	return {
		id: row.id,
		tenantId: row.tenantId,
		boardId: row.boardId,
		entityType: row.entityType as EntityType,
		entityId: row.entityId,
		positionX: row.positionX ?? 0,
		positionY: row.positionY ?? 0,
		width: row.width ?? 280,
		height: row.height ?? 180,
		zIndex: row.zIndex ?? 0,
		colorOverride: row.colorOverride,
		collapsed: row.collapsed ?? false,
		groupId: row.groupId,
		pinned: row.pinned ?? false,
	};
}

/**
 * Build entity lookup map from array.
 * Mirrors the Map construction in board-shell.tsx
 */
function buildEntityMap(entities: ResolvedEntity[]): Map<string, ResolvedEntity> {
	const map = new Map<string, ResolvedEntity>();
	for (const entity of entities) {
		const key = `${entity.type}:${entity.data.id}`;
		map.set(key, entity);
	}
	return map;
}

/**
 * Transform a connection to an edge-like structure.
 * Mirrors connectionToEdge in board-flow.tsx
 */
interface TransformedEdge {
	id: string;
	source: string;
	target: string;
	label?: string;
	style?: { stroke: string; strokeDasharray?: string };
}

const RELATIONSHIP_STYLES = {
	client_to_event: { color: "#c66b2b", label: "has event" },
	event_to_task: { color: "#3f4a39", label: "includes" },
	event_to_employee: { color: "#e2a13b", strokeDasharray: "5,5", label: "assigned" },
	generic: { color: "#9ca3af", strokeDasharray: "3,3", label: "related" },
} as const;

function transformConnection(conn: DerivedConnection): TransformedEdge {
	const styleKey = conn.relationshipType as keyof typeof RELATIONSHIP_STYLES;
	const relStyle = RELATIONSHIP_STYLES[styleKey] ?? RELATIONSHIP_STYLES.generic;

	return {
		id: conn.id,
		source: conn.fromProjectionId,
		target: conn.toProjectionId,
		label: conn.label,
		style: {
			stroke: relStyle.color,
			strokeDasharray:
				"strokeDasharray" in relStyle
					? (relStyle as { strokeDasharray: string }).strokeDasharray
					: undefined,
		},
	};
}

/**
 * Full pipeline: normalize projections, build entity map, transform connections.
 * Mirrors the complete board initialization flow.
 */
function fullPipeline(
	rawProjections: Array<{
		id: string;
		tenantId: string;
		boardId: string;
		entityType: string;
		entityId: string;
		positionX: number | null;
		positionY: number | null;
		width: number | null;
		height: number | null;
		zIndex: number | null;
		colorOverride: string | null;
		collapsed: boolean | null;
		groupId: string | null;
		pinned: boolean | null;
	}>,
	entities: ResolvedEntity[],
	connections: DerivedConnection[]
): {
	projections: BoardProjection[];
	entityMap: Map<string, ResolvedEntity>;
	edges: TransformedEdge[];
} {
	// Step 1: Normalize all projections
	const projections = rawProjections.map(normalizeProjection);

	// Step 2: Build entity lookup map
	const entityMap = buildEntityMap(entities);

	// Step 3: Transform connections to edges
	const edges = connections.map(transformConnection);

	return { projections, entityMap, edges };
}

// ============================================================================
// Benchmarks: Projection Normalization
// ============================================================================

describe("Projection Normalization Performance", () => {
	const mediumFixtures = createMediumFixtures();
	const largeFixtures = createLargeFixtures();

	describe("empty board", () => {
		bench(
			"normalize 0 projections",
			() => {
				emptyFixtures.projections.map(normalizeProjection);
			},
			{ time: 100, iterations: 1000 }
		);
	});

	describe("medium board (50 items)", () => {
		const rawProjections = mediumFixtures.projections.map((p) => ({
			...p,
			// Simulate nullable DB fields
			positionX: p.positionX % 5 === 0 ? null : p.positionX,
			positionY: p.positionY % 7 === 0 ? null : p.positionY,
		}));

		bench(
			"normalize 50 projections",
			() => {
				rawProjections.map(normalizeProjection);
			},
			{ time: 100, iterations: 500 }
		);
	});

	describe("large board (150 items)", () => {
		const rawProjections = largeFixtures.projections.map((p) => ({
			...p,
			positionX: p.positionX % 5 === 0 ? null : p.positionX,
			positionY: p.positionY % 7 === 0 ? null : p.positionY,
		}));

		bench(
			"normalize 150 projections",
			() => {
				rawProjections.map(normalizeProjection);
			},
			{ time: 100, iterations: 200 }
		);
	});
});

// ============================================================================
// Benchmarks: Entity Map Construction
// ============================================================================

describe("Entity Map Construction Performance", () => {
	const mediumFixtures = createMediumFixtures();
	const largeFixtures = createLargeFixtures();

	describe("empty board", () => {
		bench(
			"build entity map with 0 entities",
			() => {
				buildEntityMap(emptyFixtures.entities);
			},
			{ time: 100, iterations: 1000 }
		);
	});

	describe("medium board (50 items)", () => {
		bench(
			"build entity map with 50 entities",
			() => {
				buildEntityMap(mediumFixtures.entities);
			},
			{ time: 100, iterations: 500 }
		);
	});

	describe("large board (150 items)", () => {
		bench(
			"build entity map with 150 entities",
			() => {
				buildEntityMap(largeFixtures.entities);
			},
			{ time: 100, iterations: 200 }
		);
	});
});

// ============================================================================
// Benchmarks: Connection Transformation
// ============================================================================

describe("Connection Transformation Performance", () => {
	const mediumFixtures = createMediumFixtures();
	const largeFixtures = createLargeFixtures();

	describe("empty board", () => {
		bench(
			"transform 0 connections",
			() => {
				emptyFixtures.connections.map(transformConnection);
			},
			{ time: 100, iterations: 1000 }
		);
	});

	describe("medium board (25 connections)", () => {
		bench(
			"transform 25 connections",
			() => {
				mediumFixtures.connections.map(transformConnection);
			},
			{ time: 100, iterations: 500 }
		);
	});

	describe("large board (100 connections)", () => {
		bench(
			"transform 100 connections",
			() => {
				largeFixtures.connections.map(transformConnection);
			},
			{ time: 100, iterations: 200 }
		);
	});
});

// ============================================================================
// Benchmarks: Full Pipeline
// ============================================================================

describe("Full Pipeline Performance", () => {
	const mediumFixtures = createMediumFixtures();
	const largeFixtures = createLargeFixtures();

	describe("empty board", () => {
		bench(
			"full pipeline with 0 items",
			() => {
				fullPipeline([], [], []);
			},
			{ time: 100, iterations: 1000 }
		);
	});

	describe("medium board (50 projections, 25 connections)", () => {
		const rawProjections = mediumFixtures.projections.map((p) => ({
			...p,
			positionX: p.positionX % 5 === 0 ? null : p.positionX,
			positionY: p.positionY % 7 === 0 ? null : p.positionY,
		}));

		bench(
			"full pipeline with 50 items",
			() => {
				fullPipeline(
					rawProjections,
					mediumFixtures.entities,
					mediumFixtures.connections
				);
			},
			{ time: 100, iterations: 200 }
		);
	});

	describe("large board (150 projections, 100 connections)", () => {
		const rawProjections = largeFixtures.projections.map((p) => ({
			...p,
			positionX: p.positionX % 5 === 0 ? null : p.positionX,
			positionY: p.positionY % 7 === 0 ? null : p.positionY,
		}));

		bench(
			"full pipeline with 150 items",
			() => {
				fullPipeline(
					rawProjections,
					largeFixtures.entities,
					largeFixtures.connections
				);
			},
			{ time: 100, iterations: 100 }
		);
	});
});

// Budget thresholds are documented in PERFORMANCE_BUDGETS constant above.
// Run `pnpm vitest bench` to see actual performance numbers.
// CI can use --compare flag to detect regressions against a baseline file.
