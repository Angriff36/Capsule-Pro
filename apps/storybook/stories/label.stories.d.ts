import { Label } from "@repo/design-system/components/ui/label";
import type { StoryObj } from "@storybook/react";
/**
 * Renders an accessible label associated with controls.
 */
declare const meta: {
  title: string;
  component: typeof Label;
  tags: string[];
  argTypes: {
    children: {
      control: {
        type: "text";
      };
    };
  };
  args: {
    children: string;
    htmlFor: string;
  };
};
export default meta;
type Story = StoryObj<typeof Label>;
/**
 * The default form of the label.
 */
export declare const Default: Story;
//# sourceMappingURL=label.stories.d.ts.map
