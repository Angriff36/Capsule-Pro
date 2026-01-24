import { Badge } from "@repo/design-system/components/ui/badge";
import type { StoryObj } from "@storybook/react";
/**
 * Displays a badge or a component that looks like a badge.
 */
declare const meta: {
  title: string;
  component: typeof Badge;
  tags: string[];
  argTypes: {
    children: {
      control: "text";
    };
  };
  args: {
    children: string;
  };
  parameters: {
    layout: string;
  };
};
export default meta;
type Story = StoryObj<typeof meta>;
/**
 * The default form of the badge.
 */
export declare const Default: Story;
/**
 * Use the `secondary` badge to call for less urgent information, blending
 * into the interface while still signaling minor updates or statuses.
 */
export declare const Secondary: Story;
/**
 * Use the `destructive` badge to  indicate errors, alerts, or the need for
 * immediate attention.
 */
export declare const Destructive: Story;
/**
 * Use the `outline` badge for overlaying without obscuring interface details,
 * emphasizing clarity and subtlety..
 */
export declare const Outline: Story;
//# sourceMappingURL=badge.stories.d.ts.map
