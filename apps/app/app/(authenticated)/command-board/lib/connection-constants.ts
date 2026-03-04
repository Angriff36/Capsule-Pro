/** Available connection styles for manual connections */
export const CONNECTION_STYLES = [
  { value: "solid", label: "Solid", description: "Standard solid line" },
  { value: "dashed", label: "Dashed", description: "Dashed line pattern" },
  { value: "dotted", label: "Dotted", description: "Dotted line pattern" },
] as const;

/** Default colors for manual connections */
export const CONNECTION_COLORS = [
  { value: "#9ca3af", label: "Gray", description: "Neutral gray" },
  { value: "#3b82f6", label: "Blue", description: "Primary blue" },
  { value: "#22c55e", label: "Green", description: "Success green" },
  { value: "#f59e0b", label: "Amber", description: "Warning amber" },
  { value: "#ef4444", label: "Red", description: "Error red" },
  { value: "#8b5cf6", label: "Purple", description: "Accent purple" },
  { value: "#ec4899", label: "Pink", description: "Accent pink" },
] as const;
