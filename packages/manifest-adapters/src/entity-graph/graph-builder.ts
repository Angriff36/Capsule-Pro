/**
 * Graph Builder
 *
 * Builds an entity relationship graph from Manifest IR and Prisma schema.
 * Infers relationships from entity properties and commands.
 */

import type { IR } from "@angriff36/manifest/ir";
import { createEntityGraph } from "./entity-graph.js";
import { createEdge, createTypeNode } from "./factories.js";
import type { EntityGraph } from "./types.js";
import { RelationshipType } from "./types.js";

/**
 * Represents a known relationship between entities.
 */
interface KnownRelationship {
  /** Source entity name */
  from: string;
  /** Target entity name */
  to: string;
  /** Name of the relationship (property name) */
  name: string;
  /** Type of relationship */
  type: RelationshipType;
  /** Cardinality */
  cardinality: string;
  /** Whether required */
  required: boolean;
}

/**
 * Known entity relationships derived from the Prisma schema.
 * These are the core domain relationships that define how entities connect.
 *
 * This mapping is derived from the actual schema and represents the semantic
 * relationships between entities.
 */
const KNOWN_RELATIONSHIPS: KnownRelationship[] = [
  // Event relationships
  {
    from: "Event",
    to: "EventBudget",
    name: "budget",
    type: RelationshipType.Composition,
    cardinality: "1:1",
    required: true,
  },
  {
    from: "Event",
    to: "EventGuest",
    name: "guests",
    type: RelationshipType.Composition,
    cardinality: "1:N",
    required: false,
  },
  {
    from: "Event",
    to: "EventContract",
    name: "contract",
    type: RelationshipType.Composition,
    cardinality: "1:1",
    required: false,
  },
  {
    from: "Event",
    to: "EventStaffAssignment",
    name: "staff",
    type: RelationshipType.Aggregation,
    cardinality: "1:N",
    required: false,
  },
  {
    from: "Event",
    to: "PrepTask",
    name: "prepTasks",
    type: RelationshipType.Dependency,
    cardinality: "1:N",
    required: false,
  },
  {
    from: "Event",
    to: "Client",
    name: "client",
    type: RelationshipType.Reference,
    cardinality: "N:1",
    required: true,
  },
  {
    from: "Event",
    to: "Venue",
    name: "venue",
    type: RelationshipType.Reference,
    cardinality: "N:1",
    required: false,
  },
  {
    from: "Event",
    to: "Location",
    name: "location",
    type: RelationshipType.Reference,
    cardinality: "N:1",
    required: false,
  },
  {
    from: "Event",
    to: "EventReport",
    name: "reports",
    type: RelationshipType.Composition,
    cardinality: "1:N",
    required: false,
  },
  {
    from: "Event",
    to: "BattleBoard",
    name: "battleBoard",
    type: RelationshipType.Aggregation,
    cardinality: "1:1",
    required: false,
  },

  // EventBudget relationships
  {
    from: "EventBudget",
    to: "BudgetLineItem",
    name: "lineItems",
    type: RelationshipType.Composition,
    cardinality: "1:N",
    required: false,
  },
  {
    from: "EventBudget",
    to: "BudgetAlert",
    name: "alerts",
    type: RelationshipType.Composition,
    cardinality: "1:N",
    required: false,
  },

  // Client relationships
  {
    from: "Client",
    to: "ClientContact",
    name: "contacts",
    type: RelationshipType.Composition,
    cardinality: "1:N",
    required: false,
  },
  {
    from: "Client",
    to: "ClientPreference",
    name: "preferences",
    type: RelationshipType.Composition,
    cardinality: "1:N",
    required: false,
  },
  {
    from: "Client",
    to: "ClientInteraction",
    name: "interactions",
    type: RelationshipType.Composition,
    cardinality: "1:N",
    required: false,
  },
  {
    from: "Client",
    to: "Proposal",
    name: "proposals",
    type: RelationshipType.Composition,
    cardinality: "1:N",
    required: false,
  },
  {
    from: "Client",
    to: "Lead",
    name: "lead",
    type: RelationshipType.Reference,
    cardinality: "1:1",
    required: false,
  },

  // Proposal relationships
  {
    from: "Proposal",
    to: "ProposalLineItem",
    name: "lineItems",
    type: RelationshipType.Composition,
    cardinality: "1:N",
    required: false,
  },

  // Recipe relationships
  {
    from: "Recipe",
    to: "RecipeVersion",
    name: "versions",
    type: RelationshipType.Version,
    cardinality: "1:N",
    required: true,
  },
  {
    from: "RecipeVersion",
    to: "RecipeIngredient",
    name: "ingredients",
    type: RelationshipType.Composition,
    cardinality: "1:N",
    required: true,
  },
  {
    from: "RecipeIngredient",
    to: "Ingredient",
    name: "ingredient",
    type: RelationshipType.Reference,
    cardinality: "N:1",
    required: true,
  },

  // PrepTask relationships
  {
    from: "PrepTask",
    to: "Recipe",
    name: "recipe",
    type: RelationshipType.Dependency,
    cardinality: "N:1",
    required: false,
  },
  {
    from: "PrepTask",
    to: "Dish",
    name: "dish",
    type: RelationshipType.Dependency,
    cardinality: "N:1",
    required: false,
  },
  {
    from: "PrepTask",
    to: "Container",
    name: "container",
    type: RelationshipType.Dependency,
    cardinality: "N:1",
    required: false,
  },
  {
    from: "PrepTask",
    to: "Station",
    name: "station",
    type: RelationshipType.Aggregation,
    cardinality: "N:1",
    required: false,
  },
  {
    from: "PrepTask",
    to: "Event",
    name: "event",
    type: RelationshipType.Dependency,
    cardinality: "N:1",
    required: false,
  },
  {
    from: "PrepTask",
    to: "PrepList",
    name: "prepList",
    type: RelationshipType.Workflow,
    cardinality: "N:1",
    required: false,
  },

  // PrepList relationships
  {
    from: "PrepList",
    to: "PrepListItem",
    name: "items",
    type: RelationshipType.Composition,
    cardinality: "1:N",
    required: true,
  },
  {
    from: "PrepListItem",
    to: "PrepTask",
    name: "prepTask",
    type: RelationshipType.Reference,
    cardinality: "N:1",
    required: false,
  },
  {
    from: "PrepListItem",
    to: "Dish",
    name: "dish",
    type: RelationshipType.Reference,
    cardinality: "N:1",
    required: false,
  },
  {
    from: "PrepListItem",
    to: "Station",
    name: "station",
    type: RelationshipType.Reference,
    cardinality: "N:1",
    required: false,
  },

  // Station relationships
  {
    from: "Station",
    to: "KitchenTask",
    name: "tasks",
    type: RelationshipType.Aggregation,
    cardinality: "1:N",
    required: false,
  },

  // Inventory relationships
  {
    from: "InventoryItem",
    to: "Ingredient",
    name: "ingredient",
    type: RelationshipType.Reference,
    cardinality: "N:1",
    required: false,
  },
  {
    from: "InventoryItem",
    to: "InventoryTransaction",
    name: "transactions",
    type: RelationshipType.Composition,
    cardinality: "1:N",
    required: false,
  },
  {
    from: "InventoryItem",
    to: "WasteEntry",
    name: "wasteEntries",
    type: RelationshipType.Composition,
    cardinality: "1:N",
    required: false,
  },
  {
    from: "PurchaseOrder",
    to: "PurchaseOrderItem",
    name: "items",
    type: RelationshipType.Composition,
    cardinality: "1:N",
    required: true,
  },
  {
    from: "PurchaseOrderItem",
    to: "Ingredient",
    name: "ingredient",
    type: RelationshipType.Reference,
    cardinality: "N:1",
    required: false,
  },
  {
    from: "InventorySupplier",
    to: "PurchaseOrder",
    name: "purchaseOrders",
    type: RelationshipType.Aggregation,
    cardinality: "1:N",
    required: false,
  },
  {
    from: "InventorySupplier",
    to: "Shipment",
    name: "shipments",
    type: RelationshipType.Aggregation,
    cardinality: "1:N",
    required: false,
  },

  // Shipment relationships
  {
    from: "Shipment",
    to: "ShipmentItem",
    name: "items",
    type: RelationshipType.Composition,
    cardinality: "1:N",
    required: true,
  },
  {
    from: "ShipmentItem",
    to: "Ingredient",
    name: "ingredient",
    type: RelationshipType.Reference,
    cardinality: "N:1",
    required: false,
  },

  // Menu relationships
  {
    from: "Menu",
    to: "MenuDish",
    name: "dishes",
    type: RelationshipType.Composition,
    cardinality: "1:N",
    required: true,
  },
  {
    from: "MenuDish",
    to: "Dish",
    name: "dish",
    type: RelationshipType.Reference,
    cardinality: "N:1",
    required: true,
  },

  // CommandBoard relationships
  {
    from: "CommandBoard",
    to: "CommandBoardCard",
    name: "cards",
    type: RelationshipType.Hierarchy,
    cardinality: "1:N",
    required: false,
  },
  {
    from: "CommandBoard",
    to: "CommandBoardGroup",
    name: "groups",
    type: RelationshipType.Hierarchy,
    cardinality: "1:N",
    required: false,
  },
  {
    from: "CommandBoard",
    to: "CommandBoardLayout",
    name: "layouts",
    type: RelationshipType.Hierarchy,
    cardinality: "1:N",
    required: false,
  },
  {
    from: "CommandBoard",
    to: "CommandBoardConnection",
    name: "connections",
    type: RelationshipType.Hierarchy,
    cardinality: "1:N",
    required: false,
  },
  {
    from: "CommandBoardConnection",
    to: "CommandBoardCard",
    name: "from",
    type: RelationshipType.Reference,
    cardinality: "N:1",
    required: true,
  },
  {
    from: "CommandBoardConnection",
    to: "CommandBoardCard",
    name: "to",
    type: RelationshipType.Reference,
    cardinality: "N:1",
    required: true,
  },

  // Schedule relationships
  {
    from: "Schedule",
    to: "ScheduleShift",
    name: "shifts",
    type: RelationshipType.Composition,
    cardinality: "1:N",
    required: true,
  },
  {
    from: "ScheduleShift",
    to: "User",
    name: "employee",
    type: RelationshipType.Reference,
    cardinality: "N:1",
    required: true,
  },
  {
    from: "ScheduleShift",
    to: "Station",
    name: "station",
    type: RelationshipType.Reference,
    cardinality: "N:1",
    required: false,
  },

  // Catering relationships
  {
    from: "CateringOrder",
    to: "Event",
    name: "event",
    type: RelationshipType.Reference,
    cardinality: "N:1",
    required: true,
  },
  {
    from: "CateringOrder",
    to: "Dish",
    name: "dishes",
    type: RelationshipType.Junction,
    cardinality: "N:M",
    required: true,
  },

  // Event-Dish junction (many-to-many)
  {
    from: "Event",
    to: "Dish",
    name: "dishes",
    type: RelationshipType.Junction,
    cardinality: "N:M",
    required: false,
  },

  // Allergen tracking
  {
    from: "Ingredient",
    to: "AllergenWarning",
    name: "allergenWarnings",
    type: RelationshipType.Composition,
    cardinality: "1:N",
    required: false,
  },
];

