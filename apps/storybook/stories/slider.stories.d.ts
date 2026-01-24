import { Slider } from "@repo/design-system/components/ui/slider";
import type { StoryObj } from "@storybook/react";
/**
 * An input where the user selects a value from within a given range.
 */
declare const meta: {
  title: string;
  component: typeof Slider;
  tags: string[];
  argTypes: {};
  args: {
    defaultValue: number[];
    max: number;
    step: number;
  };
};
export default meta;
type Story = StoryObj<typeof meta>;
/**
 * The default form of the slider.
 */
export declare const Default: Story;
/**
 * Use the `inverted` prop to have the slider fill from right to left.
 */
export declare const Inverted: Story;
/**
 * Use the `disabled` prop to disable the slider.
 */
export declare const Disabled: Story;
//# sourceMappingURL=slider.stories.d.ts.map
