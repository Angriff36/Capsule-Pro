"use client";

import { BaseEdge, type EdgeProps, getSmoothStepPath } from "@xyflow/react";
import { memo, useCallback, useState } from "react";

/**
 * Custom edge component with hover state and tooltip.
 * Uses smoothstep routing for cleaner paths that avoid overlapping nodes.
 * Thickens on hover and shows relationship label in tooltip.
 */
export const BoardEdge = memo(function BoardEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
}: EdgeProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // Get label from edge data
  const label = data?.label as string | undefined;
  const relationshipType = data?.relationshipType as string | undefined;

  // Calculate the smoothstep path with rounded corners
  // borderRadius creates smooth corners at the step points
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 8,
  });

  // Handle mouse events for hover state
  const handleMouseEnter = useCallback((e: React.MouseEvent) => {
    setIsHovered(true);
    const rect = (e.target as SVGElement).getBoundingClientRect();
    setTooltipPos({
      x: rect.left + rect.width / 2,
      y: rect.top,
    });
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setTooltipPos({
      x: e.clientX,
      y: e.clientY - 20,
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

  // Base stroke width is 1.5, thickens to 3 on hover
  const strokeWidth = isHovered ? 3 : 1.5;
  const strokeColor = (style.stroke as string) ?? "#9ca3af";

  return (
    <>
      {/* Invisible wider path for easier hover detection */}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: SVG path for hover detection only */}
      <path
        className="cursor-pointer"
        d={edgePath}
        fill="none"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onMouseMove={handleMouseMove}
        stroke="transparent"
        strokeWidth={20}
      />

      {/* Visible edge path */}
      <BaseEdge
        id={id}
        interactionWidth={20}
        markerEnd={markerEnd}
        path={edgePath}
        style={{
          ...style,
          strokeWidth,
          stroke: strokeColor,
          transition: "stroke-width 0.15s ease",
        }}
      />

      {/* Tooltip on hover */}
      {isHovered && label && (
        <div
          className="fixed z-50 px-2 py-1 text-xs font-medium text-white bg-gray-800 rounded shadow-lg pointer-events-none"
          style={{
            left: tooltipPos.x,
            top: tooltipPos.y,
            transform: "translate(-50%, -100%)",
          }}
        >
          {label}
          {relationshipType && relationshipType !== label && (
            <span className="ml-1 text-gray-400">({relationshipType})</span>
          )}
        </div>
      )}
    </>
  );
});
