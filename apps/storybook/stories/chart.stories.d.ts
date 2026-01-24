import { ChartContainer } from "@repo/design-system/components/ui/chart";
import type { StoryObj } from "@storybook/react";
/**
 * Beautiful charts. Built using Recharts. Copy and paste into your apps.
 */
declare const meta: {
  title: string;
  component: typeof ChartContainer;
  tags: string[];
  argTypes: {};
  args: {
    children: import("react").JSX.Element;
  };
};
export default meta;
type Story = StoryObj<typeof meta>;
/**
 * Combine multiple Area components to create a stacked area chart.
 */
export declare const StackedAreaChart: Story;
/**
 * Combine multiple Bar components to create a stacked bar chart.
 */
export declare const StackedBarChart: Story;
/**
 * Combine multiple Line components to create a single line chart.
 */
export declare const MultiLineChart: Story;
/**
 * Combine Pie and Label components to create a doughnut chart.
 */
export declare const DoughnutChart: Story;
//# sourceMappingURL=chart.stories.d.ts.map
