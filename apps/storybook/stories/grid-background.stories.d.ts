import { GridBackground } from "@repo/design-system/components/ui/grid-background";
import type { StoryObj } from "@storybook/react";
/**
 * A decorative grid background component with configurable grid size and appearance.
 */
declare const meta: {
  title: string;
  component: typeof GridBackground;
  tags: string[];
  argTypes: {
    gridSize: {
      control: {
        type: "range";
        min: number;
        max: number;
        step: number;
      };
      description: string;
    };
    gridOpacity: {
      control: {
        type: "range";
        min: number;
        max: number;
        step: number;
      };
      description: string;
    };
    variant: {
      control: {
        type: "select";
      };
      options: string[];
      description: string;
    };
    fade: {
      control: {
        type: "boolean";
      };
      description: string;
    };
  };
  parameters: {
    layout: string;
  };
};
export default meta;
type Story = StoryObj<typeof GridBackground>;
/**
 * The default grid background with line pattern.
 */
export declare const Default: Story;
/**
 * Grid background with dot pattern variant.
 */
export declare const Dots: Story;
/**
 * Grid background with fade effect from center.
 */
export declare const WithFade: Story;
/**
 * Large grid cells (48px).
 */
export declare const LargeGrid: Story;
/**
 * Small grid cells (12px).
 */
export declare const SmallGrid: Story;
/**
 * Custom colored grid.
 */
export declare const CustomColor: Story;
//# sourceMappingURL=grid-background.stories.d.ts.map