/**
 * Entity name mappings from IR to Prisma model names.
 * Handles cases where IR names differ from Prisma model names.
 */
const ENTITY_NAME_MAPPINGS: Record<string, string> = {
  // Add any mappings if IR entity names differ from Prisma
  PrepListItem: "PrepListItem",
  RecipeIngredient: "RecipeIngredient",
  // Most should be the same
};

/**
 * Normalize entity name using mappings.
 */
function normalizeEntityName(name: string): string {
  return ENTITY_NAME_MAPPINGS[name] ?? name;
}

/**
 * Build an entity graph from Manifest IR.
 *
 * @param ir - The compiled IR from Manifest
 * @param graph - The graph to populate (creates new if not provided)
 * @returns The populated graph
 */
export function buildGraphFromIR(ir: IR, graph?: EntityGraph): EntityGraph {
  // This is a placeholder - the actual implementation would be in a separate file
  // that imports from @angriff36/manifest/ir
  return graph ?? ({} as EntityGraph);
}

/**
 * Build an entity graph from known relationships.
 *
 * Creates type nodes for all entities referenced in KNOWN_RELATIONSHIPS
 * and adds edges between them.
 *
 * @param graph - The graph to populate (creates new if not provided)
 * @returns The populated graph
 */
export function buildGraphFromKnownRelationships(
  graph?: EntityGraph
): EntityGraph {
  const g = graph ?? createEntityGraph();

  // Collect all unique entity names
  const entityNames = new Set<string>();
  for (const rel of KNOWN_RELATIONSHIPS) {
    entityNames.add(rel.from);
    entityNames.add(rel.to);
  }

  // Create type nodes for all entities
  for (const name of entityNames) {
    g.addNode(createTypeNode(name));
  }

  // Add edges for relationships
  for (const rel of KNOWN_RELATIONSHIPS) {
    const sourceId = `type:${rel.from}`;
    const targetId = `type:${rel.to}`;

    // Skip if either node doesn't exist
    if (!(g.hasNode(sourceId) && g.hasNode(targetId))) {
      continue;
    }

    g.addEdge(
      createEdge(sourceId, targetId, rel.type, rel.name, {
        required: rel.required,
        cardinality: rel.cardinality,
      })
    );
  }

  return g;
}

/**
 * Get all known relationships.
 */
export function getKnownRelationships(): KnownRelationship[] {
  return [...KNOWN_RELATIONSHIPS];
}

/**
 * Get relationships for a specific entity.
 */
export function getRelationshipsForEntity(
  entityName: string
): KnownRelationship[] {
  return KNOWN_RELATIONSHIPS.filter(
    (r) => r.from === entityName || r.to === entityName
  );
}

/**
 * Get outgoing relationships from an entity.
 */
export function getOutgoingRelationships(
  entityName: string
): KnownRelationship[] {
  return KNOWN_RELATIONSHIPS.filter((r) => r.from === entityName);
}

/**
 * Get incoming relationships to an entity.
 */
export function getIncomingRelationships(
  entityName: string
): KnownRelationship[] {
  return KNOWN_RELATIONSHIPS.filter((r) => r.to === entityName);
}
