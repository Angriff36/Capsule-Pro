import { Progress } from "@repo/design-system/components/ui/progress";
import type { StoryObj } from "@storybook/react";
/**
 * Displays an indicator showing the completion progress of a task, typically
 * displayed as a progress bar.
 */
declare const meta: {
  title: string;
  component: typeof Progress;
  tags: string[];
  argTypes: {};
  args: {
    value: number;
    max: number;
  };
};
export default meta;
type Story = StoryObj<typeof meta>;
/**
 * The default form of the progress.
 */
export declare const Default: Story;
/**
 * When the progress is indeterminate.
 */
export declare const Indeterminate: Story;
/**
 * When the progress is completed.
 */
export declare const Completed: Story;
//# sourceMappingURL=progress.stories.d.ts.map
