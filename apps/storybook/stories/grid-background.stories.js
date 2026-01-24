Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomColor =
  exports.SmallGrid =
  exports.LargeGrid =
  exports.WithFade =
  exports.Dots =
  exports.Default =
    void 0;
const grid_background_1 = require("@repo/design-system/components/ui/grid-background");
/**
 * A decorative grid background component with configurable grid size and appearance.
 */
const meta = {
  title: "ui/GridBackground",
  component: grid_background_1.GridBackground,
  tags: ["autodocs"],
  argTypes: {
    gridSize: {
      control: { type: "range", min: 8, max: 64, step: 4 },
      description: "The size of each grid cell in pixels",
    },
    gridOpacity: {
      control: { type: "range", min: 0, max: 1, step: 0.1 },
      description: "The opacity of the grid lines (0-1)",
    },
    variant: {
      control: { type: "select" },
      options: ["lines", "dots"],
      description: "The variant of the grid pattern",
    },
    fade: {
      control: { type: "boolean" },
      description: "Whether to show a radial fade effect from center",
    },
  },
  parameters: {
    layout: "fullscreen",
  },
};
exports.default = meta;
/**
 * The default grid background with line pattern.
 */
exports.Default = {
  render: (args) => (
    <div className="h-[400px] w-full">
      <grid_background_1.GridBackground {...args}>
        <div className="flex h-full items-center justify-center">
          <p className="text-muted-foreground">Content goes here</p>
        </div>
      </grid_background_1.GridBackground>
    </div>
  ),
};
/**
 * Grid background with dot pattern variant.
 */
exports.Dots = {
  args: {
    variant: "dots",
  },
  render: (args) => (
    <div className="h-[400px] w-full">
      <grid_background_1.GridBackground {...args}>
        <div className="flex h-full items-center justify-center">
          <p className="text-muted-foreground">Dot pattern</p>
        </div>
      </grid_background_1.GridBackground>
    </div>
  ),
};
/**
 * Grid background with fade effect from center.
 */
exports.WithFade = {
  args: {
    fade: true,
  },
  render: (args) => (
    <div className="h-[400px] w-full">
      <grid_background_1.GridBackground {...args}>
        <div className="flex h-full items-center justify-center">
          <p className="text-muted-foreground">Faded grid</p>
        </div>
      </grid_background_1.GridBackground>
    </div>
  ),
};
/**
 * Large grid cells (48px).
 */
exports.LargeGrid = {
  args: {
    gridSize: 48,
  },
  render: (args) => (
    <div className="h-[400px] w-full">
      <grid_background_1.GridBackground {...args}>
        <div className="flex h-full items-center justify-center">
          <p className="text-muted-foreground">Large grid (48px)</p>
        </div>
      </grid_background_1.GridBackground>
    </div>
  ),
};
/**
 * Small grid cells (12px).
 */
exports.SmallGrid = {
  args: {
    gridSize: 12,
  },
  render: (args) => (
    <div className="h-[400px] w-full">
      <grid_background_1.GridBackground {...args}>
        <div className="flex h-full items-center justify-center">
          <p className="text-muted-foreground">Small grid (12px)</p>
        </div>
      </grid_background_1.GridBackground>
    </div>
  ),
};
/**
 * Custom colored grid.
 */
exports.CustomColor = {
  args: {
    gridColor: "rgb(59, 130, 246)",
    gridOpacity: 0.3,
  },
  render: (args) => (
    <div className="h-[400px] w-full">
      <grid_background_1.GridBackground {...args}>
        <div className="flex h-full items-center justify-center">
          <p className="text-blue-500">Custom blue grid</p>
        </div>
      </grid_background_1.GridBackground>
    </div>
  ),
};
