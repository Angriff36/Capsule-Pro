/**
 * Tests for bulk edit guardrails (Task 13)
 *
 * Tests validate that:
 * 1. Invalid field/entity combinations are rejected before write
 * 2. Preview and execute share one validation path
 */

import { describe, expect, it } from "vitest";
import {
  BULK_EDITABLE_PROPERTIES,
  ENTITY_STATUS_OPTIONS,
  PRIORITY_LEVELS,
  validateBulkEditBatch,
  validateBulkEditChanges,
  type BulkEditChanges,
} from "../../app/(authenticated)/command-board/actions/bulk-edit-utils";
import type { EntityType } from "../../app/(authenticated)/command-board/types/entities";

describe("validateBulkEditChanges", () => {
  describe("non-editable entity types", () => {
    it("rejects client entities", () => {
      const result = validateBulkEditChanges("client", "entity-1", {
        status: "active",
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain("cannot be bulk edited");
    });

    it("rejects employee entities", () => {
      const result = validateBulkEditChanges("employee", "entity-1", {
        status: "active",
      });
      expect(result.valid).toBe(false);
    });

    it("rejects inventory_item entities", () => {
      const result = validateBulkEditChanges("inventory_item", "entity-1", {
        status: "in_stock",
      });
      expect(result.valid).toBe(false);
    });

    it("rejects recipe entities", () => {
      const result = validateBulkEditChanges("recipe", "entity-1", {
        status: "active",
      });
      expect(result.valid).toBe(false);
    });

    it("rejects dish entities", () => {
      const result = validateBulkEditChanges("dish", "entity-1", {
        status: "active",
      });
      expect(result.valid).toBe(false);
    });

    it("rejects note entities", () => {
      const result = validateBulkEditChanges("note", "entity-1", {
        status: "active",
      });
      expect(result.valid).toBe(false);
    });

    it("rejects risk entities", () => {
      const result = validateBulkEditChanges("risk", "entity-1", {
        status: "active",
      });
      expect(result.valid).toBe(false);
    });

    it("rejects financial_projection entities", () => {
      const result = validateBulkEditChanges("financial_projection", "entity-1", {
        status: "active",
      });
      expect(result.valid).toBe(false);
    });
  });

  describe("status validation per entity type", () => {
    it("accepts valid status for prep_task", () => {
      for (const status of ENTITY_STATUS_OPTIONS.prep_task) {
        const result = validateBulkEditChanges("prep_task", "entity-1", {
          status,
        });
        expect(result.valid).toBe(true);
        expect(result.normalizedChanges.status).toBe(status);
      }
    });

    it("accepts valid status for kitchen_task", () => {
      for (const status of ENTITY_STATUS_OPTIONS.kitchen_task) {
        const result = validateBulkEditChanges("kitchen_task", "entity-1", {
          status,
        });
        expect(result.valid).toBe(true);
        expect(result.normalizedChanges.status).toBe(status);
      }
    });

    it("accepts valid status for event", () => {
      for (const status of ENTITY_STATUS_OPTIONS.event) {
        const result = validateBulkEditChanges("event", "entity-1", {
          status,
        });
        expect(result.valid).toBe(true);
        expect(result.normalizedChanges.status).toBe(status);
      }
    });

    it("accepts valid status for proposal", () => {
      for (const status of ENTITY_STATUS_OPTIONS.proposal) {
        const result = validateBulkEditChanges("proposal", "entity-1", {
          status,
        });
        expect(result.valid).toBe(true);
        expect(result.normalizedChanges.status).toBe(status);
      }
    });

    it("accepts valid status for shipment", () => {
      for (const status of ENTITY_STATUS_OPTIONS.shipment) {
        const result = validateBulkEditChanges("shipment", "entity-1", {
          status,
        });
        expect(result.valid).toBe(true);
        expect(result.normalizedChanges.status).toBe(status);
      }
    });

    it("rejects invalid status for prep_task", () => {
      const result = validateBulkEditChanges("prep_task", "entity-1", {
        status: "invalid_status",
      });
      expect(result.valid).toBe(false);
      expect(result.errors[0].field).toBe("status");
      expect(result.errors[0].message).toContain("Invalid status");
      expect(result.errors[0].message).toContain("pending, in_progress");
    });

    it("rejects invalid status for event", () => {
      const result = validateBulkEditChanges("event", "entity-1", {
        status: "in_progress", // Valid for tasks, not for events
      });
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain("Invalid status");
    });

    it("rejects status edit for entities that don't support it", () => {
      // client doesn't have status in editable props
      const result = validateBulkEditChanges("client", "entity-1", {
        status: "active",
      });
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain("cannot be bulk edited");
    });
  });

  describe("priority validation", () => {
    it("accepts valid priority for prep_task", () => {
      for (const priority of Object.keys(PRIORITY_LEVELS)) {
        const result = validateBulkEditChanges("prep_task", "entity-1", {
          priority,
        });
        expect(result.valid).toBe(true);
        expect(result.normalizedChanges.priority).toBe(priority);
      }
    });

    it("accepts valid priority for kitchen_task", () => {
      for (const priority of Object.keys(PRIORITY_LEVELS)) {
        const result = validateBulkEditChanges("kitchen_task", "entity-1", {
          priority,
        });
        expect(result.valid).toBe(true);
        expect(result.normalizedChanges.priority).toBe(priority);
      }
    });

    it("rejects invalid priority value", () => {
      const result = validateBulkEditChanges("prep_task", "entity-1", {
        priority: "super_urgent",
      });
      expect(result.valid).toBe(false);
      expect(result.errors[0].field).toBe("priority");
      expect(result.errors[0].message).toContain("Invalid priority");
      expect(result.errors[0].message).toContain("low, medium, high, urgent");
    });

    it("rejects priority for entities that don't support it", () => {
      const result = validateBulkEditChanges("event", "entity-1", {
        priority: "high",
      });
      expect(result.valid).toBe(false);
      expect(result.errors[0].field).toBe("priority");
      expect(result.errors[0].message).toContain(
        "priority cannot be edited for event"
      );
    });

    it("rejects priority for proposal (only status editable)", () => {
      const result = validateBulkEditChanges("proposal", "entity-1", {
        priority: "high",
      });
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain(
        "priority cannot be edited for proposal"
      );
    });
  });

  describe("assignedTo validation", () => {
    it("accepts assignedTo for event", () => {
      const result = validateBulkEditChanges("event", "entity-1", {
        assignedTo: "employee-123",
      });
      expect(result.valid).toBe(true);
      expect(result.normalizedChanges.assignedTo).toBe("employee-123");
    });

    it("accepts null assignedTo for event (unassign)", () => {
      const result = validateBulkEditChanges("event", "entity-1", {
        assignedTo: null,
      });
      expect(result.valid).toBe(true);
      expect(result.normalizedChanges.assignedTo).toBe(null);
    });

    it("rejects assignedTo for entities that don't support it", () => {
      const result = validateBulkEditChanges("prep_task", "entity-1", {
        assignedTo: "employee-123",
      });
      expect(result.valid).toBe(false);
      expect(result.errors[0].field).toBe("assignedTo");
      expect(result.errors[0].message).toContain(
        "assignedTo cannot be edited for prep_task"
      );
    });

    it("rejects assignedTo for kitchen_task", () => {
      const result = validateBulkEditChanges("kitchen_task", "entity-1", {
        assignedTo: "employee-123",
      });
      expect(result.valid).toBe(false);
    });
  });

  describe("multiple changes validation", () => {
    it("accepts valid status + priority for prep_task", () => {
      const result = validateBulkEditChanges("prep_task", "entity-1", {
        status: "completed",
        priority: "high",
      });
      expect(result.valid).toBe(true);
      expect(result.normalizedChanges.status).toBe("completed");
      expect(result.normalizedChanges.priority).toBe("high");
    });

    it("accepts valid status + assignedTo for event", () => {
      const result = validateBulkEditChanges("event", "entity-1", {
        status: "confirmed",
        assignedTo: "employee-123",
      });
      expect(result.valid).toBe(true);
      expect(result.normalizedChanges.status).toBe("confirmed");
      expect(result.normalizedChanges.assignedTo).toBe("employee-123");
    });

    it("returns partial success when some changes are invalid", () => {
      // Event: status valid, priority invalid
      const result = validateBulkEditChanges("event", "entity-1", {
        status: "confirmed",
        priority: "high", // Not editable for events
      });
      expect(result.valid).toBe(false);
      expect(result.normalizedChanges.status).toBe("confirmed");
      expect(result.normalizedChanges.priority).toBeUndefined();
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe("priority");
    });
  });

  describe("empty changes", () => {
    it("returns valid but empty normalizedChanges for empty input", () => {
      const result = validateBulkEditChanges("prep_task", "entity-1", {});
      expect(result.valid).toBe(true);
      expect(Object.keys(result.normalizedChanges)).toHaveLength(0);
    });
  });
});

describe("validateBulkEditBatch", () => {
  it("validates multiple items and returns only valid ones", () => {
    const items = [
      { entityType: "prep_task" as EntityType, entityId: "task-1" },
      { entityType: "client" as EntityType, entityId: "client-1" }, // Invalid
      { entityType: "prep_task" as EntityType, entityId: "task-2" },
    ];
    const changes: BulkEditChanges = { status: "completed" };

    const result = validateBulkEditBatch(items, changes);

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].entityType).toBe("client");
    expect(result.validItems).toHaveLength(2);
    expect(result.validItems.map((i) => i.entityId)).toEqual([
      "task-1",
      "task-2",
    ]);
  });

  it("returns valid=true when all items pass validation", () => {
    const items = [
      { entityType: "prep_task" as EntityType, entityId: "task-1" },
      { entityType: "kitchen_task" as EntityType, entityId: "ktask-1" },
    ];
    const changes: BulkEditChanges = { priority: "high" };

    const result = validateBulkEditBatch(items, changes);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.validItems).toHaveLength(2);
  });

  it("returns valid=false with errors when all items fail", () => {
    const items = [
      { entityType: "client" as EntityType, entityId: "client-1" },
      { entityType: "employee" as EntityType, entityId: "employee-1" },
    ];
    const changes: BulkEditChanges = { status: "active" };

    const result = validateBulkEditBatch(items, changes);

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(2);
    expect(result.validItems).toHaveLength(0);
  });

  it("collects errors for invalid status values across items", () => {
    const items = [
      { entityType: "prep_task" as EntityType, entityId: "task-1" },
      { entityType: "prep_task" as EntityType, entityId: "task-2" },
    ];
    const changes: BulkEditChanges = { status: "invalid_status" };

    const result = validateBulkEditBatch(items, changes);

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(2);
    expect(result.validItems).toHaveLength(0);
  });
});

