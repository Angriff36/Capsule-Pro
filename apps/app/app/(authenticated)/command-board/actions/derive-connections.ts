"use server";

import { database } from "@repo/database";
import { requireTenantId } from "../../../lib/tenant";
import type { DerivedConnection } from "../types/board";
import type { Conflict } from "../conflict-types";
import type { ResolvedFinancialProjection } from "../types/entities";

// ============================================================================
// Derived Connection Engine
// ============================================================================
// Derives connections between board projections based on real database
// relationships (foreign keys). Instead of users manually drawing lines,
// this queries actual relationships and returns connections where BOTH
// endpoints are present on the board.
// ============================================================================

/** Reference to a projection on the board, used as input for derivation */
interface ProjectionRef {
  id: string;
  entityType: string;
  entityId: string;
}

/**
 * Derive connections between board projections based on real database
 * relationships. Only returns connections where BOTH endpoints exist
 * in the provided projections array.
 *
 * Relationships derived:
 * - Client → Event (Event.clientId)
 * - Event → PrepTask (PrepTask.eventId)
 * - Event → Employee (EventStaffAssignment join table)
 * - Event → Shipment (Shipment.eventId)
 * - Client → Proposal (Proposal.clientId)
 * - Risk → Affected Entity (from conflict detection data)
 * - Dish ↔ Recipe (Dish.recipeId foreign key)
 * - Financial Projection → Events (from derived financial projection data)
 */
