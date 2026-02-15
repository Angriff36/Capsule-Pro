"use client";

import { cn } from "@repo/design-system/lib/utils";
import { memo } from "react";
import type { Point } from "../types";
import { calculateCurvePath } from "../types";

interface TemporaryConnectionLineProps {
  /** Starting point of the connection (canvas coordinates) */
  startPoint: Point;
  /** Current end point (mouse position in canvas coordinates) */
  endPoint: Point;
  /** Whether this connection is valid (can be dropped) */
  isValid: boolean;
  /** Viewport zoom level for scaling stroke width */
  viewportZoom: number;
}

/**
 * Temporary connection line shown during drag operation
 *
 * Renders a dashed line from the source anchor point
 * to the current cursor position while dragging.
 */
export const TemporaryConnectionLine = memo(function TemporaryConnectionLine({
  startPoint,
  endPoint,
  isValid,
  viewportZoom,
}: TemporaryConnectionLineProps) {
  // Calculate SVG path
  const pathData = calculateCurvePath(startPoint, endPoint, 0.3);

  // Stroke width scales inversely with zoom to maintain consistent appearance
  const strokeWidth = Math.max(1.5, 3 / viewportZoom);

  return (
    <g
      className={cn(
        "transition-colors duration-150",
        // Valid connection - green color
        isValid ? "stroke-green-500" : "stroke-red-500"
      )}
      style={{
        stroke: isValid ? "#22c55e" : "#ef4444",
        strokeWidth,
        opacity: 0.8,
      }}
    >
      {/* Main connection line */}
      <path
        className="pointer-events-none"
        d={pathData}
        fill="none"
        stroke="currentColor"
        strokeDasharray="8,4"
        strokeLinecap="round"
        strokeWidth={strokeWidth}
      />

      {/* Start point indicator */}
      <circle
        className="pointer-events-none"
        cx={startPoint.x}
        cy={startPoint.y}
        fill="currentColor"
        r={Math.max(4, 6 / viewportZoom)}
      />

      {/* End point indicator (follows cursor) */}
      <circle
        className="pointer-events-none"
        cx={endPoint.x}
        cy={endPoint.y}
        fill={isValid ? "#22c55e" : "#ef4444"}
        opacity={0.6}
        r={Math.max(5, 8 / viewportZoom)}
      />
    </g>
  );
});
