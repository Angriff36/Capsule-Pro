import { cn } from "@repo/design-system/lib/utils";
import * as React from "react";

interface GridBackgroundProps extends React.ComponentProps<"div"> {
  /**
   * The size of each grid cell in pixels
   * @default 24
   */
  gridSize?: number;
  /**
   * The color of the grid lines
   * @default "var(--border)"
   */
  gridColor?: string;
  /**
   * The opacity of the grid lines (0-1)
   * @default 0.5
   */
  gridOpacity?: number;
  /**
   * Whether to show a radial fade effect from center
   * @default false
   */
  fade?: boolean;
  /**
   * The variant of the grid pattern
   * @default "lines"
   */
  variant?: "lines" | "dots";
}

function GridBackground({
  className,
  gridSize = 24,
  gridColor = "var(--border)",
  gridOpacity = 0.5,
  fade = false,
  variant = "lines",
  style,
  children,
  ...props
}: GridBackgroundProps) {
  const backgroundImage = React.useMemo(() => {
    if (variant === "dots") {
      return `radial-gradient(circle, ${gridColor} 1px, transparent 1px)`;
    }
    return `linear-gradient(${gridColor} 1px, transparent 1px), linear-gradient(to right, ${gridColor} 1px, transparent 1px)`;
  }, [variant, gridColor]);

  const backgroundSize = React.useMemo(() => {
    if (variant === "dots") {
      return `${gridSize}px ${gridSize}px`;
    }
    return `${gridSize}px ${gridSize}px`;
  }, [variant, gridSize]);

  return (
    <div
      className={cn("relative size-full", className)}
      data-slot="grid-background"
      {...props}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage,
          backgroundSize,
          opacity: gridOpacity,
          maskImage: fade
            ? "radial-gradient(ellipse at center, black 0%, transparent 70%)"
            : undefined,
          WebkitMaskImage: fade
            ? "radial-gradient(ellipse at center, black 0%, transparent 70%)"
            : undefined,
          ...style,
        }}
      />
      {children && <div className="relative z-10 size-full">{children}</div>}
    </div>
  );
}

export { GridBackground };
export type { GridBackgroundProps };
