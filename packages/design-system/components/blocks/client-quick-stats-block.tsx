import type * as React from "react";

import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

/**
 * A single stat item configuration
 */
export interface ClientStatItem {
  /** Optional icon component to display */
  icon?: React.ComponentType<{ className?: string }>;
  /** The label for the stat (e.g., "Total Events") */
  label: string;
  /** The value to display (e.g., "42", "$1,234") */
  value: string | number;
}

/**
 * ClientQuickStatsBlock - A standardized block for displaying client quick stats
 *
 * This component displays a grid of stat cards with consistent styling.
 * Each card shows a label and value, with optional icon support.
 *
 * @example
 * ```tsx
 * <ClientQuickStatsBlock
 *   stats={[
 *     { label: "Total Events", value: 42 },
 *     { label: "Total Revenue", value: "$12,345" },
 *   ]}
 * />
 * ```
 */
export function ClientQuickStatsBlock({
  stats,
  className,
}: {
  /** Array of stat items to display */
  stats: ClientStatItem[];
  /** Optional className for the grid container */
  className?: string;
}) {
  return (
    <div className={`grid grid-cols-1 gap-4 md:grid-cols-4 ${className || ""}`}>
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="font-medium text-muted-foreground text-sm">
                {stat.label}
              </CardTitle>
              {Icon && <Icon className="size-4 text-muted-foreground" />}
            </CardHeader>
            <CardContent>
              <div className="font-bold text-2xl">
                {typeof stat.value === "number"
                  ? stat.value.toLocaleString()
                  : stat.value}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
