import { GridBackground } from "@repo/design-system/components/ui/grid-background";
import type { Meta, StoryObj } from "@storybook/react";

/**
 * A decorative grid background component with configurable grid size and appearance.
 */
const meta = {
  title: "ui/GridBackground",
  component: GridBackground,
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
} satisfies Meta<typeof GridBackground>;

export default meta;

type Story = StoryObj<typeof GridBackground>;

/**
 * The default grid background with line pattern.
 */
export const Default: Story = {
  render: (args) => (
    <div className="h-[400px] w-full">
      <GridBackground {...args}>
        <div className="flex h-full items-center justify-center">
          <p className="text-muted-foreground">Content goes here</p>
        </div>
      </GridBackground>
    </div>
  ),
};

/**
 * Grid background with dot pattern variant.
 */
export const Dots: Story = {
  args: {
    variant: "dots",
  },
  render: (args) => (
    <div className="h-[400px] w-full">
      <GridBackground {...args}>
        <div className="flex h-full items-center justify-center">
          <p className="text-muted-foreground">Dot pattern</p>
        </div>
      </GridBackground>
    </div>
  ),
};

/**
 * Grid background with fade effect from center.
 */
export const WithFade: Story = {
  args: {
    fade: true,
  },
  render: (args) => (
    <div className="h-[400px] w-full">
      <GridBackground {...args}>
        <div className="flex h-full items-center justify-center">
          <p className="text-muted-foreground">Faded grid</p>
        </div>
      </GridBackground>
    </div>
  ),
};

/**
 * Large grid cells (48px).
 */
export const LargeGrid: Story = {
  args: {
    gridSize: 48,
  },
  render: (args) => (
    <div className="h-[400px] w-full">
      <GridBackground {...args}>
        <div className="flex h-full items-center justify-center">
          <p className="text-muted-foreground">Large grid (48px)</p>
        </div>
      </GridBackground>
    </div>
  ),
};

/**
 * Small grid cells (12px).
 */
export const SmallGrid: Story = {
  args: {
    gridSize: 12,
  },
  render: (args) => (
    <div className="h-[400px] w-full">
      <GridBackground {...args}>
        <div className="flex h-full items-center justify-center">
          <p className="text-muted-foreground">Small grid (12px)</p>
        </div>
      </GridBackground>
    </div>
  ),
};

/**
 * Custom colored grid.
 */
export const CustomColor: Story = {
  args: {
    gridColor: "rgb(59, 130, 246)",
    gridOpacity: 0.3,
  },
  render: (args) => (
    <div className="h-[400px] w-full">
      <GridBackground {...args}>
        <div className="flex h-full items-center justify-center">
          <p className="text-blue-500">Custom blue grid</p>
        </div>
      </GridBackground>
    </div>
  ),
};
