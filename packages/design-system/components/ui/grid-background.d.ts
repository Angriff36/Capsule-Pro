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
declare function GridBackground({ className, gridSize, gridColor, gridOpacity, fade, variant, style, children, ...props }: GridBackgroundProps): React.JSX.Element;
export { GridBackground };
export type { GridBackgroundProps };
//# sourceMappingURL=grid-background.d.ts.map