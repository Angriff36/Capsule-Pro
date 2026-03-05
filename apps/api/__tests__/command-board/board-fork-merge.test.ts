/**
 * Board Fork and Merge Unit Tests
 *
 * Tests for the board simulation/fork and merge functionality.
 */

import { describe, expect, it, vi } from "vitest";

// Mock the boards module since it's a different workspace
const computeBoardDelta = vi.fn();

describe("Board Delta Computation", () => {

describe("Board Delta Computation", () => {
  it("should compute empty delta for identical boards", () => {
    const projections = [
      {
        id: "p1",
        tenantId: "t1",
        boardId: "b1",
        entityType: "event" as const,
        entityId: "e1",
        positionX: 100,
        positionY: 200,
        width: 300,
        height: 400,
        zIndex: 1,
        colorOverride: null,
        collapsed: false,
        groupId: null,
        pinned: false,
      },
    ];

    const input: ComputeDeltaInput = {
      originalProjections: projections,
      simulatedProjections: projections,
      originalGroups: [],
      simulatedGroups: [],
      originalAnnotations: [],
      simulatedAnnotations: [],
    };

    const result = computeBoardDelta(input);

    expect(result.summary.totalChanges).toBe(0);
    expect(result.addedProjections).toHaveLength(0);
    expect(result.removedProjectionIds).toHaveLength(0);
    expect(result.modifiedProjections).toHaveLength(0);
  });

  it("should detect added projections", () => {
    const originalProjections = [
      {
        id: "p1",
        tenantId: "t1",
        boardId: "b1",
        entityType: "event" as const,
        entityId: "e1",
        positionX: 100,
        positionY: 200,
        width: 300,
        height: 400,
        zIndex: 1,
        colorOverride: null,
        collapsed: false,
        groupId: null,
        pinned: false,
      },
    ];

    const simulatedProjections = [
      ...originalProjections,
      {
        id: "p2",
        tenantId: "t1",
        boardId: "b1",
        entityType: "event" as const,
        entityId: "e2",
        positionX: 150,
        positionY: 250,
        width: 300,
        height: 400,
        zIndex: 2,
        colorOverride: null,
        collapsed: false,
        groupId: null,
        pinned: false,
      },
    ];

    const input: ComputeDeltaInput = {
      originalProjections,
      simulatedProjections,
      originalGroups: [],
      simulatedGroups: [],
      originalAnnotations: [],
      simulatedAnnotations: [],
    };

    const result = computeBoardDelta(input);

    expect(result.summary.additions).toBe(1);
    expect(result.addedProjections).toHaveLength(1);
    expect(result.addedProjections[0].entityId).toBe("e2");
  });

  it("should detect removed projections", () => {
    const originalProjections = [
      {
        id: "p1",
        tenantId: "t1",
        boardId: "b1",
        entityType: "event" as const,
        entityId: "e1",
        positionX: 100,
        positionY: 200,
        width: 300,
        height: 400,
        zIndex: 1,
        colorOverride: null,
        collapsed: false,
        groupId: null,
        pinned: false,
      },
      {
        id: "p2",
        tenantId: "t1",
        boardId: "b1",
        entityType: "event" as const,
        entityId: "e2",
        positionX: 150,
        positionY: 250,
        width: 300,
        height: 400,
        zIndex: 2,
        colorOverride: null,
        collapsed: false,
        groupId: null,
        pinned: false,
      },
    ];

    const simulatedProjections = [originalProjections[0]];

    const input: ComputeDeltaInput = {
      originalProjections,
      simulatedProjections,
      originalGroups: [],
      simulatedGroups: [],
      originalAnnotations: [],
      simulatedAnnotations: [],
    };

    const result = computeBoardDelta(input);

    expect(result.summary.removals).toBe(1);
    expect(result.removedProjectionIds).toHaveLength(1);
  });

  it("should detect modified projections", () => {
    const baseProjection = {
      id: "p1",
      tenantId: "t1",
      boardId: "b1",
      entityType: "event" as const,
      entityId: "e1",
      positionX: 100,
      positionY: 200,
      width: 300,
      height: 400,
      zIndex: 1,
      colorOverride: null,
      collapsed: false,
      groupId: null,
      pinned: false,
    };

    const modifiedProjection = {
      ...baseProjection,
      positionX: 150, // Changed
      positionY: 250, // Changed
    };

    const input: ComputeDeltaInput = {
      originalProjections: [baseProjection],
      simulatedProjections: [modifiedProjection],
      originalGroups: [],
      simulatedGroups: [],
      originalAnnotations: [],
      simulatedAnnotations: [],
    };

    const result = computeBoardDelta(input);

    expect(result.summary.modifications).toBeGreaterThan(0);
    expect(result.modifiedProjections.length).toBeGreaterThan(0);

    // Should have modifications for positionX and positionY
    const positionMods = result.modifiedProjections.filter(
      (m) => m.field === "positionX" || m.field === "positionY"
    );
    expect(positionMods.length).toBe(2);
  });

  it("should detect added groups", () => {
    const originalGroups: any[] = [];
    const simulatedGroups = [
      {
        id: "g1",
        tenantId: "t1",
        boardId: "b1",
        name: "Group 1",
        color: "#ff0000",
        collapsed: false,
        positionX: 0,
        positionY: 0,
        width: 200,
        height: 200,
        zIndex: 1,
      },
    ];

    const input: ComputeDeltaInput = {
      originalProjections: [],
      simulatedProjections: [],
      originalGroups,
      simulatedGroups,
      originalAnnotations: [],
      simulatedAnnotations: [],
    };

    const result = computeBoardDelta(input);

    expect(result.addedGroups).toHaveLength(1);
    expect(result.addedGroups[0].name).toBe("Group 1");
  });

  it("should detect removed groups", () => {
    const group = {
      id: "g1",
      tenantId: "t1",
      boardId: "b1",
      name: "Group 1",
      color: "#ff0000",
      collapsed: false,
      positionX: 0,
      positionY: 0,
      width: 200,
      height: 200,
      zIndex: 1,
    };

    const input: ComputeDeltaInput = {
      originalProjections: [],
      simulatedProjections: [],
      originalGroups: [group],
      simulatedGroups: [],
      originalAnnotations: [],
      simulatedAnnotations: [],
    };

    const result = computeBoardDelta(input);

    expect(result.removedGroupIds).toHaveLength(1);
    expect(result.removedGroupIds[0]).toBe("g1");
  });

  it("should compute correct summary totals", () => {
    const projections = [
      {
        id: "p1",
        tenantId: "t1",
        boardId: "b1",
        entityType: "event" as const,
        entityId: "e1",
        positionX: 100,
        positionY: 200,
        width: 300,
        height: 400,
        zIndex: 1,
        colorOverride: null,
        collapsed: false,
        groupId: null,
        pinned: false,
      },
    ];

    const groups = [
      {
        id: "g1",
        tenantId: "t1",
        boardId: "b1",
        name: "Group 1",
        color: "#ff0000",
        collapsed: false,
        positionX: 0,
        positionY: 0,
        width: 200,
        height: 200,
        zIndex: 1,
      },
    ];

    const annotations = [
      {
        id: "a1",
        boardId: "b1",
        annotationType: "connection" as const,
        fromProjectionId: null,
        toProjectionId: null,
        label: "Test",
        color: "#000000",
        style: null,
      },
    ];

    const input: ComputeDeltaInput = {
      originalProjections: [],
      simulatedProjections: projections,
      originalGroups: [],
      simulatedGroups: groups,
      originalAnnotations: [],
      simulatedAnnotations: annotations,
    };

    const result = computeBoardDelta(input);

    expect(result.summary.totalChanges).toBe(3); // 1 projection + 1 group + 1 annotation
    expect(result.summary.additions).toBe(3);
    expect(result.summary.removals).toBe(0);
    expect(result.summary.modifications).toBe(0);
  });
});
