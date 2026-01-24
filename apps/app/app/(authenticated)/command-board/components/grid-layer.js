"use client";

Object.defineProperty(exports, "__esModule", { value: true });
exports.GridLayer = void 0;
const utils_1 = require("@repo/design-system/lib/utils");
const react_1 = require("react");
exports.GridLayer = (0, react_1.memo)(function GridLayer({
  gridSize,
  showGrid,
  gridColor = "rgba(0, 0, 0, 0.1)",
  className,
}) {
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
      className={(0, utils_1.cn)(
        "pointer-events-none absolute inset-0",
        className
      )}
      role="presentation"
      style={{
        backgroundImage: gridPattern,
        backgroundSize,
        backgroundPosition: "0 0",
      }}
    />
  );
});
