import { Calendar } from "@repo/design-system/components/ui/calendar";
import type { StoryObj } from "@storybook/react";
/**
 * A date field component that allows users to enter and edit date.
 */
declare const meta: {
  title: string;
  component: typeof Calendar;
  tags: string[];
  argTypes: {};
  args: {
    mode: "single";
    selected: Date;
    onSelect: import("storybook/actions", { with: {
      "resolution-mode": "import",
    }}).HandlerFunction;
    className: string;
  };
  parameters: {
    layout: string;
  };
};
export default meta;
type Story = StoryObj<typeof meta>;
/**
 * The default form of the calendar.
 */
export declare const Default: Story;
/**
 * Use the `multiple` mode to select multiple dates.
 */
export declare const Multiple: Story;
/**
 * Use the `range` mode to select a range of dates.
 */
export declare const Range: Story;
/**
 * Use the `disabled` prop to disable specific dates.
 */
export declare const Disabled: Story;
/**
 * Use the `numberOfMonths` prop to display multiple months.
 */
export declare const MultipleMonths: Story;
//# sourceMappingURL=calendar.stories.d.ts.map