describe("BULK_EDITABLE_PROPERTIES consistency", () => {
  it("maps all supported entity types correctly", () => {
    expect(BULK_EDITABLE_PROPERTIES.event).toContain("status");
    expect(BULK_EDITABLE_PROPERTIES.event).toContain("assignedTo");
    expect(BULK_EDITABLE_PROPERTIES.prep_task).toContain("status");
    expect(BULK_EDITABLE_PROPERTIES.prep_task).toContain("priority");
    expect(BULK_EDITABLE_PROPERTIES.kitchen_task).toContain("status");
    expect(BULK_EDITABLE_PROPERTIES.kitchen_task).toContain("priority");
    expect(BULK_EDITABLE_PROPERTIES.proposal).toContain("status");
    expect(BULK_EDITABLE_PROPERTIES.shipment).toContain("status");
  });

  it("marks non-editable entity types as empty", () => {
    expect(BULK_EDITABLE_PROPERTIES.client).toEqual([]);
    expect(BULK_EDITABLE_PROPERTIES.employee).toEqual([]);
    expect(BULK_EDITABLE_PROPERTIES.inventory_item).toEqual([]);
    expect(BULK_EDITABLE_PROPERTIES.recipe).toEqual([]);
    expect(BULK_EDITABLE_PROPERTIES.dish).toEqual([]);
    expect(BULK_EDITABLE_PROPERTIES.note).toEqual([]);
    expect(BULK_EDITABLE_PROPERTIES.risk).toEqual([]);
    expect(BULK_EDITABLE_PROPERTIES.financial_projection).toEqual([]);
  });
});

describe("ENTITY_STATUS_OPTIONS validation coverage", () => {
  it("covers all editable entity types with status options", () => {
    // Every entity type with "status" in BULK_EDITABLE_PROPERTIES should have status options
    for (const [entityType, props] of Object.entries(BULK_EDITABLE_PROPERTIES)) {
      if (props.includes("status")) {
        expect(
          ENTITY_STATUS_OPTIONS[entityType],
          `${entityType} should have status options defined`
        ).toBeDefined();
        expect(
          ENTITY_STATUS_OPTIONS[entityType].length,
          `${entityType} should have at least one status option`
        ).toBeGreaterThan(0);
      }
    }
  });
});

describe("PRIORITY_LEVELS validation", () => {
  it("defines all expected priority levels", () => {
    expect(PRIORITY_LEVELS.low).toBe(1);
    expect(PRIORITY_LEVELS.medium).toBe(3);
    expect(PRIORITY_LEVELS.high).toBe(5);
    expect(PRIORITY_LEVELS.urgent).toBe(7);
  });
});
