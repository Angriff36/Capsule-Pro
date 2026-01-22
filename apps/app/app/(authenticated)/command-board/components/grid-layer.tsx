"use client";

import { cn } from "@repo/design-system/lib/utils";
import { memo } from "react";

type GridLayerProps = {
  /** Grid size in pixels */
  gridSize: number;
  /** Whether the grid is visible */
  showGrid: boolean;
  /** Grid color */
  gridColor?: string;
  /** Additional CSS classes */
  className?: string;
};

export const GridLayer = memo(function GridLayer({
  gridSize,
  showGrid,
  gridColor = "rgba(0, 0, 0, 0.1)",
  className,
}: GridLayerProps) {
  if (!showGrid) {
    return null;
  }

  const gridPattern = `
    linear-gradient(to right, ${gridColor} 1px, transparent 1px),
    linear-gradient(to bottom, ${gridColor} 1px, transparent 1px)
  `;

  const backgroundSize = `${gridSize}px ${gridSize}px`;

  return (
    <div
      aria-label="Grid background"
      className={cn("pointer-events-none absolute inset-0", className)}
      role="presentation"
      style={{
        backgroundImage: gridPattern,
        backgroundSize,
        backgroundPosition: "0 0",
      }}
    />
  );
});