export async function deriveConnections(
  projections: ProjectionRef[],
  conflicts?: Conflict[],
  financialProjections?: ResolvedFinancialProjection[]
): Promise<DerivedConnection[]> {
  try {
    const tenantId = await requireTenantId();

    if (projections.length === 0) {
      return [];
    }

    // Build lookup maps: "entityType:entityId" → ProjectionRef
    const lookupMap = new Map<string, ProjectionRef>();
    const byType = new Map<string, ProjectionRef[]>();

    for (const proj of projections) {
      lookupMap.set(`${proj.entityType}:${proj.entityId}`, proj);
      const list = byType.get(proj.entityType) ?? [];
      list.push(proj);
      byType.set(proj.entityType, list);
    }

    // Helper to get entity IDs for a given type
    const idsForType = (type: string): string[] =>
      (byType.get(type) ?? []).map((p) => p.entityId);

    // Helper to find a projection by entity type + entity ID
    const findProj = (
      type: string,
      entityId: string
    ): ProjectionRef | undefined => lookupMap.get(`${type}:${entityId}`);

    const connections: DerivedConnection[] = [];
    const seen = new Set<string>();

    // Helper to add a connection, deduplicating by deterministic ID
    const addConnection = (
      fromProj: ProjectionRef,
      toProj: ProjectionRef,
      relationshipType: string,
      label: string
    ) => {
      const id = `${fromProj.id}-${toProj.id}-${relationshipType}`;
      if (seen.has(id)) {
        return;
      }
      seen.add(id);
      connections.push({
        id,
        fromProjectionId: fromProj.id,
        toProjectionId: toProj.id,
        relationshipType,
        label,
        derived: true,
      });
    };

    // Determine which relationship queries to run based on which entity
    // types actually have projections on the board
    const hasClients = (byType.get("client")?.length ?? 0) > 0;
    const hasEvents = (byType.get("event")?.length ?? 0) > 0;
    const hasEmployees = (byType.get("employee")?.length ?? 0) > 0;
    const hasPrepTasks = (byType.get("prep_task")?.length ?? 0) > 0;
    const hasShipments = (byType.get("shipment")?.length ?? 0) > 0;
    const hasProposals = (byType.get("proposal")?.length ?? 0) > 0;
    const hasRisks = (byType.get("risk")?.length ?? 0) > 0;
    const hasRecipes = (byType.get("recipe")?.length ?? 0) > 0;
    const hasDishes = (byType.get("dish")?.length ?? 0) > 0;
    const hasFinancialProjections =
      (byType.get("financial_projection")?.length ?? 0) > 0;

    // Build parallel query array — only query relationships where both
    // endpoint types have projections on the board
    const queries: Array<() => Promise<void>> = [];

    // 1. Client → Event: Event has clientId
    if (hasClients && hasEvents) {
      queries.push(async () => {
        try {
          const clientIds = idsForType("client");
          const eventIds = idsForType("event");

          const events = await database.event.findMany({
            where: {
              tenantId,
              id: { in: eventIds },
              clientId: { in: clientIds },
              deletedAt: null,
            },
            select: { id: true, clientId: true },
          });

          for (const event of events) {
            if (!event.clientId) {
              continue;
            }
            const clientProj = findProj("client", event.clientId);
            const eventProj = findProj("event", event.id);
            if (clientProj && eventProj) {
              addConnection(
                clientProj,
                eventProj,
                "client_to_event",
                "has event"
              );
            }
          }
        } catch (error) {
          console.error(
            "[derive-connections] Failed to derive client→event connections:",
            error
          );
        }
      });
    }

    // 2. Event → PrepTask: PrepTask has eventId
    if (hasEvents && hasPrepTasks) {
      queries.push(async () => {
        try {
          const eventIds = idsForType("event");
          const prepTaskIds = idsForType("prep_task");

          const prepTasks = await database.prepTask.findMany({
            where: {
              tenantId,
              id: { in: prepTaskIds },
              eventId: { in: eventIds },
              deletedAt: null,
            },
            select: { id: true, eventId: true },
          });

          for (const task of prepTasks) {
            const eventProj = findProj("event", task.eventId);
            const taskProj = findProj("prep_task", task.id);
            if (eventProj && taskProj) {
              addConnection(eventProj, taskProj, "event_to_task", "includes");
            }
          }
        } catch (error) {
          console.error(
            "[derive-connections] Failed to derive event→prepTask connections:",
            error
          );
        }
      });
    }

    // 3. Event → Employee: EventStaffAssignment join table
    if (hasEvents && hasEmployees) {
      queries.push(async () => {
        try {
          const eventIds = idsForType("event");
          const employeeIds = idsForType("employee");

          const assignments = await database.eventStaffAssignment.findMany({
            where: {
              tenantId,
              eventId: { in: eventIds },
              employeeId: { in: employeeIds },
              deletedAt: null,
            },
            select: { eventId: true, employeeId: true },
          });

          for (const assignment of assignments) {
            const eventProj = findProj("event", assignment.eventId);
            const employeeProj = findProj("employee", assignment.employeeId);
            if (eventProj && employeeProj) {
              // Deduplicated by addConnection — multiple roles on same
              // event produce only one connection
              addConnection(
                eventProj,
                employeeProj,
                "event_to_employee",
                "assigned"
              );
            }
          }
        } catch (error) {
          console.error(
            "[derive-connections] Failed to derive event→employee connections:",
            error
          );
        }
      });
    }

    // 4. Event → Shipment: Shipment has eventId
    if (hasEvents && hasShipments) {
      queries.push(async () => {
        try {
          const eventIds = idsForType("event");
          const shipmentIds = idsForType("shipment");

          const shipments = await database.shipment.findMany({
            where: {
              tenantId,
              id: { in: shipmentIds },
              eventId: { in: eventIds },
              deletedAt: null,
            },
            select: { id: true, eventId: true },
          });

          for (const shipment of shipments) {
            if (!shipment.eventId) {
              continue;
            }
            const eventProj = findProj("event", shipment.eventId);
            const shipmentProj = findProj("shipment", shipment.id);
            if (eventProj && shipmentProj) {
              addConnection(
                eventProj,
                shipmentProj,
                "event_to_shipment",
                "delivery"
              );
            }
          }
        } catch (error) {
          console.error(
            "[derive-connections] Failed to derive event→shipment connections:",
            error
          );
        }
      });
    }

    // 5. Client → Proposal: Proposal has clientId
    if (hasClients && hasProposals) {
      queries.push(async () => {
        try {
          const clientIds = idsForType("client");
          const proposalIds = idsForType("proposal");

          const proposals = await database.proposal.findMany({
            where: {
              tenantId,
              id: { in: proposalIds },
              clientId: { in: clientIds },
              deletedAt: null,
            },
            select: { id: true, clientId: true },
          });

          for (const proposal of proposals) {
            if (!proposal.clientId) {
              continue;
            }
            const clientProj = findProj("client", proposal.clientId);
            const proposalProj = findProj("proposal", proposal.id);
            if (clientProj && proposalProj) {
              addConnection(
                clientProj,
                proposalProj,
                "client_to_proposal",
                "proposal"
              );
            }
          }
        } catch (error) {
          console.error(
            "[derive-connections] Failed to derive client→proposal connections:",
            error
          );
        }
      });
    }

    // 6. Risk → Affected Entity: Risk has affectedEntityId and affectedEntityType
    // This creates edges from risk nodes to the entities they threaten
    // Uses conflict data passed to the function to find affected entities
    if (hasRisks && conflicts && conflicts.length > 0) {
      queries.push(async () => {
        try {
          const riskProjections = byType.get("risk") ?? [];

          // Build a map of conflict ID to conflict for quick lookup
          const conflictMap = new Map<string, Conflict>();
          for (const conflict of conflicts) {
            conflictMap.set(conflict.id, conflict);
          }

          // Map conflict entity types to board entity types
          // Conflict uses: "event" | "task" | "employee" | "inventory"
          // Board uses: "event" | "prep_task" | "employee" | "inventory_item"
          const conflictToEntityType: Record<string, string> = {
            event: "event",
            task: "prep_task",
            employee: "employee",
            inventory: "inventory_item",
          };

          for (const riskProj of riskProjections) {
            // Find the matching conflict using the risk's entityId
            const conflict = conflictMap.get(riskProj.entityId);
            if (!conflict) {
              continue;
            }

            // For each affected entity in the conflict, create an edge
            for (const affected of conflict.affectedEntities) {
              const boardEntityType = conflictToEntityType[affected.type];
              if (!boardEntityType) {
                continue;
              }

              // Find the projection for this affected entity on the board
              const affectedProj = findProj(boardEntityType, affected.id);
              if (affectedProj) {
                addConnection(
                  riskProj,
                  affectedProj,
                  "risk_to_entity",
                  `threatens`
                );
              }
            }
          }
        } catch (error) {
          console.error(
            "[derive-connections] Failed to derive risk connections:",
            error
          );
        }
      });
    }

    // 7. Dish → Recipe: Dish has recipeId foreign key
    if (hasDishes && hasRecipes) {
      queries.push(async () => {
        try {
          const dishIds = idsForType("dish");
          const recipeIds = idsForType("recipe");

          const dishes = await database.dish.findMany({
            where: {
              tenantId,
              id: { in: dishIds },
              recipeId: { in: recipeIds },
              deletedAt: null,
            },
            select: { id: true, recipeId: true },
          });

          for (const dish of dishes) {
            if (!dish.recipeId) {
              continue;
            }
            const dishProj = findProj("dish", dish.id);
            const recipeProj = findProj("recipe", dish.recipeId);
            if (dishProj && recipeProj) {
              addConnection(
                dishProj,
                recipeProj,
                "dish_to_recipe",
                "based on"
              );
              // Also add reverse direction: recipe → dish
              addConnection(
                recipeProj,
                dishProj,
                "recipe_to_dish",
                "used in"
              );
            }
          }
        } catch (error) {
          console.error(
            "[derive-connections] Failed to derive dish→recipe connections:",
            error
          );
        }
      });
    }

    // 8. Financial Projection → Events: Financial projection has sourceEventIds
    // Creates edges from financial projections to the events they aggregate
    if (hasFinancialProjections && hasEvents && financialProjections) {
      queries.push(async () => {
        try {
          const financialProjs = byType.get("financial_projection") ?? [];

          // Build a map of financial projection ID to resolved projection data
          const financialDataMap = new Map<string, ResolvedFinancialProjection>();
          for (const fp of financialProjections) {
            financialDataMap.set(fp.id, fp);
          }

          for (const finProj of financialProjs) {
            // Get the financial projection data
            const finData = financialDataMap.get(finProj.entityId);
            if (!finData || !finData.sourceEventIds) {
              continue;
            }

            // For each source event, create a connection to the event on the board
            for (const sourceEventId of finData.sourceEventIds) {
              const eventProj = findProj("event", sourceEventId);
              if (eventProj) {
                addConnection(
                  finProj,
                  eventProj,
                  "financial_to_event",
                  "includes"
                );
              }
            }
          }
        } catch (error) {
          console.error(
            "[derive-connections] Failed to derive financial→event connections:",
            error
          );
        }
      });
    }

    // Run all relationship queries in parallel
    await Promise.all(queries.map((q) => q()));

    return connections;
  } catch (error) {
    console.error("[derive-connections] Failed to derive connections:", error);
    return [];
  }
}
