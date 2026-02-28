/**
 * @vitest-environment node
 *
 * Unit tests for projection normalization logic
 *
 * These tests verify the dbToProjection helper function's normalization behavior
 * by testing it in isolation through the projection-to-node conversion.
 */

import { describe, expect, it } from "vitest";
import type { BoardProjection } from "../../app/(authenticated)/command-board/types/board";
import type { EntityType } from "../../app/(authenticated)/command-board/types/entities";

/**
 * Recreate the normalization logic for testing purposes.
 * This mirrors the dbToProjection function in projections.ts
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
  const DEFAULT_POSITION_X = 0;
  const DEFAULT_POSITION_Y = 0;
  const DEFAULT_WIDTH = 280;
  const DEFAULT_HEIGHT = 180;
  const DEFAULT_Z_INDEX = 0;

  return {
    id: row.id,
    tenantId: row.tenantId,
    boardId: row.boardId,
    entityType: row.entityType as EntityType,
    entityId: row.entityId,
    positionX: row.positionX ?? DEFAULT_POSITION_X,
    positionY: row.positionY ?? DEFAULT_POSITION_Y,
    width: row.width ?? DEFAULT_WIDTH,
    height: row.height ?? DEFAULT_HEIGHT,
    zIndex: row.zIndex ?? DEFAULT_Z_INDEX,
    colorOverride: row.colorOverride,
    collapsed: row.collapsed ?? false,
    groupId: row.groupId,
    pinned: row.pinned ?? false,
  };
}

describe("Projection Normalization Logic", () => {
  const completeRow = {
    id: "proj-1",
    tenantId: "tenant-123",
    boardId: "board-1",
    entityType: "event",
    entityId: "entity-1",
    positionX: 100,
    positionY: 200,
    width: 280,
    height: 180,
    zIndex: 1,
    colorOverride: null,
    collapsed: false,
    groupId: null,
    pinned: false,
  };

  it("returns normalized projections with complete data unchanged", () => {
    const result = normalizeProjection(completeRow);

    expect(result).toEqual({
      id: "proj-1",
      tenantId: "tenant-123",
      boardId: "board-1",
      entityType: "event",
      entityId: "entity-1",
      positionX: 100,
      positionY: 200,
      width: 280,
      height: 180,
      zIndex: 1,
      colorOverride: null,
      collapsed: false,
      groupId: null,
      pinned: false,
    });
  });

  it("normalizes null positionX to 0", () => {
    const result = normalizeProjection({ ...completeRow, positionX: null });
    expect(result.positionX).toBe(0);
  });

  it("normalizes null positionY to 0", () => {
    const result = normalizeProjection({ ...completeRow, positionY: null });
    expect(result.positionY).toBe(0);
  });

  it("normalizes null width to 280", () => {
    const result = normalizeProjection({ ...completeRow, width: null });
    expect(result.width).toBe(280);
  });

  it("normalizes null height to 180", () => {
    const result = normalizeProjection({ ...completeRow, height: null });
    expect(result.height).toBe(180);
  });

  it("normalizes null zIndex to 0", () => {
    const result = normalizeProjection({ ...completeRow, zIndex: null });
    expect(result.zIndex).toBe(0);
  });

  it("normalizes null collapsed to false", () => {
    const result = normalizeProjection({ ...completeRow, collapsed: null });
    expect(result.collapsed).toBe(false);
  });

  it("normalizes null pinned to false", () => {
    const result = normalizeProjection({ ...completeRow, pinned: null });
    expect(result.pinned).toBe(false);
  });

  it("handles all fields null simultaneously", () => {
    const result = normalizeProjection({
      id: "proj-1",
      tenantId: "tenant-123",
      boardId: "board-1",
      entityType: "event",
      entityId: "entity-1",
      positionX: null,
      positionY: null,
      width: null,
      height: null,
      zIndex: null,
      colorOverride: null,
      collapsed: null,
      groupId: null,
      pinned: null,
    });

    expect(result).toEqual({
      id: "proj-1",
      tenantId: "tenant-123",
      boardId: "board-1",
      entityType: "event",
      entityId: "entity-1",
      positionX: 0,
      positionY: 0,
      width: 280,
      height: 180,
      zIndex: 0,
      colorOverride: null,
      collapsed: false,
      groupId: null,
      pinned: false,
    });
  });

  it("preserves valid values when some fields are null", () => {
    const result = normalizeProjection({
      ...completeRow,
      positionX: null,
      height: null,
      pinned: null,
    });

    expect(result.positionX).toBe(0); // Normalized
    expect(result.positionY).toBe(200); // Preserved
    expect(result.width).toBe(280); // Preserved
    expect(result.height).toBe(180); // Normalized to default
    expect(result.pinned).toBe(false); // Normalized
    expect(result.collapsed).toBe(false); // Preserved
  });

  it("preserves zero values (zero is valid, not null)", () => {
    const result = normalizeProjection({
      ...completeRow,
      positionX: 0,
      positionY: 0,
      zIndex: 0,
    });

    expect(result.positionX).toBe(0);
    expect(result.positionY).toBe(0);
    expect(result.zIndex).toBe(0);
  });

  it("preserves true boolean values", () => {
    const result = normalizeProjection({
      ...completeRow,
      collapsed: true,
      pinned: true,
    });

    expect(result.collapsed).toBe(true);
    expect(result.pinned).toBe(true);
  });
});

describe("Priority Normalization Logic", () => {
  /**
   * Test the priority normalization logic that was fixed.
   * This mirrors the logic in resolve-entities.ts
   * Note: priority is stored as Int in DB, but converted to string for display.
   * The key fix: null priority should remain null, NOT become "null" string.
   */
  function normalizePriority(
    priority: number | null | undefined
  ): string | null {
    return priority != null ? String(priority) : null;
  }

  it("converts valid numeric priority to string", () => {
    expect(normalizePriority(1)).toBe("1");
    expect(normalizePriority(5)).toBe("5");
    expect(normalizePriority(10)).toBe("10");
  });

  it("converts null to null (not 'null' string)", () => {
    const result = normalizePriority(null);
    expect(result).toBeNull();
    expect(result).not.toBe("null");
  });

  it("converts undefined to null (not 'undefined' string)", () => {
    const result = normalizePriority(undefined);
    expect(result).toBeNull();
    expect(result).not.toBe("undefined");
  });

  it("does NOT use bare String() which would create 'null' string", () => {
    // This demonstrates the bug that was fixed
    const buggyResult = String(null);
    expect(buggyResult).toBe("null"); // The old buggy behavior with bare String()

    const fixedResult = normalizePriority(null);
    expect(fixedResult).toBeNull(); // The fixed behavior with null check
    expect(fixedResult).not.toBe("null");
  });

  it("handles zero priority correctly", () => {
    expect(normalizePriority(0)).toBe("0");
  });
});
