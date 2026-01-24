import { ScrollArea } from "@repo/design-system/components/ui/scroll-area";
import type { StoryObj } from "@storybook/react";
/**
 * Augments native scroll functionality for custom, cross-browser styling.
 */
declare const meta: {
  title: string;
  component: typeof ScrollArea;
  tags: string[];
  argTypes: {
    children: {
      control: "text";
    };
  };
  args: {
    className: string;
    type: "auto";
    children: string;
  };
  parameters: {
    layout: string;
  };
};
export default meta;
type Story = StoryObj<typeof meta>;
/**
 * The default form of the scroll area.
 */
export declare const Default: Story;
/**
 * Use the `type` prop with `always` to always show the scroll area.
 */
export declare const Always: Story;
/**
 * Use the `type` prop with `hover` to show the scroll area on hover.
 */
export declare const Hover: Story;
/**
 * Use the `type` prop with `scroll` to show the scroll area when scrolling.
 */
export declare const Scroll: Story;
//# sourceMappingURL=scroll-area.stories.d.ts.map
